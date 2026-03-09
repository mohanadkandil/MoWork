use crate::memory::store;
use serde_json::Value;

// Tool 1: model calls this to store a fact
pub fn memory_store_definition() -> Value {
    serde_json::json!({
        "type": "function",
        "function": {
            "name": "memory_store",
            "description": "Store a permanent fact about the user. Use this when you learn something important that should be remembered across sessions. For example: user's preferences, project locations, habits, names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {
                        "type": "string",
                        "description": "Short identifier for the fact, e.g. 'preferred_editor', 'main_project'"
                    },
                    "value": {
                        "type": "string",
                        "description": "The fact to remember, e.g. 'neovim', 'mowork at ~/web/claw/mowork'"
                    }
                },
                "required": ["key", "value"]
            }
        }
    })
}

// Tool 2: model calls this to search memory
pub fn memory_recall_definition() -> Value {
    serde_json::json!({
        "type": "function",
        "function": {
            "name": "memory_recall",
            "description": "Search your memory for facts relevant to a query. Use this when you need to remember something about the user that might have been stored in a previous session.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "What to search for, e.g. 'project location', 'editor preference'"
                    }
                },
                "required": ["query"]
            }
        }
    })
}

// Tool 3: model calls this to forget a fact
pub fn memory_forget_definition() -> Value {
    serde_json::json!({
        "type": "function",
        "function": {
            "name": "memory_forget",
            "description": "Delete a stored fact. Use when the user says something is no longer relevant or asks you to forget something.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {
                        "type": "string",
                        "description": "The key of the fact to delete"
                    }
                },
                "required": ["key"]
            }
        }
    })
}

// Executes whichever memory tool the model called
pub fn execute(name: &str, input: &Value) -> Result<String, String> {
    match name {
        "memory_store" => {
            let key = input
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing key")?;
            let value = input
                .get("value")
                .and_then(|v| v.as_str())
                .ok_or("Missing value")?;
            store::store(key, value)?;
            Ok(format!("Remembered: {} = {}", key, value))
        }

        "memory_recall" => {
            let query = input
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or("Missing query")?;
            let results = store::recall(query)?;
            if results.is_empty() {
                Ok("No relevant memories found".to_string())
            } else {
                // Format results as readable key: value list
                let formatted = results
                    .iter()
                    .map(|(k, v)| format!("{}: {}", k, v))
                    .collect::<Vec<_>>()
                    .join("\n");
                Ok(formatted)
            }
        }

        "memory_forget" => {
            let key = input
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing key")?;
            // We'll add delete to store.rs in a second
            store::forget(key)?;
            Ok(format!("Forgot: {}", key))
        }

        _ => Err(format!("Unknown memory tool: {}", name)),
    }
}
