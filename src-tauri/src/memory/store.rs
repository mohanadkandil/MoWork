use rusqlite::{params, Connection};

pub fn init_db() -> Result<Connection, String> {
    // lives at ~/Library/Application Support/mowork/memory.db
    let data_dir = dirs::data_dir().ok_or("Failed to get data directory")?;
    let path = data_dir.join("mowork").join("memory.db");

    // Create dir if it doesn't exist
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Connect to the database
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;

    // Create tables if they don't exist
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS semantic (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            summary TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- FTS5 = full text search, lets us search memory by keywords
        -- think of it like a search index on top of semantic table
        CREATE VIRTUAL TABLE IF NOT EXISTS semantic_fts 
        USING fts5(key, value, content=semantic);
    ",
    )
    .map_err(|e| e.to_string())?;

    Ok(conn)
}

// Store permanent, long-term memory (fact)
pub fn store(key: &str, value: &str) -> Result<(), String> {
    let conn = init_db()?;
    conn.execute(
        // INSERT OR REPLACE = upsert, like "insert if not exists, update if exists"
        "INSERT OR REPLACE INTO semantic (key, value, updated_at) 
         VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// Search for relevant memories based on keywords and return matching keys
pub fn recall(query: &str) -> Result<Vec<(String, String)>, String> {
    let conn = init_db()?;

    // Simple LIKE search - good enough for small memory store
    let pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT key, value FROM semantic
             WHERE key LIKE ?1 OR value LIKE ?1
             ORDER BY updated_at DESC
             LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map(params![pattern], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

// Store a conversation summary as an episode
pub fn store_episode(summary: &str) -> Result<(), String> {
    let conn = init_db()?;
    conn.execute(
        "INSERT INTO episodes (summary) VALUES (?1)",
        params![summary],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// Get the last N episode summaries
// Used to give MoWork context about recent past sessions
pub fn recent_episodes(limit: u32) -> Result<Vec<String>, String> {
    let conn = init_db()?;
    let mut stmt = conn
        .prepare(
            "SELECT summary FROM episodes 
         ORDER BY created_at DESC 
         LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map(params![limit], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

// Delete a fact by key
pub fn forget(key: &str) -> Result<(), String> {
    let conn = init_db()?;
    conn.execute("DELETE FROM semantic WHERE key = ?1", params![key])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn all_facts() -> Result<Vec<(String, String)>, String> {
    let conn = init_db()?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM semantic ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}
