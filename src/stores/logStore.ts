import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { LogSession, ViewMode } from '../types';

interface LogStore {
  sessions: LogSession[];
  activeSessionId: string | null;
  viewMode: ViewMode;
  globalFontSize: number;
  clearLogsTrigger: number;

  // Shell filter (세션별)
  sessionFilters: Record<string, string>;
  activeFilters: Set<string>;
  filterErrors: Record<string, string>;

  addSession: (config: Omit<LogSession, 'id' | 'isStreaming' | 'fontSize'>) => string;
  removeSession: (id: string) => void;
  stopSession: (id: string) => Promise<void>;
  stopAllSessions: () => Promise<void>;
  setActiveSession: (id: string | null) => void;
  updateSessionStreaming: (id: string, isStreaming: boolean) => void;
  updateFontSize: (id: string, size: number) => void;
  setGlobalFontSize: (size: number) => void;
  setViewMode: (mode: ViewMode) => void;
  clearSessions: () => void;
  clearAllLogs: () => void;

  // Shell filter actions
  setSessionFilter: (sessionId: string, command: string) => void;
  startFilter: (sessionId: string) => Promise<void>;
  stopFilter: (sessionId: string) => Promise<void>;
  setFilterError: (sessionId: string, error: string | null) => void;
  isFilterActive: (sessionId: string) => boolean;
  getFilterCommand: (sessionId: string) => string;
}

export const useLogStore = create<LogStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  viewMode: 'single',
  globalFontSize: 10,
  clearLogsTrigger: 0,

  sessionFilters: {},
  activeFilters: new Set(),
  filterErrors: {},

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

      const newSessionFilters = { ...state.sessionFilters };
      delete newSessionFilters[id];

      const newFilterErrors = { ...state.filterErrors };
      delete newFilterErrors[id];

      const newActiveFilters = new Set(state.activeFilters);
      newActiveFilters.delete(id);

      return {
        sessions,
        activeSessionId,
        sessionFilters: newSessionFilters,
        filterErrors: newFilterErrors,
        activeFilters: newActiveFilters,
      };
    });
  },

  stopSession: async (id) => {
    await get().stopFilter(id);
    await window.electronAPI.stopLogStream(id);
    get().removeSession(id);
  },

  stopAllSessions: async () => {
    const sessions = get().sessions;
    await Promise.all(sessions.map(async (s) => {
      await get().stopFilter(s.id);
      await window.electronAPI.stopLogStream(s.id);
    }));
    set({
      sessions: [],
      activeSessionId: null,
      sessionFilters: {},
      activeFilters: new Set(),
      filterErrors: {},
    });
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

  clearSessions: () => {
    set({
      sessions: [],
      activeSessionId: null,
      sessionFilters: {},
      activeFilters: new Set(),
      filterErrors: {},
    });
  },

  clearAllLogs: () => {
    set((state) => ({ clearLogsTrigger: state.clearLogsTrigger + 1 }));
  },

  // Shell filter actions
  setSessionFilter: (sessionId, command) => {
    set((state) => ({
      sessionFilters: { ...state.sessionFilters, [sessionId]: command },
    }));
  },

  startFilter: async (sessionId) => {
    const command = get().sessionFilters[sessionId];
    if (!command?.trim()) return;

    const result = await window.electronAPI.startShellFilter(sessionId, command);
    if (result.success) {
      set((state) => {
        const newActiveFilters = new Set(state.activeFilters);
        newActiveFilters.add(sessionId);
        const newFilterErrors = { ...state.filterErrors };
        delete newFilterErrors[sessionId];
        return { activeFilters: newActiveFilters, filterErrors: newFilterErrors };
      });
    } else {
      set((state) => ({
        filterErrors: { ...state.filterErrors, [sessionId]: result.error || 'Unknown error' },
      }));
    }
  },

  stopFilter: async (sessionId) => {
    await window.electronAPI.stopShellFilter(sessionId);
    set((state) => {
      const newActiveFilters = new Set(state.activeFilters);
      newActiveFilters.delete(sessionId);
      return { activeFilters: newActiveFilters };
    });
  },

  setFilterError: (sessionId, error) => {
    set((state) => {
      if (error === null) {
        const newFilterErrors = { ...state.filterErrors };
        delete newFilterErrors[sessionId];
        return { filterErrors: newFilterErrors };
      }
      return { filterErrors: { ...state.filterErrors, [sessionId]: error } };
    });
  },

  isFilterActive: (sessionId) => {
    return get().activeFilters.has(sessionId);
  },

  getFilterCommand: (sessionId) => {
    return get().sessionFilters[sessionId] || '';
  },
}));
