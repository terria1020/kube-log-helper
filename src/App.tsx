import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { SelectorBar } from './components/selector/SelectorBar';
import { LogToolbar } from './components/log/LogToolbar';
import { SplitView } from './components/view/SplitView';
import { useConnectionStore } from './stores/connectionStore';
import { useSelectorStore } from './stores/selectorStore';
import { useLogStore } from './stores/logStore';
import { useSettingsStore } from './stores/settingsStore';

function App() {
  const { loadConnections, selectedConnectionId } = useConnectionStore();
  const { selectedNamespace, selectedPod, selectedContainer, isFollowing, startTime } = useSelectorStore();
  const { addSession } = useLogStore();
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Apply theme on mount and when changed
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleStartLog = async () => {
    if (!selectedConnectionId || !selectedNamespace || !selectedPod || !selectedContainer) {
      return;
    }

    const sessionId = addSession({
      connectionId: selectedConnectionId,
      namespace: selectedNamespace,
      podName: selectedPod,
      containerName: selectedContainer,
    });

    await window.electronAPI.startLogStream({
      sessionId,
      connectionId: selectedConnectionId,
      namespace: selectedNamespace,
      podName: selectedPod,
      containerName: selectedContainer,
      follow: isFollowing,
      sinceTime: startTime || undefined,
      tailLines: 100,
    });
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header />
      <SelectorBar onStartLog={handleStartLog} />
      <LogToolbar />
      <SplitView />
    </div>
  );
}

export default App;
