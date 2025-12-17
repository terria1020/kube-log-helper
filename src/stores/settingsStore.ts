import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface SettingsStore {
  theme: Theme;
  selectorBarCollapsed: boolean;
  tlsInsecure: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSelectorBar: () => void;
  setSelectorBarCollapsed: (collapsed: boolean) => void;
  setTlsInsecure: (insecure: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      selectorBarCollapsed: false,
      tlsInsecure: false,

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        applyTheme(newTheme);
      },

      toggleSelectorBar: () => {
        set({ selectorBarCollapsed: !get().selectorBarCollapsed });
      },

      setSelectorBarCollapsed: (collapsed) => {
        set({ selectorBarCollapsed: collapsed });
      },

      setTlsInsecure: (insecure) => {
        set({ tlsInsecure: insecure });
        // Sync with backend
        window.electronAPI?.setTlsInsecure(insecure);
      },
    }),
    {
      name: 'kube-log-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          // Sync TLS setting with backend on app load
          window.electronAPI?.setTlsInsecure(state.tlsInsecure);
        }
      },
    }
  )
);

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
