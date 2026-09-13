pub mod key_store;
pub mod provider;

use std::sync::Arc;
use tauri::State;
pub use key_store::{KeyStore, LlmConfigView};
pub use provider::{ChatMessage, LlmChatRequest, LlmTestRequest};

pub struct LlmState {
    pub key_store: Arc<KeyStore>,
}

#[tauri::command]
pub fn llm_get_config(state: State<'_, LlmState>) -> Result<LlmConfigView, String> {
    Ok(state.key_store.get_view())
}

#[tauri::command]
pub fn llm_save_config(
    state: State<'_, LlmState>,
    provider: String,
    base_url: String,
    model: String,
    api_key: Option<String>,
) -> Result<LlmConfigView, String> {
    state.key_store.save_config(provider, base_url, model, api_key)
}

#[tauri::command]
pub fn llm_clear_key(state: State<'_, LlmState>) -> Result<LlmConfigView, String> {
    state.key_store.clear_key()
}

#[tauri::command]
pub async fn llm_chat(
    state: State<'_, LlmState>,
    request: LlmChatRequest,
) -> Result<String, String> {
    let cfg = state.key_store.get_config();
    provider::execute_chat(
        &cfg.provider,
        &cfg.base_url,
        &cfg.model,
        &cfg.api_key,
        &request.messages,
        request.temperature,
    )
    .await
}

#[tauri::command]
pub async fn llm_test_connection(
    state: State<'_, LlmState>,
    request: LlmTestRequest,
) -> Result<String, String> {
    let effective_key = match request.api_key {
        Some(k) if !k.trim().is_empty() => k,
        _ => state.key_store.get_config().api_key,
    };

    if effective_key.trim().is_empty() {
        return Err("请先填入有效的 API 密钥 (API Key)".to_string());
    }

    let test_messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "测试最高参谋部中枢连接，请简短回复：战略通信网络连接正常。".to_string(),
    }];

    let reply = provider::execute_chat(
        &request.provider,
        &request.base_url,
        &request.model,
        &effective_key,
        &test_messages,
        Some(0.3),
    )
    .await?;

    Ok(format!("连通测试成功！模型响应: \"{}\"", reply.trim()))
}
