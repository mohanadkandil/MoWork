pub mod bash;
pub mod grep;

use crate::memory;
use serde_json::Value;

// return all tools definitions
pub fn all_tools() -> Vec<Value> {
    let mut tools = vec![bash::definition(), grep::definition()];
    tools.extend(memory::all_definitions());
    tools
}

// route a tool call by name to the appropriate executor
pub fn execute_tool(name: &str, input: &Value) -> Result<String, String> {
    match name {
        "bash" => bash::execute(input),
        "grep" => grep::execute(input),
        "memory_store" | "memory_recall" | "memory_forget" => memory::execute(name, input),
        _ => Err(format!("Unknown tool: {}", name)),
    }
}
