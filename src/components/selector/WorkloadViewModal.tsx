import { useEffect, useState } from 'react';
import { useLogStore } from '../../stores/logStore';
import { useSelectorStore } from '../../stores/selectorStore';
import type { PodInfo, WorkloadType } from '../../types';

interface WorkloadViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  namespace: string;
  workloadType: WorkloadType;
  workloadName: string;
  labelSelector?: string;
}

export function WorkloadViewModal({
  isOpen,
  onClose,
  connectionId,
  namespace,
  workloadType,
  workloadName,
  labelSelector,
}: WorkloadViewModalProps) {
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [selectedPods, setSelectedPods] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const { addSession } = useLogStore();
  const { isFollowing, startTime } = useSelectorStore();

  useEffect(() => {
    if (isOpen) {
      loadPods();
    }
  }, [isOpen, connectionId, namespace, workloadType, workloadName, labelSelector]);

  const loadPods = async () => {
    setIsLoading(true);
    try {
      let fetchedPods: PodInfo[];
      if (workloadType === 'label' && labelSelector) {
        fetchedPods = await window.electronAPI.getPodsByLabel(connectionId, namespace, labelSelector);
      } else if (workloadType !== 'label') {
        fetchedPods = await window.electronAPI.getPodsByWorkload(
          connectionId,
          namespace,
          workloadType,
          workloadName
        );
      } else {
        fetchedPods = [];
      }
      setPods(fetchedPods);
      setSelectedPods(new Set(fetchedPods.map((p) => p.name)));
    } catch (error) {
      console.error('Failed to load pods:', error);
      setPods([]);
    }
    setIsLoading(false);
  };

  const togglePod = (podName: string) => {
    setSelectedPods((prev) => {
      const next = new Set(prev);
      if (next.has(podName)) {
        next.delete(podName);
      } else {
        next.add(podName);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPods.size === pods.length) {
      setSelectedPods(new Set());
    } else {
      setSelectedPods(new Set(pods.map((p) => p.name)));
    }
  };

  const handleViewLogs = async () => {
    const selectedPodList = pods.filter((p) => selectedPods.has(p.name));

    if (selectedPodList.length === 0) return;

    // Create sessions for each selected pod
    for (const pod of selectedPodList) {
      const container = pod.containers[0]; // Use first container
      if (!container) continue;

      const sessionId = addSession({
        connectionId,
        namespace,
        podName: pod.name,
        containerName: container,
      });

      // Start log stream
      await window.electronAPI.startLogStream({
        sessionId,
        connectionId,
        namespace,
        podName: pod.name,
        containerName: container,
        follow: isFollowing,
        sinceTime: startTime || undefined,
        tailLines: 100,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  const typeLabel = {
    deployment: 'Deployment',
    statefulset: 'StatefulSet',
    daemonset: 'DaemonSet',
    label: 'Label',
  }[workloadType];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-lg w-[500px] max-h-[80vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">
            {typeLabel} 선택: {workloadName}
          </h2>
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
          {/* Pod List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-300">
                해당 {typeLabel}의 Pod 목록 ({pods.length}개)
              </span>
              <button
                onClick={toggleAll}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {selectedPods.size === pods.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="bg-zinc-900 rounded-md border border-zinc-700 max-h-[200px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-zinc-400">로딩 중...</div>
              ) : pods.length === 0 ? (
                <div className="p-4 text-center text-zinc-400">Pod가 없습니다</div>
              ) : (
                pods.map((pod) => (
                  <label
                    key={pod.name}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 cursor-pointer border-b border-zinc-700 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPods.has(pod.name)}
                      onChange={() => togglePod(pod.name)}
                      className="rounded border-zinc-600 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white flex-1 truncate">{pod.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      pod.status === 'Running' ? 'bg-green-900/50 text-green-400' :
                      pod.status === 'Pending' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {pod.status}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-300 hover:bg-zinc-700 rounded-md transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleViewLogs}
            disabled={selectedPods.size === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            로그 보기
          </button>
        </div>
      </div>
    </div>
  );
}
