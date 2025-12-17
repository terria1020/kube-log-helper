import { contextBridge, ipcRenderer } from 'electron';

export interface ConnectionConfig {
  id?: string;
  name: string;
  ssh?: {
    host: string;
    port: number;
    username: string;
    privateKeyPath: string;
  };
  kubeconfig: string;
}

export interface PodInfo {
  name: string;
  status: string;
  containers: string[];
  labels: Record<string, string>;
}

export interface WorkloadInfo {
  name: string;
  replicas: number;
  readyReplicas: number;
  labels: Record<string, string>;
}

export interface LabelInfo {
  key: string;
  value: string;
  podCount: number;
}

export interface LogStreamConfig {
  sessionId: string;
  connectionId: string;
  namespace: string;
  podName: string;
  containerName: string;
  follow: boolean;
  sinceTime?: string;
  tailLines?: number;
}

export interface LogData {
  sessionId: string;
  data: string;
  podName?: string;
  timestamp?: string;
}

const electronAPI = {
  // Settings
  setTlsInsecure: (insecure: boolean): Promise<void> =>
    ipcRenderer.invoke('settings:tls-insecure', insecure),

  // Connection management
  addConnection: (config: ConnectionConfig): Promise<string> =>
    ipcRenderer.invoke('connection:add', config),
  testConnection: (config: ConnectionConfig): Promise<boolean> =>
    ipcRenderer.invoke('connection:test', config),
  getConnections: (): Promise<ConnectionConfig[]> =>
    ipcRenderer.invoke('connection:list'),
  removeConnection: (id: string): Promise<void> =>
    ipcRenderer.invoke('connection:remove', id),
  saveConnections: (): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('connection:save'),
  loadConnections: (): Promise<{ success: boolean; count?: number; error?: string }> =>
    ipcRenderer.invoke('connection:load'),

  // K8s queries
  getNamespaces: (connectionId: string): Promise<string[]> =>
    ipcRenderer.invoke('k8s:namespaces', { connectionId }),
  getPods: (connectionId: string, namespace: string): Promise<PodInfo[]> =>
    ipcRenderer.invoke('k8s:pods', { connectionId, namespace }),
  getContainers: (connectionId: string, namespace: string, podName: string): Promise<string[]> =>
    ipcRenderer.invoke('k8s:containers', { connectionId, namespace, podName }),

  // Workload selectors
  getDeployments: (connectionId: string, namespace: string): Promise<WorkloadInfo[]> =>
    ipcRenderer.invoke('k8s:deployments', { connectionId, namespace }),
  getStatefulSets: (connectionId: string, namespace: string): Promise<WorkloadInfo[]> =>
    ipcRenderer.invoke('k8s:statefulsets', { connectionId, namespace }),
  getDaemonSets: (connectionId: string, namespace: string): Promise<WorkloadInfo[]> =>
    ipcRenderer.invoke('k8s:daemonsets', { connectionId, namespace }),
  getLabels: (connectionId: string, namespace: string): Promise<LabelInfo[]> =>
    ipcRenderer.invoke('k8s:labels', { connectionId, namespace }),
  getPodsByWorkload: (
    connectionId: string,
    namespace: string,
    workloadType: 'deployment' | 'statefulset' | 'daemonset',
    workloadName: string
  ): Promise<PodInfo[]> =>
    ipcRenderer.invoke('k8s:pods-by-workload', { connectionId, namespace, workloadType, workloadName }),
  getPodsByLabel: (connectionId: string, namespace: string, labelSelector: string): Promise<PodInfo[]> =>
    ipcRenderer.invoke('k8s:pods-by-label', { connectionId, namespace, labelSelector }),

  // Log streaming
  startLogStream: (config: LogStreamConfig): Promise<void> =>
    ipcRenderer.invoke('k8s:logs:start', config),
  stopLogStream: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('k8s:logs:stop', { sessionId }),
  onLogData: (callback: (data: LogData) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: LogData) => callback(data);
    ipcRenderer.on('k8s:logs:data', handler);
    return () => ipcRenderer.removeListener('k8s:logs:data', handler);
  },
  onLogError: (callback: (data: { sessionId: string; error: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { sessionId: string; error: string }) => callback(data);
    ipcRenderer.on('k8s:logs:error', handler);
    return () => ipcRenderer.removeListener('k8s:logs:error', handler);
  },

};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
