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

export interface LogSession {
  id: string;
  connectionId: string;
  namespace: string;
  podName: string;
  containerName: string;
  isStreaming: boolean;
  fontSize: number;
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

export type ViewMode = 'single' | 'split-h' | 'split-v' | 'quad';

export type WorkloadType = 'deployment' | 'statefulset' | 'daemonset' | 'label';

export type LogViewMode = 'merged' | 'tabs' | 'split';

declare global {
  interface Window {
    electronAPI: {
      setTlsInsecure: (insecure: boolean) => Promise<void>;
      addConnection: (config: ConnectionConfig) => Promise<string>;
      testConnection: (config: ConnectionConfig) => Promise<boolean>;
      getConnections: () => Promise<{ id: string; name: string; hasSSH: boolean }[]>;
      removeConnection: (id: string) => Promise<void>;
      saveConnections: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      loadConnections: () => Promise<{ success: boolean; count?: number; error?: string }>;
      getNamespaces: (connectionId: string) => Promise<string[]>;
      getPods: (connectionId: string, namespace: string) => Promise<PodInfo[]>;
      getContainers: (connectionId: string, namespace: string, podName: string) => Promise<string[]>;
      getDeployments: (connectionId: string, namespace: string) => Promise<WorkloadInfo[]>;
      getStatefulSets: (connectionId: string, namespace: string) => Promise<WorkloadInfo[]>;
      getDaemonSets: (connectionId: string, namespace: string) => Promise<WorkloadInfo[]>;
      getLabels: (connectionId: string, namespace: string) => Promise<LabelInfo[]>;
      getPodsByWorkload: (
        connectionId: string,
        namespace: string,
        workloadType: 'deployment' | 'statefulset' | 'daemonset',
        workloadName: string
      ) => Promise<PodInfo[]>;
      getPodsByLabel: (connectionId: string, namespace: string, labelSelector: string) => Promise<PodInfo[]>;
      startLogStream: (config: LogStreamConfig) => Promise<void>;
      stopLogStream: (sessionId: string) => Promise<void>;
      onLogData: (callback: (data: { sessionId: string; data: string }) => void) => () => void;
      onLogError: (callback: (data: { sessionId: string; error: string }) => void) => () => void;
    };
  }
}

export {};
