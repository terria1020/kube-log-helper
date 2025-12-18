import { useEffect, useRef, useState } from 'react';
import type { LogSession } from '../../types';
import { useLogStore } from '../../stores/logStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface ParsedLogLine {
  raw: string;
  timestamp?: string;
  timestampEnd?: number;
  isError?: boolean;
}

interface LogViewerProps {
  session: LogSession;
  isActive: boolean;
}

// Parse and apply grep pipeline filter
function parseGrepPipeline(filter: string): Array<{ pattern: RegExp; exclude: boolean }> {
  if (!filter.trim()) return [];

  const filters: Array<{ pattern: RegExp; exclude: boolean }> = [];

  // Split by pipe
  const parts = filter.split('|').map(p => p.trim());

  for (const part of parts) {
    if (!part) continue;

    // Match: grep "pattern" or grep -v "pattern" or grep 'pattern' or grep pattern
    const grepMatch = part.match(/^grep\s+(-v\s+)?(?:"([^"]+)"|'([^']+)'|(\S+))$/i);
    if (grepMatch) {
      const exclude = !!grepMatch[1];
      const pattern = grepMatch[2] || grepMatch[3] || grepMatch[4];
      try {
        filters.push({ pattern: new RegExp(pattern, 'i'), exclude });
      } catch {
        // Invalid regex, treat as literal string
        filters.push({ pattern: new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), exclude });
      }
    }
  }

  return filters;
}

function applyGrepFilter(line: string, filters: Array<{ pattern: RegExp; exclude: boolean }>): boolean {
  if (filters.length === 0) return true;

  for (const filter of filters) {
    const matches = filter.pattern.test(line);
    if (filter.exclude && matches) return false; // grep -v: exclude if matches
    if (!filter.exclude && !matches) return false; // grep: include only if matches
  }

  return true;
}

// Parse log line to extract timestamp and detect errors
function parseLogLine(line: string): ParsedLogLine {
  // ISO 8601 pattern
  const isoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/;
  // Simple datetime pattern
  const simplePattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)/;
  // Bracketed pattern
  const bracketPattern = /^(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?\])/;

  for (const pattern of [isoPattern, simplePattern, bracketPattern]) {
    const match = line.match(pattern);
    if (match) {
      return {
        raw: line,
        timestamp: match[1],
        timestampEnd: match[1].length,
      };
    }
  }

  // Check for error indicators
  const isError = /error|exception|fail|fatal/i.test(line);

  return { raw: line, isError };
}

// Render URLs as clickable links
function renderLineWithLinks(text: string): React.ReactNode[] {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);

  return parts.map((part, i) => {
    if (urlPattern.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="log-link"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function LogViewer({ session, isActive }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logLinesRef = useRef<ParsedLogLine[]>([]);
  const [displayLines, setDisplayLines] = useState<ParsedLogLine[]>([]);
  const isAtBottomRef = useRef(true);
  const filterTimerRef = useRef<number | null>(null);
  const pendingLinesRef = useRef<ParsedLogLine[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const { grepFilter } = useLogStore();
  const theme = useSettingsStore((state) => state.theme);
  const grepFiltersRef = useRef<Array<{ pattern: RegExp; exclude: boolean }>>([]);

  // Update grep filters when filter changes
  useEffect(() => {
    grepFiltersRef.current = parseGrepPipeline(grepFilter);
  }, [grepFilter]);

  // Apply filter and update display
  const applyFilterAndUpdate = () => {
    if (filterTimerRef.current) {
      clearTimeout(filterTimerRef.current);
    }

    filterTimerRef.current = window.setTimeout(() => {
      const filters = grepFiltersRef.current;
      const filtered = logLinesRef.current.filter(line =>
        applyGrepFilter(line.raw, filters)
      );
      setDisplayLines(filtered);
    }, 100);
  };

  // Re-filter when grep filter changes
  useEffect(() => {
    applyFilterAndUpdate();
  }, [grepFilter]);

  // Batch log updates using RAF
  const scheduleBatchUpdate = () => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        logLinesRef.current.push(...pendingLinesRef.current);

        // Limit buffer to 50,000 lines
        if (logLinesRef.current.length > 50000) {
          logLinesRef.current = logLinesRef.current.slice(-50000);
        }

        pendingLinesRef.current = [];
        applyFilterAndUpdate();
        rafIdRef.current = null;
      });
    }
  };

  // Listen for log data
  useEffect(() => {
    const unsubscribeData = window.electronAPI.onLogData((data) => {
      if (data.sessionId === session.id) {
        const lines = data.data.split('\n').filter(l => l.trim());
        const parsed = lines.map(parseLogLine);
        pendingLinesRef.current.push(...parsed);
        scheduleBatchUpdate();
      }
    });

    const unsubscribeError = window.electronAPI.onLogError((data) => {
      if (data.sessionId === session.id) {
        const errorLine: ParsedLogLine = {
          raw: `[ERROR] ${data.error}`,
          isError: true,
        };
        pendingLinesRef.current.push(errorLine);
        scheduleBatchUpdate();
      }
    });

    return () => {
      unsubscribeData();
      unsubscribeError();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (filterTimerRef.current !== null) {
        clearTimeout(filterTimerRef.current);
      }
    };
  }, [session.id]);

  // Auto-scroll when new lines arrive and user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayLines.length]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollBottom = scrollTop + clientHeight;

    // Consider "at bottom" if within 50px of bottom
    isAtBottomRef.current = scrollHeight - scrollBottom < 50;
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 log-viewer ${isActive ? '' : 'opacity-90'}`}
      style={{
        padding: '8px',
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: `${session.fontSize}px`,
      }}
      onScroll={handleScroll}
    >
      {displayLines.map((line, index) => {
        const content = line.timestampEnd
          ? line.raw.substring(line.timestampEnd)
          : line.raw;

        return (
          <div
            key={index}
            className={`log-line ${theme === 'dark' ? 'log-line-dark' : 'log-line-light'}`}
          >
            {line.timestamp && (
              <span className="log-timestamp">{line.timestamp}</span>
            )}
            <span className={line.isError ? 'log-error' : ''}>
              {renderLineWithLinks(content)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
