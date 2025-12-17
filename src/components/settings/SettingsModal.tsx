import { useSettingsStore } from '../../stores/settingsStore';
import type { Theme } from '../../stores/settingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, tlsInsecure, setTlsInsecure } = useSettingsStore();

  if (!isOpen) return null;

  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'dark', label: '다크 모드', icon: '🌙' },
    { value: 'light', label: '라이트 모드', icon: '☀️' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="rounded-lg w-[400px] shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>설정</h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              테마
            </label>
            <div className="flex gap-2">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    theme === option.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : ''
                  }`}
                  style={theme !== option.value ? { borderColor: 'var(--border-light)', color: 'var(--text-secondary)' } : undefined}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TLS Insecure Toggle */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              TLS 인증서 검증
            </label>
            <div
              className="flex items-center justify-between p-3 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-input)' }}
              onClick={() => setTlsInsecure(!tlsInsecure)}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  TLS 검증 무시
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  자체 서명 인증서 사용 시 활성화
                </span>
              </div>
              <button
                type="button"
                className={`w-12 h-6 rounded-full transition-colors ${
                  tlsInsecure ? 'bg-orange-500' : ''
                }`}
                style={{ backgroundColor: tlsInsecure ? undefined : 'var(--bg-tertiary)' }}
              >
                <span
                  className={`block w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    tlsInsecure ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {tlsInsecure && (
              <p className="mt-2 text-xs text-orange-400">
                경고: TLS 검증을 무시하면 보안에 취약해질 수 있습니다.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
