import { useEffect } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useSelectorStore } from '../../stores/selectorStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { WorkloadSelector } from './WorkloadSelector';

interface SelectorBarProps {
  onStartLog: () => void;
}

export function SelectorBar({ onStartLog }: SelectorBarProps) {
  const { connections, selectedConnectionId, selectConnection } = useConnectionStore();
  const {
    namespaces,
    selectedNamespace,
    isLoadingNamespaces,
    pods,
    selectedPod,
    isLoadingPods,
    containers,
    selectedContainer,
    startTime,
    endTime,
    isFollowing,
    loadNamespaces,
    selectNamespace,
    loadPods,
    selectPod,
    loadContainers,
    selectContainer,
    setTimeRange,
    setFollowing,
  } = useSelectorStore();
  const { selectorBarCollapsed, toggleSelectorBar } = useSettingsStore();

  // Load namespaces when connection changes
  useEffect(() => {
    if (selectedConnectionId) {
      loadNamespaces(selectedConnectionId);
    }
  }, [selectedConnectionId, loadNamespaces]);

  // Load pods when namespace changes
  useEffect(() => {
    if (selectedConnectionId && selectedNamespace) {
      loadPods(selectedConnectionId, selectedNamespace);
    }
  }, [selectedConnectionId, selectedNamespace, loadPods]);

  // Load containers when pod changes
  useEffect(() => {
    if (selectedConnectionId && selectedNamespace && selectedPod) {
      loadContainers(selectedConnectionId, selectedNamespace, selectedPod);
    }
  }, [selectedConnectionId, selectedNamespace, selectedPod, loadContainers]);

  const canStartLog = selectedConnectionId && selectedNamespace && selectedPod && selectedContainer;

  const selectClass = "px-3 py-1.5 rounded-md text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50";
  const labelClass = "text-sm whitespace-nowrap";

  return (
    <div className="border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      {/* Toggle Button Bar */}
      <div
        className="flex items-center justify-between px-4 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={toggleSelectorBar}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${selectorBarCollapsed ? '' : 'rotate-90'}`}
            style={{ color: 'var(--text-secondary)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            셀렉터 {selectorBarCollapsed ? '펼치기' : '접기'}
          </span>
          {selectorBarCollapsed && selectedPod && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              {selectedPod} / {selectedContainer || '-'}
            </span>
          )}
        </div>
        {selectorBarCollapsed && canStartLog && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartLog();
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            조회
          </button>
        )}
      </div>

      {/* Collapsible Content */}
      <div className={`overflow-hidden transition-all duration-200 ${selectorBarCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        <div className="p-4 pt-2 space-y-3">
      {/* Row 1: Basic Selectors */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Connection */}
        <div className="flex items-center gap-2">
          <span className={labelClass} style={{ color: 'var(--text-secondary)' }}>연결</span>
          <select
            value={selectedConnectionId || ''}
            onChange={(e) => selectConnection(e.target.value || null)}
            className={`${selectClass} min-w-[180px]`}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
          >
            <option value="">전체</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name}
              </option>
            ))}
          </select>
        </div>

        {/* Namespace */}
        <div className="flex items-center gap-2">
          <span className={labelClass} style={{ color: 'var(--text-secondary)' }}>Namespace</span>
          <select
            value={selectedNamespace || ''}
            onChange={(e) => selectNamespace(e.target.value || null)}
            disabled={!selectedConnectionId || isLoadingNamespaces}
            className={`${selectClass} min-w-[180px]`}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
          >
            <option value="">전체</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
        </div>

        {/* Pod */}
        <div className="flex items-center gap-2">
          <span className={labelClass} style={{ color: 'var(--text-secondary)' }}>Pod</span>
          <select
            value={selectedPod || ''}
            onChange={(e) => selectPod(e.target.value || null)}
            disabled={!selectedNamespace || isLoadingPods}
            className={`${selectClass} min-w-[200px]`}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
          >
            <option value="">전체</option>
            {pods.map((pod) => (
              <option key={pod.name} value={pod.name}>
                {pod.name} ({pod.status})
              </option>
            ))}
          </select>
        </div>

        {/* Container */}
        <div className="flex items-center gap-2">
          <span className={labelClass} style={{ color: 'var(--text-secondary)' }}>Container</span>
          <select
            value={selectedContainer || ''}
            onChange={(e) => selectContainer(e.target.value || null)}
            disabled={!selectedPod || containers.length === 0}
            className={`${selectClass} min-w-[150px]`}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
          >
            <option value="">전체</option>
            {containers.map((container) => (
              <option key={container} value={container}>
                {container}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Workload Selectors */}
      {selectedConnectionId && selectedNamespace && (
        <WorkloadSelector
          connectionId={selectedConnectionId}
          namespace={selectedNamespace}
        />
      )}

      {/* Row 3: Time Range & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-4">
          {/* Start Time */}
          <div className="flex items-center gap-2">
            <span className={labelClass} style={{ color: 'var(--text-secondary)' }}>시작</span>
            <input
              type="datetime-local"
              value={startTime || ''}
              onChange={(e) => setTimeRange(e.target.value || null, endTime)}
              disabled={isFollowing}
              className={selectClass}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            />
          </div>

          {/* End Time */}
          <div className="flex items-center gap-2">
            <span className={labelClass} style={{ color: 'var(--text-secondary)' }}>종료</span>
            <input
              type="datetime-local"
              value={endTime || ''}
              onChange={(e) => setTimeRange(startTime, e.target.value || null)}
              disabled={isFollowing}
              className={selectClass}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Follow Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Follow</span>
            <button
              onClick={() => setFollowing(!isFollowing)}
              className={`w-10 h-5 rounded-full transition-colors ${
                isFollowing ? 'bg-green-600' : ''
              }`}
              style={{ backgroundColor: isFollowing ? undefined : 'var(--bg-tertiary)' }}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full transition-transform ${
                  isFollowing ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* Start Log Button */}
          <button
            onClick={onStartLog}
            disabled={!canStartLog}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            조회
          </button>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
