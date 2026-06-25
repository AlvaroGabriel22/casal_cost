import { create } from 'zustand';
import type { ChatMessage } from '../services/chat.service';

type ChatState = {
  messages: ChatMessage[];
  sessionReady: boolean;
  setSessionReady: (ready: boolean) => void;
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessionReady: false,
  setSessionReady: (sessionReady) => set({ sessionReady }),
  setMessages: (updater) =>
    set((state) => ({
      messages: typeof updater === 'function' ? updater(state.messages) : updater,
    })),
  reset: () => set({ messages: [], sessionReady: false }),
}));
