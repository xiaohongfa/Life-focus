use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "system" | "user" | "assistant"
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmChatRequest {
    pub messages: Vec<ChatMessage>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmTestRequest {
    pub provider: String,
    #[serde(alias = "base_url")]
    pub base_url: String,
    pub model: String,
    #[serde(alias = "api_key")]
    pub api_key: Option<String>,
}

pub fn validate_url_security(url_str: &str) -> Result<(), String> {
    let trimmed = url_str.trim();
    if trimmed.is_empty() {
        return Err("API 端点地址不能为空".to_string());
    }

    if trimmed.starts_with("https://") {
        return Ok(());
    }

    if trimmed.starts_with("http://localhost")
        || trimmed.starts_with("http://127.0.0.1")
        || trimmed.starts_with("http://[::1]")
    {
        return Ok(());
    }

    if trimmed.starts_with("http://") {
        return Err("出于安全防护考虑，非本机的远程大模型端点必须使用 https:// 加密协议".to_string());
    }

    Err("无效的 URL 协议格式，请输入 https:// 或本地 http:// 地址".to_string())
}

pub async fn execute_chat(
    provider: &str,
    base_url: &str,
    model: &str,
    api_key: &str,
    messages: &[ChatMessage],
    temperature: Option<f32>,
) -> Result<String, String> {
    validate_url_security(base_url)?;

    if api_key.trim().is_empty() {
        return Err("未配置有效的 API 密钥，请在系统设置中填入 API Key".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| format!("初始化网络客户端失败: {e}"))?;

    let temp = temperature.unwrap_or(0.7);

    match provider.to_lowercase().as_str() {
        "gemini" => execute_gemini(&client, base_url, model, api_key, messages, temp).await,
        _ => execute_openai_compatible(&client, base_url, model, api_key, messages, temp).await,
    }
}

async fn execute_openai_compatible(
    client: &reqwest::Client,
    base_url: &str,
    model: &str,
    api_key: &str,
    messages: &[ChatMessage],
    temperature: f32,
) -> Result<String, String> {
    let mut endpoint = base_url.trim().trim_end_matches('/').to_string();
    if !endpoint.ends_with("/chat/completions") {
        endpoint = format!("{endpoint}/chat/completions");
    }

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": temperature,
    });

    let resp = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络请求发送异常: {}", sanitize_error(&e.to_string(), api_key)))?;

    let status = resp.status();
    if !status.is_success() {
        let err_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "服务端响应错误 (HTTP {status}): {}",
            sanitize_error(&err_body, api_key)
        ));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析模型 JSON 响应失败: {e}"))?;

    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| "模型响应格式异常，未找到 choices[0].message.content".to_string())?;

    Ok(content.to_string())
}

async fn execute_gemini(
    client: &reqwest::Client,
    base_url: &str,
    model: &str,
    api_key: &str,
    messages: &[ChatMessage],
    temperature: f32,
) -> Result<String, String> {
    let mut base = base_url.trim().trim_end_matches('/').to_string();
    if base == "https://api.deepseek.com" || base == "https://api.openai.com/v1" {
        base = "https://generativelanguage.googleapis.com".to_string();
    }

    // Google Gemini 官方端点
    let endpoint = format!("{base}/v1beta/models/{model}:generateContent?key={}", api_key.trim());

    // 区分 system 与 user/assistant 消息
    let system_instructions: Vec<&str> = messages
        .iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.as_str())
        .collect();

    let contents: Vec<serde_json::Value> = messages
        .iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            let role = if m.role == "assistant" { "model" } else { "user" };
            serde_json::json!({
                "role": role,
                "parts": [{ "text": m.content }]
            })
        })
        .collect();

    let mut body = serde_json::json!({
        "contents": contents,
        "generationConfig": {
            "temperature": temperature
        }
    });

    if !system_instructions.is_empty() {
        let combined_sys = system_instructions.join("\n\n");
        body["systemInstruction"] = serde_json::json!({
            "parts": [{ "text": combined_sys }]
        });
    }

    let resp = client
        .post(&endpoint)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini 网络请求异常: {}", sanitize_error(&e.to_string(), api_key)))?;

    let status = resp.status();
    if !status.is_success() {
        let err_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Gemini 服务端响应错误 (HTTP {status}): {}",
            sanitize_error(&err_body, api_key)
        ));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析 Gemini 响应失败: {e}"))?;

    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "Gemini 响应中未找到 candidates[0].content.parts[0].text".to_string())?;

    Ok(text.to_string())
}

pub fn sanitize_error(msg: &str, api_key: &str) -> String {
    let trimmed = api_key.trim();
    if trimmed.is_empty() {
        msg.to_string()
    } else {
        msg.replace(trimmed, "******")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_security_rules() {
        assert!(validate_url_security("https://api.openai.com/v1").is_ok());
        assert!(validate_url_security("https://api.deepseek.com").is_ok());
        assert!(validate_url_security("http://localhost:11434").is_ok());
        assert!(validate_url_security("http://127.0.0.1:8000").is_ok());

        // 拒绝远程明文 HTTP
        assert!(validate_url_security("http://remote-server.com/api").is_err());
        assert!(validate_url_security("ftp://invalid.com").is_err());
    }

    #[test]
    fn test_sanitize_error_masks_key() {
        let key = "sk-secret12345678";
        let raw_err = format!("Failed Authorization: Bearer {key} timeout");
        let safe = sanitize_error(&raw_err, key);
        assert!(!safe.contains(key));
        assert!(safe.contains("******"));
    }
}
