import { create } from 'zustand';
import type { ConnectionConfig } from '../types';

interface ConnectionState {
  connections: { id: string; name: string; hasSSH: boolean }[];
  selectedConnectionId: string | null;
  isLoading: boolean;
  error: string | null;

  loadConnections: () => Promise<void>;
  addConnection: (config: ConnectionConfig) => Promise<string>;
  removeConnection: (id: string) => Promise<void>;
  selectConnection: (id: string | null) => void;
  testConnection: (config: ConnectionConfig) => Promise<boolean>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  selectedConnectionId: null,
  isLoading: false,
  error: null,

  loadConnections: async () => {
    set({ isLoading: true, error: null });
    try {
      const connections = await window.electronAPI.getConnections();
      set({ connections, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addConnection: async (config) => {
    set({ isLoading: true, error: null });
    try {
      const id = await window.electronAPI.addConnection(config);
      await get().loadConnections();
      set({ selectedConnectionId: id });
      return id;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  removeConnection: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.removeConnection(id);
      const { selectedConnectionId } = get();
      if (selectedConnectionId === id) {
        set({ selectedConnectionId: null });
      }
      await get().loadConnections();
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  selectConnection: (id) => {
    set({ selectedConnectionId: id });
  },

  testConnection: async (config) => {
    return window.electronAPI.testConnection(config);
  },
}));
