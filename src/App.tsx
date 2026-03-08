import { createSignal, For, Show, Switch, Match, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Kira } from "./components/Kira";
import "./App.css";

type ViewMode = "compact" | "expanded";

interface Message {
  id: number;
  type: "user" | "kira" | "tool";
  content: string;
  toolId?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolStatus?: "running" | "done" | "error";
  toolResult?: string;
}

interface ToolCallEvent {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "done" | "error";
  result: string | null;
}

interface BackendResponse {
  message: string;
  command: string | null;
  output: string;
  error: string;
  success: boolean;
}

// Static mock data for UI demo
const mockSessions = [
  { id: 1, title: "Current Session", active: true, time: "Just now" },
];

const mockTasks: { id: number; text: string; done: boolean; active?: boolean }[] = [];

const mockContext = [
  { name: "Working directory", type: "folder" },
];

function App() {
  const [sessions] = createSignal(mockSessions);
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [tasks] = createSignal(mockTasks);
  const [context] = createSignal(mockContext);
  const [input, setInput] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [viewMode, setViewMode] = createSignal<ViewMode>("compact");


  // Suppress unused variable warnings
  void sessions;
  void tasks;
  void context;

  // Listen for tool call events
  let unlisten: UnlistenFn | undefined;

  onMount(async () => {
    unlisten = await listen<ToolCallEvent>("tool-call", (event) => {
      const tool = event.payload;
      console.log("Tool event:", tool);

      setMessages((prev) => {
        // Find existing tool message by toolId
        const existingIdx = prev.findIndex(
          (m) => m.type === "tool" && m.toolId === tool.id
        );

        if (existingIdx >= 0) {
          // Update existing - create entirely new array with new object
          return prev.map((m, i) => {
            if (i === existingIdx) {
              return {
                ...m,
                toolName: tool.name,
                toolArgs: tool.args,
                toolStatus: tool.status,
                toolResult: tool.result || undefined,
              };
            }
            return m;
          });
        } else {
          // Add new tool call
          return [...prev, {
            id: Date.now(),
            type: "tool" as const,
            content: "",
            toolId: tool.id,
            toolName: tool.name,
            toolArgs: tool.args,
            toolStatus: tool.status,
            toolResult: tool.result || undefined,
          }];
        }
      });
    });
  });

  onCleanup(() => {
    unlisten?.();
  });

  const sendMessage = async () => {
    const text = input().trim();
    if (!text || isLoading()) return;

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMsg: Message = {
      id: Date.now(),
      type: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const response = await invoke<BackendResponse>("send_message", {
        message: text,
      });

      // Add KIRA's response
      const kiraMsg: Message = {
        id: Date.now() + 1,
        type: "kira",
        content: response.message,
      };
      setMessages((prev) => [...prev, kiraMsg]);
    } catch (err) {
      setError(String(err));
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMode = async () => {
    const newMode = viewMode() === "compact" ? "expanded" : "compact";
    setViewMode(newMode);
    await invoke("set_window_mode", { mode: newMode });
  };

  // Compact Menu Bar View
  const CompactView = () => (
    <div class="compact-window">
      <div class="compact-header">
        <span class="compact-title">KIRA</span>
        <button class="btn-expand" onClick={toggleMode} title="Expand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 3H21V9M9 21H3V15M21 3L14 10M3 21L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="compact-kira">
        <Kira isThinking={false} />
      </div>

      <div class="compact-status">
        <span class={`status-dot ${isLoading() ? 'working' : ''}`}></span>
        <span>{isLoading() ? "Thinking..." : "Ready to help"}</span>
      </div>

      <Show when={error()}>
        <div class="compact-error">{error()}</div>
      </Show>

      <div class="compact-input">
        <input
          type="text"
          placeholder="Ask KIRA anything..."
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading()}
        />
        <button class="btn-send-compact" onClick={sendMessage} disabled={isLoading()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="compact-hint">
        Press <kbd>⌘</kbd> + <kbd>K</kbd> to expand
      </div>
    </div>
  );

  return (
    <main class="app">
      <Show when={viewMode() === "compact"}>
        <CompactView />
      </Show>

      <Show when={viewMode() === "expanded"}>
      <div class="window">
        {/* ===== LEFT SIDEBAR ===== */}
        <aside class="sidebar-left">
          <div class="sidebar-header">
            <button class="btn-new-session">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>New Session</span>
            </button>
          </div>

          <div class="sessions-list">
            <div class="sessions-label">RECENT</div>
            <For each={sessions()}>
              {(session) => (
                <div class={`session-item ${session.active ? 'active' : ''}`}>
                  <div class="session-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="session-content">
                    <span class="session-title">{session.title}</span>
                    <span class="session-time">{session.time}</span>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* KIRA Character at bottom */}
          <div class="sidebar-footer">
            <div class="kira-mini">
              <Kira isThinking={false} />
            </div>
            <button class="btn-settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74486 20.1656 6.23582 20.3766 5.705 20.3766C5.17418 20.3766 4.66514 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95235 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87235 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74486 3.62343 6.23582 3.62343 5.705C3.62343 5.17418 3.83445 4.66514 4.21 4.29C4.58514 3.91445 5.09418 3.70343 5.625 3.70343C6.15582 3.70343 6.66486 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95235 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87235 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58514 20.2966 5.09418 20.2966 5.625C20.2966 6.15582 20.0856 6.66486 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <div class="main-content">
          {/* Header */}
          <header class="main-header">
            <button class="btn-collapse" onClick={toggleMode} title="Collapse to menu bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 14H10V20M20 10H14V4M14 10L21 3M10 14L3 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="header-title">
              <span class="header-badge">Deploy to production</span>
            </div>
            <div class="header-status">
              <span class="status-dot working"></span>
              <span>Working</span>
            </div>
          </header>

          {/* Messages Area */}
          <div class="messages-area">
            <Show when={messages().length === 0}>
              <div class="empty-state">
                <Kira isThinking={false} />
                <p>How can I help you today?</p>
              </div>
            </Show>

            <For each={messages()}>
              {(msg) => (
                <Switch>
                  <Match when={msg.type === "user" || msg.type === "kira"}>
                    <div class={`message message-${msg.type}`}>
                      <p>{msg.content}</p>
                    </div>
                  </Match>
                  <Match when={msg.type === "tool"}>
                    <div class={`tool-call ${msg.toolStatus || ''}`}>
                      <div class="tool-header">
                        <div class="tool-icon">
                          <Switch fallback={<span class="spinner-small"></span>}>
                            <Match when={msg.toolStatus === "done"}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </Match>
                            <Match when={msg.toolStatus === "error"}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </Match>
                          </Switch>
                        </div>
                        <span class="tool-name">{msg.toolName || 'tool'}</span>
                        <span class={`tool-status ${msg.toolStatus || ''}`}>
                          {(msg.toolStatus || 'running').toUpperCase()}
                        </span>
                      </div>
                      <Show when={msg.toolArgs && Object.keys(msg.toolArgs).length > 0}>
                        <div class="tool-args">
                          <code>{JSON.stringify(msg.toolArgs, null, 2)}</code>
                        </div>
                      </Show>
                      <Show when={msg.toolResult}>
                        <div class="tool-result">
                          <pre>{msg.toolResult}</pre>
                        </div>
                      </Show>
                    </div>
                  </Match>
                </Switch>
              )}
            </For>

            <Show when={isLoading()}>
              <div class="message message-kira loading">
                <span class="spinner"></span>
                <span>Thinking...</span>
              </div>
            </Show>

            <Show when={error()}>
              <div class="message message-error">
                <p>{error()}</p>
              </div>
            </Show>
          </div>

          {/* Input Area */}
          <div class="input-area">
            <div class="input-wrapper">
              <button class="btn-attach">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
              <input
                type="text"
                placeholder="Ask KIRA anything..."
                value={input()}
                onInput={(e) => setInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading()}
              />
              <button class="btn-send" onClick={sendMessage} disabled={isLoading()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            <Show when={isLoading()}>
              <div class="input-footer">
                <span class="working-indicator">
                  <span class="spinner-small"></span>
                  KIRA is working...
                </span>
              </div>
            </Show>
          </div>
        </div>

        {/* ===== RIGHT SIDEBAR ===== */}
        <aside class="sidebar-right">
          {/* Tasks Section */}
          <div class="panel-section">
            <div class="panel-header">
              <span>MISSION</span>
            </div>
            <div class="tasks-list">
              <For each={tasks()}>
                {(task) => (
                  <div class={`task-item ${task.done ? 'done' : ''} ${task.active ? 'active' : ''}`}>
                    <div class="task-checkbox">
                      <Show when={task.done}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </Show>
                      <Show when={task.active && !task.done}>
                        <span class="task-spinner"></span>
                      </Show>
                    </div>
                    <span class="task-text">{task.text}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Context/Files Section */}
          <div class="panel-section">
            <div class="panel-header">
              <span>CONTEXT</span>
              <span class="context-path">/next-app</span>
            </div>
            <div class="files-list">
              <For each={context()}>
                {(item) => (
                  <div class="file-item">
                    <Show when={item.type === "folder"}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </Show>
                    <Show when={item.type === "file"}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </Show>
                    <span>{item.name}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </aside>
      </div>
      </Show>
    </main>
  );
}

export default App;
