import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import type { ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { LogSession } from '../../types';
import { useLogStore } from '../../stores/logStore';
import { useSettingsStore } from '../../stores/settingsStore';

const darkTheme: ITheme = {
  background: '#1a1a1a',
  foreground: '#e4e4e7',
  cursor: '#e4e4e7',
  cursorAccent: '#1a1a1a',
  selectionBackground: '#3b82f680',
  black: '#27272a',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#e4e4e7',
  brightBlack: '#52525b',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#fafafa',
};

const lightTheme: ITheme = {
  background: '#ffffff',
  foreground: '#18181b',
  cursor: '#18181b',
  cursorAccent: '#ffffff',
  selectionBackground: '#3b82f640',
  black: '#18181b',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#f4f4f5',
  brightBlack: '#71717a',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#fafafa',
};

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

export function LogViewer({ session, isActive }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { grepFilter } = useLogStore();
  const theme = useSettingsStore((state) => state.theme);
  const grepFiltersRef = useRef<Array<{ pattern: RegExp; exclude: boolean }>>([]);

  // Buffer for batched writes
  const logBufferRef = useRef<string[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);

  // Update grep filters when filter changes
  useEffect(() => {
    grepFiltersRef.current = parseGrepPipeline(grepFilter);
  }, [grepFilter]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: theme === 'dark' ? darkTheme : lightTheme,
      fontSize: session.fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: false,
      cursorStyle: 'bar',
      scrollback: 50000,
      convertEol: true,
      disableStdin: true,
      overviewRulerWidth: 10,
      fastScrollSensitivity: 5,
      scrollSensitivity: 3,
      smoothScrollDuration: 0,
      allowProposedApi: true,
      scrollOnUserInput: false,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Track user scroll position
    terminal.onScroll(() => {
      const buffer = terminal.buffer.active;
      const viewport = buffer.viewportY;
      const baseY = buffer.baseY;
      const rows = terminal.rows;

      // User is at bottom if viewport is showing the last rows
      isAtBottomRef.current = viewport + rows >= baseY + rows;
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, []);

  // Update font size
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.fontSize = session.fontSize;
      fitAddonRef.current?.fit();
    }
  }, [session.fontSize]);

  // Update terminal theme
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = theme === 'dark' ? darkTheme : lightTheme;
    }
  }, [theme]);

  // Flush buffered logs to terminal (batched for performance)
  const flushLogs = () => {
    if (!terminalRef.current || logBufferRef.current.length === 0) {
      rafIdRef.current = null;
      return;
    }

    // Write all buffered lines at once
    const output = logBufferRef.current.join('\r\n') + '\r\n';
    logBufferRef.current = [];

    // Only auto-scroll if user is at bottom
    const shouldScroll = isAtBottomRef.current;
    terminalRef.current.write(output, () => {
      if (shouldScroll && terminalRef.current) {
        terminalRef.current.scrollToBottom();
      }
    });

    rafIdRef.current = null;
  };

  // Schedule a flush on next animation frame
  const scheduleFlush = () => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushLogs);
    }
  };

  // Listen for log data
  useEffect(() => {
    const unsubscribeData = window.electronAPI.onLogData((data) => {
      if (data.sessionId === session.id && terminalRef.current) {
        // Process and buffer lines
        const lines = data.data.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            // Apply grep filter
            if (!applyGrepFilter(line, grepFiltersRef.current)) {
              continue;
            }
            const highlightedLine = highlightTimestamp(line);
            logBufferRef.current.push(highlightedLine);
          }
        }
        // Schedule batched write
        scheduleFlush();
      }
    });

    const unsubscribeError = window.electronAPI.onLogError((data) => {
      if (data.sessionId === session.id && terminalRef.current) {
        logBufferRef.current.push(`\x1b[31m[ERROR] ${data.error}\x1b[0m`);
        scheduleFlush();
      }
    });

    return () => {
      unsubscribeData();
      unsubscribeError();
      // Cancel pending flush
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [session.id]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${isActive ? '' : 'opacity-90'}`}
      style={{ padding: '8px' }}
    />
  );
}

// Timestamp highlighting with ANSI colors
function highlightTimestamp(line: string): string {
  // ISO 8601 pattern
  const isoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/;
  // Simple datetime pattern
  const simplePattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)/;
  // Bracketed pattern
  const bracketPattern = /^(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?\])/;

  for (const pattern of [isoPattern, simplePattern, bracketPattern]) {
    const match = line.match(pattern);
    if (match) {
      const timestamp = match[1];
      const rest = line.substring(timestamp.length);
      // Cyan color for timestamp
      return `\x1b[36m${timestamp}\x1b[0m${rest}`;
    }
  }

  return line;
}
