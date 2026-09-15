use serde::{Deserialize, Serialize};
use std::time::Duration;
use url::Url;

const MAX_ERROR_BODY_BYTES: usize = 2048;

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

    let parsed = Url::parse(trimmed).map_err(|e| format!("无效的 URL 格式: {e}"))?;

    match parsed.scheme() {
        "https" => Ok(()),
        "http" => match parsed.host() {
            Some(url::Host::Domain(d)) if d.eq_ignore_ascii_case("localhost") => Ok(()),
            Some(url::Host::Ipv4(ip)) if ip.is_loopback() => Ok(()),
            Some(url::Host::Ipv6(ip)) if ip.is_loopback() => Ok(()),
            _ => Err(
                "出于安全防护考虑，非本机的远程大模型端点必须使用 https:// 加密协议".to_string(),
            ),
        },
        _ => Err("无效的 URL 协议格式，请输入 https:// 或本地 http:// 地址".to_string()),
    }
}

pub fn build_openai_endpoint(base_url: &str) -> String {
    let mut endpoint = base_url.trim().trim_end_matches('/').to_string();
    if !endpoint.ends_with("/chat/completions") {
        endpoint = format!("{endpoint}/chat/completions");
    }
    endpoint
}

pub fn build_gemini_endpoint(base_url: &str, model: &str, api_key: &str) -> String {
    let mut base = base_url.trim().trim_end_matches('/').to_string();
    // Gemini 的设置页允许用户填入根地址或已带 /v1beta 的地址，统一在这里
    // 规范化，避免出现 /v1beta/v1beta 或重复 models 路径。
    for suffix in ["/v1beta", "/v1"] {
        if base.ends_with(suffix) {
            base.truncate(base.len() - suffix.len());
            break;
        }
    }
    format!(
        "{base}/v1beta/models/{model}:generateContent?key={}",
        api_key.trim()
    )
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
    let endpoint = build_openai_endpoint(base_url);

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
        .map_err(|e| {
            format!(
                "网络请求发送异常: {}",
                sanitize_error(&e.to_string(), api_key)
            )
        })?;

    let status = resp.status();
    if !status.is_success() {
        let err_body = truncate_error_body(&resp.text().await.unwrap_or_default());
        return Err(format!(
            "服务端响应错误 (HTTP {status}): {}",
            sanitize_error(&err_body, api_key)
        ));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析模型 JSON 响应失败: {e}"))?;

    extract_openai_content(&json, api_key)
}

async fn execute_gemini(
    client: &reqwest::Client,
    base_url: &str,
    model: &str,
    api_key: &str,
    messages: &[ChatMessage],
    temperature: f32,
) -> Result<String, String> {
    let endpoint = build_gemini_endpoint(base_url, model, api_key);

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
            let role = if m.role == "assistant" {
                "model"
            } else {
                "user"
            };
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
        .map_err(|e| {
            format!(
                "Gemini 网络请求异常: {}",
                sanitize_error(&e.to_string(), api_key)
            )
        })?;

    let status = resp.status();
    if !status.is_success() {
        let err_body = truncate_error_body(&resp.text().await.unwrap_or_default());
        return Err(format!(
            "Gemini 服务端响应错误 (HTTP {status}): {}",
            sanitize_error(&err_body, api_key)
        ));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析 Gemini 响应失败: {e}"))?;

    extract_gemini_content(&json, api_key)
}

pub fn extract_openai_content(json: &serde_json::Value, api_key: &str) -> Result<String, String> {
    let choices = json
        .get("choices")
        .and_then(|value| value.as_array())
        .ok_or_else(|| {
            if let Some(error) = json.get("error") {
                format!(
                    "服务商返回错误: {}",
                    truncate_error_body(&sanitize_error(&error.to_string(), api_key))
                )
            } else {
                "模型响应格式异常，未找到 choices 数组".to_string()
            }
        })?;
    let first = choices
        .first()
        .ok_or_else(|| "模型响应 choices 为空".to_string())?;
    let content = first
        .get("message")
        .and_then(|message| message.get("content"))
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "模型响应格式异常，未找到有效的 message.content 文本".to_string())?;
    Ok(content.to_string())
}

pub fn extract_gemini_content(json: &serde_json::Value, api_key: &str) -> Result<String, String> {
    let candidates = json
        .get("candidates")
        .and_then(|value| value.as_array())
        .ok_or_else(|| {
            if let Some(error) = json.get("error") {
                format!(
                    "Gemini 服务商返回错误: {}",
                    truncate_error_body(&sanitize_error(&error.to_string(), api_key))
                )
            } else {
                "Gemini 响应格式异常，未找到 candidates 数组".to_string()
            }
        })?;
    let first = candidates
        .first()
        .ok_or_else(|| "Gemini 响应 candidates 为空（可能被安全策略拦截）".to_string())?;
    let text = first
        .get("content")
        .and_then(|content| content.get("parts"))
        .and_then(|parts| parts.as_array())
        .and_then(|parts| {
            parts
                .iter()
                .find_map(|part| part.get("text").and_then(|v| v.as_str()))
        })
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            "Gemini 响应中未找到有效的 candidates.content.parts.text 文本".to_string()
        })?;
    Ok(text.to_string())
}

pub fn truncate_error_body(body: &str) -> String {
    if body.len() <= MAX_ERROR_BODY_BYTES {
        return body.to_string();
    }
    let mut end = MAX_ERROR_BODY_BYTES;
    while !body.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}...[truncated]", &body[..end])
}

pub fn sanitize_error(msg: &str, api_key: &str) -> String {
    let trimmed = api_key.trim();
    let safe = if !trimmed.is_empty() {
        msg.replace(trimmed, "******")
    } else {
        msg.to_string()
    };

    // 脱敏 URL Query 参数中的 key=...
    let mut result = String::with_capacity(safe.len());
    let mut remaining = safe.as_str();

    while let Some(pos) = remaining.find("key=") {
        result.push_str(&remaining[..pos + 4]);
        let after_key = &remaining[pos + 4..];
        let val_len = after_key
            .find(['&', ' ', '"', '\'', '\n', '\r'])
            .unwrap_or(after_key.len());
        result.push_str("******");
        remaining = &after_key[val_len..];
    }
    result.push_str(remaining);
    truncate_error_body(&result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_security_rules() {
        // 合法 HTTPS 远程端点
        assert!(validate_url_security("https://api.openai.com/v1").is_ok());
        assert!(validate_url_security("https://api.deepseek.com").is_ok());
        assert!(validate_url_security("https://generativelanguage.googleapis.com").is_ok());

        // 合法本地 HTTP 端点
        assert!(validate_url_security("http://localhost:11434").is_ok());
        assert!(validate_url_security("http://localhost").is_ok());
        assert!(validate_url_security("http://127.0.0.1:8000").is_ok());
        assert!(validate_url_security("http://127.0.0.1").is_ok());
        assert!(validate_url_security("http://[::1]:11434").is_ok());
        assert!(validate_url_security("http://[::1]").is_ok());

        // 拒绝恶意 localhost / 127.0.0.1 前缀绕过
        assert!(validate_url_security("http://localhost.evil.com").is_err());
        assert!(validate_url_security("http://localhost.evil.com:8000").is_err());
        assert!(validate_url_security("http://localhost@evil.com").is_err());
        assert!(validate_url_security("http://127.0.0.1.evil.com").is_err());
        assert!(validate_url_security("http://127.0.0.1.attacker.org").is_err());
        assert!(validate_url_security("http://evil.com").is_err());
        assert!(validate_url_security("http://remote-server.com/api").is_err());

        // 拒绝非 http/https 协议
        assert!(validate_url_security("ftp://localhost").is_err());
        assert!(validate_url_security("file:///etc/passwd").is_err());
        assert!(validate_url_security("ws://localhost:8000").is_err());
        assert!(validate_url_security("javascript:alert(1)").is_err());
        assert!(validate_url_security("data:text/plain,hello").is_err());
        assert!(validate_url_security("").is_err());
        assert!(validate_url_security("   ").is_err());
    }

    #[test]
    fn test_sanitize_error_masks_key() {
        let key = "sk-secret12345678";
        let raw_err = format!("Failed Authorization: Bearer {key} timeout");
        let safe = sanitize_error(&raw_err, key);
        assert!(!safe.contains(key));
        assert!(safe.contains("******"));

        // Query key masking
        let query_err = format!("URL: https://api.example.com/v1?key={key}&other=1");
        let safe_query = sanitize_error(&query_err, "different-key");
        assert!(!safe_query.contains(key));
        assert!(safe_query.contains("key=******"));
    }

    #[test]
    fn test_endpoint_builders() {
        assert_eq!(
            build_openai_endpoint("https://api.deepseek.com"),
            "https://api.deepseek.com/chat/completions"
        );
        assert_eq!(
            build_openai_endpoint("https://api.deepseek.com/chat/completions"),
            "https://api.deepseek.com/chat/completions"
        );
        assert_eq!(
            build_openai_endpoint("https://api.openai.com/v1/"),
            "https://api.openai.com/v1/chat/completions"
        );

        let gemini_ep = build_gemini_endpoint(
            "https://generativelanguage.googleapis.com",
            "gemini-1.5-pro",
            "mykey",
        );
        assert!(gemini_ep.contains("/v1beta/models/gemini-1.5-pro:generateContent?key=mykey"));
        assert_eq!(
            build_gemini_endpoint(
                "https://generativelanguage.googleapis.com/v1beta/",
                "gemini-1.5-pro",
                "mykey"
            ),
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=mykey"
        );
    }

    #[test]
    fn test_response_parsers_reject_malformed_payloads() {
        let openai = serde_json::json!({"choices": [{"message": {"content": "  hello  "}}]});
        assert_eq!(extract_openai_content(&openai, "secret").unwrap(), "hello");
        assert!(extract_openai_content(&serde_json::json!({"choices": []}), "secret").is_err());
        assert!(extract_openai_content(
            &serde_json::json!({"choices": [{"message": {"content": null}}]}),
            "secret"
        )
        .is_err());

        let gemini =
            serde_json::json!({"candidates": [{"content": {"parts": [{"text": "  hi  "}]}}]});
        assert_eq!(extract_gemini_content(&gemini, "secret").unwrap(), "hi");
        assert!(extract_gemini_content(&serde_json::json!({"candidates": []}), "secret").is_err());
        let provider_error = serde_json::json!({"error": {"message": "secret"}});
        let message = extract_openai_content(&provider_error, "secret").unwrap_err();
        assert!(!message.contains("secret"));
    }

    #[test]
    fn test_error_body_is_limited_without_panicking_on_utf8() {
        let safe = sanitize_error(&"啊".repeat(2_000), "unused");
        assert!(safe.len() <= MAX_ERROR_BODY_BYTES + "...[truncated]".len());
        assert!(safe.ends_with("...[truncated]"));
    }
}
