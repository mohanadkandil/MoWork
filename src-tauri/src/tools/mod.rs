pub mod bash;
pub mod grep;

use serde_json::Value;

// return all tools definitions
pub fn all_tools() -> Vec<Value> {
    vec![
        bash::definition(),
        grep::definition(),
    ]
}

// route a tool call by name to the appropriate executor
pub fn execute_tool(name: &str, input: &Value) -> Result<String, String> {
    match name {
        "bash" => bash::execute(input),
        "grep" => grep::execute(input),
        _ => Err(format!("Unknown tool: {}", name)),
    }
}
