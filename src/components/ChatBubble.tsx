interface ChatBubbleProps {
  message: string;
  isUser: boolean;
}

export function ChatBubble(props: ChatBubbleProps) {
  return (
    <div class={`chat-bubble ${props.isUser ? "user-bubble" : "kira-bubble"}`}>
      {!props.isUser && <div class="bubble-tail"></div>}
      <p>{props.message}</p>
    </div>
  );
}
