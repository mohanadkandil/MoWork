interface ChatInputProps {
  value: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function ChatInput(props: ChatInputProps) {
  return (
    <form
      class="chat-input-container"
      onSubmit={(e) => {
        e.preventDefault();
        if (!props.disabled && props.value.trim()) {
          props.onSubmit();
        }
      }}
    >
      <input
        type="text"
        class="chat-input"
        placeholder="Ask KIRA anything..."
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        disabled={props.disabled}
        autofocus
      />
    </form>
  );
}
