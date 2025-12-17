import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { LogSession, ViewMode } from '../types';

interface LogStore {
  sessions: LogSession[];
  activeSessionId: string | null;
  viewMode: ViewMode;
  globalFontSize: number;
  grepFilter: string;
  autoScroll: boolean;

  addSession: (config: Omit<LogSession, 'id' | 'isStreaming' | 'fontSize'>) => string;
  removeSession: (id: string) => void;
  stopSession: (id: string) => Promise<void>;
  stopAllSessions: () => Promise<void>;
  setActiveSession: (id: string | null) => void;
  updateSessionStreaming: (id: string, isStreaming: boolean) => void;
  updateFontSize: (id: string, size: number) => void;
  setGlobalFontSize: (size: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setGrepFilter: (filter: string) => void;
  setAutoScroll: (enabled: boolean) => void;
  clearSessions: () => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  viewMode: 'single',
  globalFontSize: 10,
  grepFilter: '',
  autoScroll: true,

  addSession: (config) => {
    const id = uuidv4();
    const session: LogSession = {
      ...config,
      id,
      isStreaming: false,
      fontSize: get().globalFontSize,
    };
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: id,
    }));
    return id;
  },

  removeSession: (id) => {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const activeSessionId =
        state.activeSessionId === id
          ? sessions.length > 0
            ? sessions[sessions.length - 1].id
            : null
          : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },

  stopSession: async (id) => {
    await window.electronAPI.stopLogStream(id);
    get().removeSession(id);
  },

  stopAllSessions: async () => {
    const sessions = get().sessions;
    await Promise.all(sessions.map((s) => window.electronAPI.stopLogStream(s.id)));
    set({ sessions: [], activeSessionId: null });
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  updateSessionStreaming: (id, isStreaming) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, isStreaming } : s
      ),
    }));
  },

  updateFontSize: (id, size) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, fontSize: size } : s
      ),
    }));
  },

  setGlobalFontSize: (size) => {
    set((state) => ({
      globalFontSize: size,
      sessions: state.sessions.map((s) => ({ ...s, fontSize: size })),
    }));
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setGrepFilter: (filter) => {
    set({ grepFilter: filter });
  },

  setAutoScroll: (enabled) => {
    set({ autoScroll: enabled });
  },

  clearSessions: () => {
    set({ sessions: [], activeSessionId: null });
  },
}));
