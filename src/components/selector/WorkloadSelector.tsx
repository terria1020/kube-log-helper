import { useEffect, useState } from 'react';
import { useSelectorStore } from '../../stores/selectorStore';
import { WorkloadViewModal } from './WorkloadViewModal';
import type { WorkloadType } from '../../types';

interface WorkloadSelectorProps {
  connectionId: string;
  namespace: string;
}

export function WorkloadSelector({ connectionId, namespace }: WorkloadSelectorProps) {
  const {
    deployments,
    statefulSets,
    daemonSets,
    labels,
    isLoadingWorkloads,
    loadWorkloads,
  } = useSelectorStore();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: WorkloadType;
    name: string;
    selector?: string;
  }>({ isOpen: false, type: 'deployment', name: '' });

  useEffect(() => {
    loadWorkloads(connectionId, namespace);
  }, [connectionId, namespace, loadWorkloads]);

  const handleWorkloadSelect = (type: WorkloadType, value: string) => {
    if (!value) return;

    if (type === 'label') {
      setModalState({ isOpen: true, type, name: value, selector: value });
    } else {
      setModalState({ isOpen: true, type, name: value });
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 py-2 border-t border-b border-zinc-700/50">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">워크로드 셀렉터</span>

        {/* Label Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 whitespace-nowrap">Label</span>
          <select
            onChange={(e) => handleWorkloadSelect('label', e.target.value)}
            disabled={isLoadingWorkloads || labels.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded-md text-white text-sm min-w-[150px] focus:outline-none focus:border-blue-500 disabled:opacity-50"
            value=""
          >
            <option value="">선택...</option>
            {labels.map((label) => (
              <option key={`${label.key}=${label.value}`} value={`${label.key}=${label.value}`}>
                {label.key}={label.value} ({label.podCount})
              </option>
            ))}
          </select>
        </div>

        {/* StatefulSet Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 whitespace-nowrap">StatefulSet</span>
          <select
            onChange={(e) => handleWorkloadSelect('statefulset', e.target.value)}
            disabled={isLoadingWorkloads || statefulSets.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded-md text-white text-sm min-w-[150px] focus:outline-none focus:border-blue-500 disabled:opacity-50"
            value=""
          >
            <option value="">선택...</option>
            {statefulSets.map((sts) => (
              <option key={sts.name} value={sts.name}>
                {sts.name} ({sts.readyReplicas}/{sts.replicas})
              </option>
            ))}
          </select>
        </div>

        {/* Deployment Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 whitespace-nowrap">Deployment</span>
          <select
            onChange={(e) => handleWorkloadSelect('deployment', e.target.value)}
            disabled={isLoadingWorkloads || deployments.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded-md text-white text-sm min-w-[150px] focus:outline-none focus:border-blue-500 disabled:opacity-50"
            value=""
          >
            <option value="">선택...</option>
            {deployments.map((dep) => (
              <option key={dep.name} value={dep.name}>
                {dep.name} ({dep.readyReplicas}/{dep.replicas})
              </option>
            ))}
          </select>
        </div>

        {/* DaemonSet Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 whitespace-nowrap">DaemonSet</span>
          <select
            onChange={(e) => handleWorkloadSelect('daemonset', e.target.value)}
            disabled={isLoadingWorkloads || daemonSets.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded-md text-white text-sm min-w-[150px] focus:outline-none focus:border-blue-500 disabled:opacity-50"
            value=""
          >
            <option value="">선택...</option>
            {daemonSets.map((ds) => (
              <option key={ds.name} value={ds.name}>
                {ds.name} ({ds.readyReplicas}/{ds.replicas})
              </option>
            ))}
          </select>
        </div>
      </div>

      <WorkloadViewModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        connectionId={connectionId}
        namespace={namespace}
        workloadType={modalState.type}
        workloadName={modalState.name}
        labelSelector={modalState.selector}
      />
    </>
  );
}
