/** Tracks chat session per page load / login — not persisted across refresh. */
let boundToken: string | null | undefined;

export function needsChatSessionReset(currentToken: string | null): boolean {
  if (boundToken === undefined) return true;
  return currentToken !== boundToken;
}

export function bindChatSession(token: string | null) {
  boundToken = token;
}

export function resetChatSessionBinding() {
  boundToken = undefined;
}
