import { useState } from 'react';
import { useLogStore } from '../../stores/logStore';
import type { ViewMode } from '../../types';

export function LogToolbar() {
  const { viewMode, setViewMode, globalFontSize, setGlobalFontSize, grepFilter, setGrepFilter, sessions, stopAllSessions } = useLogStore();
  const [filterInput, setFilterInput] = useState(grepFilter);
  const [isStopping, setIsStopping] = useState(false);

  const handleStopAll = async () => {
    setIsStopping(true);
    await stopAllSessions();
    setIsStopping(false);
  };

  const viewModeOptions: { value: ViewMode; label: string }[] = [
    { value: 'single', label: '단일' },
    { value: 'split-h', label: '2분할' },
    { value: 'quad', label: '4분할' },
  ];

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(8, Math.min(24, globalFontSize + delta));
    setGlobalFontSize(newSize);
  };

  const handleFilterApply = () => {
    setGrepFilter(filterInput);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFilterApply();
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-3">
        {/* View Mode */}
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="px-3 py-1.5 rounded-md text-sm focus:outline-none focus:border-blue-500"
          style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
        >
          {viewModeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Grep Filter */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={handleFilterKeyDown}
            placeholder='grep "패턴" | grep -v "제외"'
            className="w-64 px-3 py-1.5 rounded-md text-sm focus:outline-none focus:border-blue-500 font-mono"
            style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleFilterApply}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
            title="필터 적용"
          >
            적용
          </button>
          {grepFilter && (
            <button
              onClick={() => { setFilterInput(''); setGrepFilter(''); }}
              className="px-2 py-1.5 text-sm rounded-md transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              title="필터 초기화"
            >
              ✕
            </button>
          )}
        </div>

        {/* Stop All Streams */}
        {sessions.length > 0 && (
          <button
            onClick={handleStopAll}
            disabled={isStopping}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors disabled:opacity-50"
            title="모든 로그 스트림 중지"
          >
            {isStopping ? '중지 중...' : '⏹ 전체 중지'}
          </button>
        )}

      </div>

      <div className="flex items-center gap-2">
        {/* Font Size Controls */}
        <button
          onClick={() => handleFontSizeChange(-2)}
          className="px-2 py-1 text-sm rounded transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          title="글자 크기 줄이기"
        >
          A-
        </button>
        <span className="text-sm w-8 text-center" style={{ color: 'var(--text-secondary)' }}>{globalFontSize}</span>
        <button
          onClick={() => handleFontSizeChange(2)}
          className="px-2 py-1 text-sm rounded transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          title="글자 크기 키우기"
        >
          A+
        </button>
      </div>
    </div>
  );
}
