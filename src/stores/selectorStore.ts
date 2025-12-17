import { create } from 'zustand';
import type { PodInfo, WorkloadInfo, LabelInfo } from '../types';

interface SelectorState {
  // Namespaces
  namespaces: string[];
  selectedNamespace: string | null;
  isLoadingNamespaces: boolean;

  // Pods
  pods: PodInfo[];
  selectedPod: string | null;
  isLoadingPods: boolean;

  // Containers
  containers: string[];
  selectedContainer: string | null;

  // Workloads
  deployments: WorkloadInfo[];
  statefulSets: WorkloadInfo[];
  daemonSets: WorkloadInfo[];
  labels: LabelInfo[];
  isLoadingWorkloads: boolean;

  // Time range
  startTime: string | null;
  endTime: string | null;
  isFollowing: boolean;

  // Actions
  loadNamespaces: (connectionId: string) => Promise<void>;
  selectNamespace: (namespace: string | null) => void;
  loadPods: (connectionId: string, namespace: string) => Promise<void>;
  selectPod: (pod: string | null) => void;
  loadContainers: (connectionId: string, namespace: string, podName: string) => Promise<void>;
  selectContainer: (container: string | null) => void;
  loadWorkloads: (connectionId: string, namespace: string) => Promise<void>;
  setTimeRange: (start: string | null, end: string | null) => void;
  setFollowing: (following: boolean) => void;
  reset: () => void;
}

export const useSelectorStore = create<SelectorState>((set) => ({
  namespaces: [],
  selectedNamespace: null,
  isLoadingNamespaces: false,

  pods: [],
  selectedPod: null,
  isLoadingPods: false,

  containers: [],
  selectedContainer: null,

  deployments: [],
  statefulSets: [],
  daemonSets: [],
  labels: [],
  isLoadingWorkloads: false,

  startTime: null,
  endTime: null,
  isFollowing: true,

  loadNamespaces: async (connectionId) => {
    set({ isLoadingNamespaces: true });
    try {
      const namespaces = await window.electronAPI.getNamespaces(connectionId);
      set({ namespaces, isLoadingNamespaces: false });
    } catch (error) {
      console.error('Failed to load namespaces:', error);
      set({ namespaces: [], isLoadingNamespaces: false });
    }
  },

  selectNamespace: (namespace) => {
    set({
      selectedNamespace: namespace,
      selectedPod: null,
      selectedContainer: null,
      pods: [],
      containers: [],
    });
  },

  loadPods: async (connectionId, namespace) => {
    set({ isLoadingPods: true });
    try {
      const pods = await window.electronAPI.getPods(connectionId, namespace);
      set({ pods, isLoadingPods: false });
    } catch (error) {
      console.error('Failed to load pods:', error);
      set({ pods: [], isLoadingPods: false });
    }
  },

  selectPod: (pod) => {
    set({ selectedPod: pod, selectedContainer: null, containers: [] });
  },

  loadContainers: async (connectionId, namespace, podName) => {
    try {
      const containers = await window.electronAPI.getContainers(connectionId, namespace, podName);
      set({ containers });
      if (containers.length === 1) {
        set({ selectedContainer: containers[0] });
      }
    } catch (error) {
      console.error('Failed to load containers:', error);
      set({ containers: [] });
    }
  },

  selectContainer: (container) => {
    set({ selectedContainer: container });
  },

  loadWorkloads: async (connectionId, namespace) => {
    set({ isLoadingWorkloads: true });
    try {
      const [deployments, statefulSets, daemonSets, labels] = await Promise.all([
        window.electronAPI.getDeployments(connectionId, namespace),
        window.electronAPI.getStatefulSets(connectionId, namespace),
        window.electronAPI.getDaemonSets(connectionId, namespace),
        window.electronAPI.getLabels(connectionId, namespace),
      ]);
      set({ deployments, statefulSets, daemonSets, labels, isLoadingWorkloads: false });
    } catch (error) {
      console.error('Failed to load workloads:', error);
      set({
        deployments: [],
        statefulSets: [],
        daemonSets: [],
        labels: [],
        isLoadingWorkloads: false,
      });
    }
  },

  setTimeRange: (start, end) => {
    set({ startTime: start, endTime: end, isFollowing: false });
  },

  setFollowing: (following) => {
    set({ isFollowing: following });
    if (following) {
      set({ startTime: null, endTime: null });
    }
  },

  reset: () => {
    set({
      namespaces: [],
      selectedNamespace: null,
      pods: [],
      selectedPod: null,
      containers: [],
      selectedContainer: null,
      deployments: [],
      statefulSets: [],
      daemonSets: [],
      labels: [],
      startTime: null,
      endTime: null,
      isFollowing: true,
    });
  },
}));
