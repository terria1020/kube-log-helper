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
  const pendingLinesRef = useRef<ParsedLogLine[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const pendingFilterLinesRef = useRef<ParsedLogLine[]>([]);
  const filterRafIdRef = useRef<number | null>(null);

  const { clearLogsTrigger, isFilterActive, setFilterError } = useLogStore();
  const filterActive = isFilterActive(session.id);
  const theme = useSettingsStore((state) => state.theme);

  // Clear logs when clearLogsTrigger changes
  useEffect(() => {
    if (clearLogsTrigger > 0) {
      logLinesRef.current = [];
      pendingLinesRef.current = [];
      pendingFilterLinesRef.current = [];
      setDisplayLines([]);
    }
  }, [clearLogsTrigger]);

  // Update display based on filter state
  const updateDisplay = () => {
    if (!filterActive) {
      setDisplayLines([...logLinesRef.current]);
    }
  };

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
        updateDisplay();
        rafIdRef.current = null;
      });
    }
  };

  // Batch filter result updates
  const scheduleFilterUpdate = () => {
    if (filterRafIdRef.current === null) {
      filterRafIdRef.current = requestAnimationFrame(() => {
        setDisplayLines(prev => {
          const newLines = [...prev, ...pendingFilterLinesRef.current];
          // Limit display lines
          return newLines.length > 10000 ? newLines.slice(-10000) : newLines;
        });
        pendingFilterLinesRef.current = [];
        filterRafIdRef.current = null;
      });
    }
  };

  // Listen for log data
  useEffect(() => {
    const unsubscribeData = window.electronAPI.onLogData((data) => {
      if (data.sessionId === session.id) {
        const lines = data.data.split('\n').filter(l => l.trim());
        const parsed = lines.map(parseLogLine);

        // Always store in buffer
        pendingLinesRef.current.push(...parsed);
        scheduleBatchUpdate();

        // If filter is active, send to shell filter
        if (filterActive) {
          window.electronAPI.writeToFilter(session.id, data.data);
        }
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
    };
  }, [session.id, filterActive]);

  // Listen for shell filter results
  useEffect(() => {
    const unsubscribeFilterData = window.electronAPI.onFilterData((data) => {
      if (data.sessionId === session.id && filterActive) {
        const lines = data.data.split('\n').filter(l => l.trim());
        const parsed = lines.map(parseLogLine);
        pendingFilterLinesRef.current.push(...parsed);
        scheduleFilterUpdate();
      }
    });

    const unsubscribeFilterError = window.electronAPI.onFilterError((data) => {
      if (data.sessionId === session.id) {
        setFilterError(session.id, data.error);
      }
    });

    return () => {
      unsubscribeFilterData();
      unsubscribeFilterError();
      if (filterRafIdRef.current !== null) {
        cancelAnimationFrame(filterRafIdRef.current);
      }
    };
  }, [session.id, filterActive, setFilterError]);

  // Clear filtered display when filter becomes active
  useEffect(() => {
    if (filterActive) {
      setDisplayLines([]);
      pendingFilterLinesRef.current = [];
    } else {
      // When filter is deactivated, show original buffer
      setDisplayLines([...logLinesRef.current]);
    }
  }, [filterActive]);

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
