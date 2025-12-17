// Timestamp patterns for highlighting
const TIMESTAMP_PATTERNS = [
  // ISO 8601 with optional milliseconds and timezone
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?/g,
  // Bracketed timestamp
  /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?\]/g,
  // Apache/Nginx style
  /\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}/g,
  // Simple datetime
  /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g,
];

export interface HighlightedSegment {
  text: string;
  isTimestamp: boolean;
}

export function parseTimestamps(line: string): HighlightedSegment[] {
  const segments: HighlightedSegment[] = [];
  let lastIndex = 0;
  let matchFound = false;

  for (const pattern of TIMESTAMP_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    const match = pattern.exec(line);
    if (match && match.index === 0) {
      segments.push({
        text: match[0],
        isTimestamp: true,
      });
      lastIndex = match[0].length;
      matchFound = true;
      break;
    }
  }

  if (lastIndex < line.length) {
    segments.push({
      text: line.substring(lastIndex),
      isTimestamp: false,
    });
  }

  if (!matchFound && segments.length === 0) {
    segments.push({
      text: line,
      isTimestamp: false,
    });
  }

  return segments;
}

export function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

export function parseLogTimestamp(line: string): Date | null {
  for (const pattern of TIMESTAMP_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (match) {
      const timestamp = match[0].replace(/[\[\]]/g, '');
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return null;
}
