import { LogViewer } from '../log/LogViewer';
import type { LogSession } from '../../types';

interface LogPanelProps {
  session: LogSession;
  isActive: boolean;
  onClose: () => void;
  onClick: () => void;
}

export function LogPanel({ session, isActive, onClose, onClick }: LogPanelProps) {
  return (
    <div
      onClick={onClick}
      className={`h-full min-h-0 flex flex-col bg-zinc-900 overflow-hidden ${
        isActive ? 'ring-1 ring-blue-500' : ''
      }`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full ${
              session.isStreaming ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'
            }`}
          />
          <span className="text-sm text-white truncate">{session.podName}</span>
          <span className="text-xs text-zinc-500">/ {session.containerName}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-zinc-700 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Log Content */}
      <div className="flex-1 min-h-0">
        <LogViewer session={session} isActive={isActive} />
      </div>
    </div>
  );
}
