export function formatChatbotMessageText(text: string) {
  return text.replace(/\*\*([^*]+?)\*\*/g, '$1');
}
