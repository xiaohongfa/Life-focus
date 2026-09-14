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
    current: RwLock<LlmStoredConfig>,
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

                    // 历史明文迁移：若旧文件中存在明文 api_key，平滑迁入 OS Keyring 并从文件擦除
                    if let Some(legacy_key) = raw.api_key {
                        let trimmed = legacy_key.trim();
                        if !trimmed.is_empty() {
                            log::info!("发现旧版明文 API 密钥，开始安全迁移至系统凭证管理器...");
                            match secure_write_key(trimmed) {
                                Ok(()) => {
                                    log::info!("旧版 API 密钥已成功迁入系统凭证管理器，正在擦除磁盘明文...");
                                    stored.api_key = trimmed.to_string();
                                    stored.secret_ref = Some(format!("keyring:{KEY_NAME}"));
                                    // 重新保存脱敏后的配置文件（不包含 api_key）
                                    if let Ok(serialized) = serde_json::to_string_pretty(&stored) {
                                        let _ = fs::write(&config_path, serialized);
                                    }
                                }
                                Err(e) => {
                                    log::warn!("迁入系统凭据管理器失败 ({e})，暂保留内存状态，不擦除旧文件以防密钥丢失");
                                    stored.api_key = trimmed.to_string();
                                }
                            }
                        }
                    }
                }
            }
        }

        // 若当前未从旧文件读取到密钥，从系统凭据管理器检索
        if stored.api_key.is_empty() {
            if let Some(key) = secure_read_key() {
                stored.api_key = key;
                if stored.secret_ref.is_none() {
                    stored.secret_ref = Some(format!("keyring:{KEY_NAME}"));
                }
            }
        }

        Self {
            config_path,
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
                // 安全写入系统凭证管理器
                match secure_write_key(&trimmed) {
                    Ok(()) => {
                        lock.secret_ref = Some(format!("keyring:{KEY_NAME}"));
                    }
                    Err(e) => {
                        log::warn!("写入 OS Keyring 异常 ({e})，将在内存中暂存凭证");
                    }
                }
                lock.api_key = trimmed;
            }
        }

        // 写入磁盘配置（由于 api_key 被标记为 skip_serializing，此处绝不含明文 Key）
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
}
