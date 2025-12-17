import { useLogStore } from '../../stores/logStore';
import { LogPanel } from './LogPanel';

export function SplitView() {
  const { sessions, activeSessionId, viewMode, setActiveSession, removeSession } = useLogStore();

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-zinc-500">연결과 Pod를 선택하여 로그를 조회하세요</p>
        </div>
      </div>
    );
  }

  // Get sessions to display based on view mode
  const getDisplaySessions = () => {
    switch (viewMode) {
      case 'single':
        const activeSession = sessions.find((s) => s.id === activeSessionId);
        return activeSession ? [activeSession] : sessions.slice(0, 1);
      case 'split-h':
      case 'split-v':
        return sessions.slice(0, 2);
      case 'quad':
        return sessions.slice(0, 4);
      default:
        return sessions.slice(0, 1);
    }
  };

  const displaySessions = getDisplaySessions();

  // Grid layout based on view mode
  const getGridClass = () => {
    switch (viewMode) {
      case 'single':
        return 'grid-cols-1 grid-rows-1';
      case 'split-h':
        return 'grid-cols-1 grid-rows-2';
      case 'split-v':
        return 'grid-cols-2 grid-rows-1';
      case 'quad':
        return 'grid-cols-2 grid-rows-2';
      default:
        return 'grid-cols-1 grid-rows-1';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden">
      {/* Tabs (shown when there are more sessions than display slots) */}
      {sessions.length > displaySessions.length && (
        <div className="flex bg-zinc-800 border-b border-zinc-700 overflow-x-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-r border-zinc-700 transition-colors ${
                session.id === activeSessionId
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:bg-zinc-700/50'
              }`}
            >
              <span className="truncate max-w-[150px]">{session.podName}</span>
              <span className="text-xs text-zinc-500">/ {session.containerName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSession(session.id);
                }}
                className="p-0.5 hover:bg-zinc-600 rounded"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Log Viewers Grid */}
      <div className={`flex-1 grid ${getGridClass()} gap-px bg-zinc-700`}>
        {displaySessions.map((session) => (
          <LogPanel
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onClose={() => removeSession(session.id)}
            onClick={() => setActiveSession(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
