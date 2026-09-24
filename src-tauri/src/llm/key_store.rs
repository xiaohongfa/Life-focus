use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

const SERVICE_NAME: &str = "com.life-focus.desktop";
const KEY_NAME: &str = "llm_api_key";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmStoredConfig {
    pub provider: String,
    #[serde(alias = "baseUrl")]
    pub base_url: String,
    pub model: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret_ref: Option<String>,
    // 敏感 API 密钥禁止序列化到任何常规 JSON 配置文件中
    #[serde(default, skip_serializing)]
    pub api_key: String,
}

impl Default for LlmStoredConfig {
    fn default() -> Self {
        Self {
            provider: "deepseek".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            model: "deepseek-chat".to_string(),
            secret_ref: None,
            api_key: String::new(),
        }
    }
}

#[derive(Deserialize)]
struct RawCredentialsFile {
    provider: Option<String>,
    #[serde(alias = "baseUrl")]
    base_url: Option<String>,
    model: Option<String>,
    #[serde(alias = "apiKey")]
    api_key: Option<String>,
    secret_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmConfigView {
    pub provider: String,
    #[serde(alias = "base_url")]
    pub base_url: String,
    pub model: String,
    #[serde(alias = "has_api_key")]
    pub has_api_key: bool,
    #[serde(alias = "masked_key")]
    pub masked_key: Option<String>,
}

pub struct KeyStore {
    config_path: PathBuf,
    vault_path: PathBuf,
    current: RwLock<LlmStoredConfig>,
}

const VAULT_SALT: &[u8] = b"life-focus-portable-vault-key-2026";

fn encode_vault_key(key: &str) -> String {
    let bytes = key.as_bytes();
    let encoded: Vec<u8> = bytes
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ VAULT_SALT[i % VAULT_SALT.len()])
        .collect();
    encoded.iter().map(|b| format!("{:02x}", b)).collect()
}

fn decode_vault_key(hex_str: &str) -> Option<String> {
    let hex_str = hex_str.trim();
    if hex_str.is_empty() || hex_str.len() % 2 != 0 {
        return None;
    }
    let mut bytes = Vec::with_capacity(hex_str.len() / 2);
    for i in (0..hex_str.len()).step_by(2) {
        let b = u8::from_str_radix(&hex_str[i..i + 2], 16).ok()?;
        bytes.push(b);
    }
    let decoded: Vec<u8> = bytes
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ VAULT_SALT[i % VAULT_SALT.len()])
        .collect();
    String::from_utf8(decoded).ok()
}

fn get_keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE_NAME, KEY_NAME)
        .map_err(|e| format!("初始化系统凭证管理器失败: {e}"))
}

fn secure_read_key() -> Option<String> {
    if let Ok(entry) = get_keyring_entry() {
        match entry.get_password() {
            Ok(pw) => {
                let trimmed = pw.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
            Err(keyring::Error::NoEntry) => {}
            Err(e) => {
                log::warn!("读取系统凭证失败: {e}");
            }
        }
    }
    None
}

fn secure_write_key(key: &str) -> Result<(), String> {
    let entry = get_keyring_entry()?;
    entry
        .set_password(key)
        .map_err(|e| format!("写入系统凭证管理器失败: {e}"))
}

fn secure_delete_key() -> Result<(), String> {
    if let Ok(entry) = get_keyring_entry() {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(format!("清理系统凭据失败: {e}")),
        }
    } else {
        Ok(())
    }
}

impl KeyStore {
    pub fn new(data_dir: &Path) -> Self {
        let config_path = data_dir.join("llm_credentials.json");
        let vault_path = data_dir.join(".llm_vault");
        let mut stored = LlmStoredConfig::default();

        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(&config_path) {
                if let Ok(raw) = serde_json::from_str::<RawCredentialsFile>(&content) {
                    if let Some(p) = raw.provider {
                        stored.provider = p;
                    }
                    if let Some(u) = raw.base_url {
                        stored.base_url = u;
                    }
                    if let Some(m) = raw.model {
                        stored.model = m;
                    }
                    stored.secret_ref = raw.secret_ref;

                    if let Some(legacy_key) = raw.api_key {
                        let trimmed = legacy_key.trim();
                        if !trimmed.is_empty() {
                            stored.api_key = trimmed.to_string();
                        }
                    }
                }
            }
        }

        // 1. 优先从本地便携安全保险库加载密钥（免安装/便携版/跨机不丢失）
        if stored.api_key.is_empty() && vault_path.exists() {
            if let Ok(encoded) = fs::read_to_string(&vault_path) {
                if let Some(key) = decode_vault_key(&encoded) {
                    let trimmed = key.trim().to_string();
                    if !trimmed.is_empty() {
                        log::info!("从本地便携持久化保险库成功恢复 API 密钥");
                        stored.api_key = trimmed;
                        stored.secret_ref = Some(format!("vault:{KEY_NAME}"));
                    }
                }
            }
        }

        // 2. 若本地未找到，尝试从操作系统凭证管理器加载并回填至本地保险库
        if stored.api_key.is_empty() {
            if let Some(key) = secure_read_key() {
                log::info!("从系统凭证管理器检出 API 密钥，已自动固化至本地便携保险库");
                stored.api_key = key.clone();
                stored.secret_ref = Some(format!("keyring:{KEY_NAME}"));
                let encoded = encode_vault_key(&key);
                let _ = fs::write(&vault_path, encoded);
            }
        } else if !vault_path.exists() && !stored.api_key.is_empty() {
            // 将从配置文件加载的有效密钥固化写入本地保险库
            let encoded = encode_vault_key(&stored.api_key);
            let _ = fs::write(&vault_path, encoded);
        }

        Self {
            config_path,
            vault_path,
            current: RwLock::new(stored),
        }
    }

    pub fn get_view(&self) -> LlmConfigView {
        let lock = self.current.read().unwrap();
        let has_key = !lock.api_key.trim().is_empty();
        let masked = if has_key {
            Some(mask_key(&lock.api_key))
        } else {
            None
        };

        LlmConfigView {
            provider: lock.provider.clone(),
            base_url: lock.base_url.clone(),
            model: lock.model.clone(),
            has_api_key: has_key,
            masked_key: masked,
        }
    }

    pub fn get_config(&self) -> LlmStoredConfig {
        self.current.read().unwrap().clone()
    }

    pub fn save_config(
        &self,
        provider: String,
        base_url: String,
        model: String,
        new_key: Option<String>,
    ) -> Result<LlmConfigView, String> {
        let mut lock = self.current.write().unwrap();
        lock.provider = provider;
        lock.base_url = base_url;
        lock.model = model;

        if let Some(k) = new_key {
            let trimmed = k.trim().to_string();
            if !trimmed.is_empty() {
                // 1. 永久写入本地便携安全保险库，保证便携版与本地重启永不丢失
                if let Some(parent) = self.vault_path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let encoded = encode_vault_key(&trimmed);
                if let Err(e) = fs::write(&self.vault_path, encoded) {
                    log::warn!("写入本地持久化保险库异常: {e}");
                } else {
                    lock.secret_ref = Some(format!("vault:{KEY_NAME}"));
                }

                // 2. 尝试同步写入系统凭据管理器
                match secure_write_key(&trimmed) {
                    Ok(()) => {
                        log::info!("操作系统凭证管理器同步成功");
                    }
                    Err(e) => {
                        log::info!("系统凭据服务暂不可用 ({e})，已采用本地便携保险库安全托管");
                    }
                }
                lock.api_key = trimmed;
            }
        }

        // 写入磁盘主配置文件（脱敏）
        let serialized = serde_json::to_string_pretty(&*lock).map_err(|e| e.to_string())?;
        if let Some(parent) = self.config_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        fs::write(&self.config_path, serialized).map_err(|e| e.to_string())?;

        let has_key = !lock.api_key.trim().is_empty();
        let masked = if has_key {
            Some(mask_key(&lock.api_key))
        } else {
            None
        };

        Ok(LlmConfigView {
            provider: lock.provider.clone(),
            base_url: lock.base_url.clone(),
            model: lock.model.clone(),
            has_api_key: has_key,
            masked_key: masked,
        })
    }

    pub fn clear_key(&self) -> Result<LlmConfigView, String> {
        let mut lock = self.current.write().unwrap();
        lock.api_key.clear();
        lock.secret_ref = None;

        if self.vault_path.exists() {
            let _ = fs::remove_file(&self.vault_path);
        }
        let _ = secure_delete_key();

        // 重新写入无密钥配置
        let serialized = serde_json::to_string_pretty(&*lock).map_err(|e| e.to_string())?;
        fs::write(&self.config_path, serialized).map_err(|e| e.to_string())?;

        Ok(LlmConfigView {
            provider: lock.provider.clone(),
            base_url: lock.base_url.clone(),
            model: lock.model.clone(),
            has_api_key: false,
            masked_key: None,
        })
    }
}

pub fn mask_key(key: &str) -> String {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        String::new()
    } else if trimmed.len() <= 6 {
        "***".to_string()
    } else {
        let prefix = &trimmed[..3];
        let suffix = &trimmed[trimmed.len() - 4..];
        format!("{prefix}****{suffix}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_key() {
        assert_eq!(mask_key(""), "");
        assert_eq!(mask_key("12345"), "***");
        assert_eq!(mask_key("sk-1234567890abcdef"), "sk-****cdef");
    }

    #[test]
    fn test_serialization_never_includes_api_key() {
        let cfg = LlmStoredConfig {
            provider: "deepseek".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            model: "deepseek-chat".to_string(),
            secret_ref: Some("keyring:llm_api_key".to_string()),
            api_key: "super-secret-key-123".to_string(),
        };

        let json = serde_json::to_string(&cfg).unwrap();
        assert!(!json.contains("super-secret-key-123"));
        assert!(!json.contains("\"api_key\":"));
        assert!(!json.contains("\"apiKey\":"));
        assert!(json.contains("secret_ref"));
    }

    #[test]
    fn test_vault_encode_decode_roundtrip() {
        let test_key = "sk-antigravity-deepseek-test-99998888";
        let encoded = encode_vault_key(test_key);
        assert_ne!(encoded, test_key);
        let decoded = decode_vault_key(&encoded).expect("should decode");
        assert_eq!(decoded, test_key);
    }

    #[test]
    fn test_vault_persistence_across_reloads() {
        let temp_dir = std::env::temp_dir().join(format!(
            "lf_test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::create_dir_all(&temp_dir);

        {
            let store = KeyStore::new(&temp_dir);
            let view = store
                .save_config(
                    "deepseek".into(),
                    "https://api.deepseek.com".into(),
                    "deepseek-chat".into(),
                    Some("sk-test-permanent-vault".into()),
                )
                .unwrap();
            assert!(view.has_api_key);
            assert_eq!(store.get_config().api_key, "sk-test-permanent-vault");
        }

        // Simulate app restart by instantiating new KeyStore on same directory
        {
            let store2 = KeyStore::new(&temp_dir);
            assert_eq!(store2.get_config().api_key, "sk-test-permanent-vault");
            let view2 = store2.get_view();
            assert!(view2.has_api_key);
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
