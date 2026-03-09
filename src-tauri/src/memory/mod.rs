pub mod store;
pub mod tools;

use serde_json::Value;

pub fn all_definitions() -> Vec<Value> {
    vec![
        tools::memory_store_definition(),
        tools::memory_recall_definition(),
        tools::memory_forget_definition(),
    ]
}

pub fn execute(name: &str, input: &Value) -> Result<String, String> {
    tools::execute(name, input)
}

// Builds the memory context block injected into every prompt
pub fn build_context() -> String {
    let mut context = String::new();

    // inject permanent facts
    if let Ok(facts) = store::all_facts() {
        if !facts.is_empty() {
            context.push_str("[What you know about the user]\n");
            for (key, value) in facts {
                context.push_str(&format!("- {}: {}\n", key, value));
            }
            context.push_str("\n");
        }
    }

    // inject recent episodes
    if let Ok(episodes) = store::recent_episodes(3) {
        if !episodes.is_empty() {
            context.push_str("[Recent conversation history]\n");
            for episode in episodes {
                context.push_str(&format!("- {}\n", episode));
            }
            context.push('\n');
        }
    }
    context
}
