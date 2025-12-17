import { useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import type { ConnectionConfig } from '../../types';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const { addConnection, testConnection } = useConnectionStore();
  const [isSSHEnabled, setIsSSHEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sshHost: '',
    sshPort: '22',
    sshUsername: '',
    sshPrivateKeyPath: '',
    kubeconfig: '',
  });

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const buildConfig = (): ConnectionConfig => {
    const config: ConnectionConfig = {
      name: formData.name,
      kubeconfig: formData.kubeconfig,
    };

    if (isSSHEnabled) {
      config.ssh = {
        host: formData.sshHost,
        port: parseInt(formData.sshPort, 10),
        username: formData.sshUsername,
        privateKeyPath: formData.sshPrivateKeyPath,
      };
    }

    return config;
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(buildConfig());
      setTestResult(result);
    } catch (error) {
      setTestResult(false);
    }
    setIsTesting(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addConnection(buildConfig());
      onClose();
      setFormData({
        name: '',
        sshHost: '',
        sshPort: '22',
        sshUsername: '',
        sshPrivateKeyPath: '',
        kubeconfig: '',
      });
      setIsSSHEnabled(false);
      setTestResult(null);
    } catch (error) {
      console.error('Failed to add connection:', error);
    }
    setIsSubmitting(false);
  };

  const isValid = formData.name && formData.kubeconfig &&
    (!isSSHEnabled || (formData.sshHost && formData.sshUsername && formData.sshPrivateKeyPath));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-lg w-[600px] max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">연결 추가</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Connection Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">연결 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="production-cluster"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* SSH Jump Settings */}
          <div className="border-t border-zinc-700 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isSSHEnabled}
                onChange={(e) => setIsSSHEnabled(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-900 text-blue-600 focus:ring-blue-500"
              />
              SSH Jump 설정
            </label>

            {isSSHEnabled && (
              <div className="space-y-3 pl-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">호스트</label>
                    <input
                      type="text"
                      value={formData.sshHost}
                      onChange={(e) => handleInputChange('sshHost', e.target.value)}
                      placeholder="bastion.example.com"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">포트</label>
                    <input
                      type="text"
                      value={formData.sshPort}
                      onChange={(e) => handleInputChange('sshPort', e.target.value)}
                      placeholder="22"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">사용자명</label>
                  <input
                    type="text"
                    value={formData.sshUsername}
                    onChange={(e) => handleInputChange('sshUsername', e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">SSH 키 파일 경로</label>
                  <input
                    type="text"
                    value={formData.sshPrivateKeyPath}
                    onChange={(e) => handleInputChange('sshPrivateKeyPath', e.target.value)}
                    placeholder="~/.ssh/id_rsa"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Kubeconfig */}
          <div className="border-t border-zinc-700 pt-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">kubeconfig</label>
            <textarea
              value={formData.kubeconfig}
              onChange={(e) => handleInputChange('kubeconfig', e.target.value)}
              placeholder="apiVersion: v1
clusters:
- cluster:
    server: https://..."
              rows={10}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
          </div>

          {/* Test Result */}
          {testResult !== null && (
            <div className={`p-3 rounded-md ${testResult ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {testResult ? '연결 테스트 성공!' : '연결 테스트 실패. 설정을 확인해주세요.'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-300 hover:bg-zinc-700 rounded-md transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleTest}
            disabled={!isValid || isTesting}
            className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? '테스트 중...' : '연결 테스트'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
