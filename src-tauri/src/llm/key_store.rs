use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmStoredConfig {
    pub provider: String,
    pub base_url: String,
    pub model: String,
    #[serde(default)]
    pub api_key: String,
}

impl Default for LlmStoredConfig {
    fn default() -> Self {
        Self {
            provider: "deepseek".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            model: "deepseek-chat".to_string(),
            api_key: String::new(),
        }
    }
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

impl KeyStore {
    pub fn new(data_dir: &Path) -> Self {
        let config_path = data_dir.join("llm_credentials.json");
        let stored = if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(content) => serde_json::from_str::<LlmStoredConfig>(&content).unwrap_or_default(),
                Err(_) => LlmStoredConfig::default(),
            }
        } else {
            LlmStoredConfig::default()
        };

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
            // 如果用户传入具体 key，更新它
            if !trimmed.is_empty() {
                lock.api_key = trimmed;
            }
        }

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
    if trimmed.len() <= 6 {
        "***".to_string()
    } else {
        let prefix = &trimmed[..3];
        let suffix = &trimmed[trimmed.len() - 4..];
        format!("{prefix}****{suffix}")
    }
}
