use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize)]
pub struct AgentReply {
    pub message: String,
    pub command: Option<String>,
}

#[derive(Deserialize)]
struct OpenRouterResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: ChoiceMessage,
}

#[derive(Deserialize)]
struct ChoiceMessage {
    content: String,
}

pub async fn chat(api_key: &str, messages: &[Message]) -> Result<AgentReply, String> {
    let client = Client::new();

    let system = Message {
        role: "system".to_string(),
        content: "You are a helpful assistant with terminal access. \
                  Always respond with JSON matching the schema exactly."
            .to_string(),
    };

    let mut all_messages = vec![system];
    all_messages.extend(messages);

    let body = json!({
        "model": "minimax/minimax-m2.5",
        "messages": all_messages,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "agent_reply",
                "strict": true,
                "schema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Your response to the user"
                        },
                        "command": {
                            "type": ["string", "null"],
                            "description": "Shell command to run, or null if none needed"
                        }
                    },
                    "required": ["message", "command"],
                    "additionalProperties": false
                }
            }
        }
    });

    let parsed: OpenRouterResponse = response.json().await.map_err(|e| e.to_string())?;

    let content = parsed
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or("No response from model")?;

    serde_json::from_str(&content).map_err(|e| e.to_string())?
}
