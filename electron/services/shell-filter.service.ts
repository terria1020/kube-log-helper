import { spawn, ChildProcess } from 'child_process';
import { Writable } from 'stream';

interface FilterSession {
  process: ChildProcess;
  stdin: Writable;
  isAlive: boolean;
}

class ShellFilterService {
  private filters: Map<string, FilterSession> = new Map();

  private allowedCommands = [
    'grep', 'awk', 'sed', 'cut', 'sort', 'uniq',
    'head', 'tail', 'jq', 'tr', 'wc', 'cat'
  ];

  startFilter(
    sessionId: string,
    command: string,
    onData: (data: string) => void,
    onError: (error: string) => void
  ): { success: boolean; error?: string } {
    this.stopFilter(sessionId);

    if (!command.trim()) {
      return { success: false, error: '명령어가 비어있습니다' };
    }

    const validation = this.validateCommand(command);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const proc = spawn('sh', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      proc.stdout?.on('data', (chunk: Buffer) => {
        onData(chunk.toString());
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        onError(chunk.toString());
      });

      proc.on('error', (err) => {
        onError(err.message);
        this.filters.delete(sessionId);
      });

      proc.on('exit', (code) => {
        const filter = this.filters.get(sessionId);
        if (filter) {
          filter.isAlive = false;
        }
        if (code !== 0 && code !== null) {
          onError(`프로세스 종료 (코드: ${code})`);
        }
      });

      this.filters.set(sessionId, {
        process: proc,
        stdin: proc.stdin!,
        isAlive: true
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  writeToFilter(sessionId: string, data: string): boolean {
    const filter = this.filters.get(sessionId);
    if (!filter || !filter.isAlive) {
      return false;
    }

    try {
      filter.stdin.write(data);
      return true;
    } catch {
      return false;
    }
  }

  stopFilter(sessionId: string): void {
    const filter = this.filters.get(sessionId);
    if (filter) {
      filter.isAlive = false;
      try {
        filter.stdin.end();
        filter.process.kill();
      } catch {
        // ignore
      }
      this.filters.delete(sessionId);
    }
  }

  stopAllFilters(): void {
    for (const sessionId of this.filters.keys()) {
      this.stopFilter(sessionId);
    }
  }

  private validateCommand(command: string): { valid: boolean; error?: string } {
    const parts = command.split('|').map(p => p.trim());

    for (const part of parts) {
      if (!part) continue;

      const cmd = part.split(/\s+/)[0];

      if (!this.allowedCommands.includes(cmd)) {
        return { valid: false, error: `허용되지 않은 명령어: ${cmd}` };
      }

      const dangerCheck = this.containsDangerousPatterns(part);
      if (dangerCheck) {
        return { valid: false, error: dangerCheck };
      }
    }

    return { valid: true };
  }

  private containsDangerousPatterns(cmd: string): string | null {
    const patterns: [RegExp, string][] = [
      [/[;&`]/, '명령 체이닝 문자 사용 불가'],
      [/\$\(/, '서브쉘 사용 불가'],
      [/>\s*[^|]/, '출력 리다이렉션 사용 불가'],
      [/</, '입력 리다이렉션 사용 불가'],
      [/\brm\b/, 'rm 명령 사용 불가'],
      [/\bmv\b/, 'mv 명령 사용 불가'],
      [/\bcp\b/, 'cp 명령 사용 불가'],
      [/\/dev\//, '디바이스 접근 불가'],
      [/\.\.\//, '상위 디렉토리 접근 불가'],
    ];

    for (const [pattern, message] of patterns) {
      if (pattern.test(cmd)) {
        return message;
      }
    }

    return null;
  }
}

export const shellFilterService = new ShellFilterService();
