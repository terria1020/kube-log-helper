import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';
import { Writable } from 'stream';

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

export interface LogOptions {
  follow: boolean;
  sinceTime?: Date;
  tailLines?: number;
}

interface KubeClient {
  kc: k8s.KubeConfig;
  coreApi: k8s.CoreV1Api;
  appsApi: k8s.AppsV1Api;
}

class K8sService {
  private clients: Map<string, KubeClient> = new Map();
  private logStreams: Map<string, { request: any; abort: () => void }> = new Map();
  private tlsInsecure: boolean = false;

  setTlsInsecure(insecure: boolean): void {
    this.tlsInsecure = insecure;
  }

  async connect(id: string, kubeconfigYaml: string, tunnelPort?: number): Promise<void> {
    const kc = new k8s.KubeConfig();

    // Parse kubeconfig
    const config = yaml.load(kubeconfigYaml) as any;

    // If using SSH tunnel, modify the server URL
    if (tunnelPort && config.clusters?.[0]?.cluster?.server) {
      config.clusters[0].cluster.server = `https://127.0.0.1:${tunnelPort}`;
      // Skip TLS verification for tunnel
      config.clusters[0].cluster['insecure-skip-tls-verify'] = true;
    }

    // Apply global TLS insecure setting
    if (this.tlsInsecure && config.clusters?.[0]?.cluster) {
      config.clusters[0].cluster['insecure-skip-tls-verify'] = true;
    }

    kc.loadFromString(yaml.dump(config));

    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);

    this.clients.set(id, { kc, coreApi, appsApi });
  }

  disconnect(id: string): void {
    this.clients.delete(id);
  }

  private getClient(id: string): KubeClient {
    const client = this.clients.get(id);
    if (!client) {
      throw new Error(`Connection not found: ${id}`);
    }
    return client;
  }

  async getNamespaces(connectionId: string): Promise<string[]> {
    const { coreApi } = this.getClient(connectionId);
    const response = await coreApi.listNamespace();
    return response.items.map((ns) => ns.metadata?.name || '').filter(Boolean);
  }

  async getPods(connectionId: string, namespace: string): Promise<PodInfo[]> {
    const { coreApi } = this.getClient(connectionId);
    const response = await coreApi.listNamespacedPod({ namespace });
    return response.items.map((pod) => ({
      name: pod.metadata?.name || '',
      status: pod.status?.phase || 'Unknown',
      containers: pod.spec?.containers.map((c) => c.name) || [],
      labels: pod.metadata?.labels || {},
    }));
  }

  async getContainers(connectionId: string, namespace: string, podName: string): Promise<string[]> {
    const { coreApi } = this.getClient(connectionId);
    const response = await coreApi.readNamespacedPod({ name: podName, namespace });
    return response.spec?.containers.map((c) => c.name) || [];
  }

  async getDeployments(connectionId: string, namespace: string): Promise<WorkloadInfo[]> {
    const { appsApi } = this.getClient(connectionId);
    const response = await appsApi.listNamespacedDeployment({ namespace });
    return response.items.map((dep) => ({
      name: dep.metadata?.name || '',
      replicas: dep.spec?.replicas || 0,
      readyReplicas: dep.status?.readyReplicas || 0,
      labels: dep.spec?.selector?.matchLabels || {},
    }));
  }

  async getStatefulSets(connectionId: string, namespace: string): Promise<WorkloadInfo[]> {
    const { appsApi } = this.getClient(connectionId);
    const response = await appsApi.listNamespacedStatefulSet({ namespace });
    return response.items.map((sts) => ({
      name: sts.metadata?.name || '',
      replicas: sts.spec?.replicas || 0,
      readyReplicas: sts.status?.readyReplicas || 0,
      labels: sts.spec?.selector?.matchLabels || {},
    }));
  }

  async getDaemonSets(connectionId: string, namespace: string): Promise<WorkloadInfo[]> {
    const { appsApi } = this.getClient(connectionId);
    const response = await appsApi.listNamespacedDaemonSet({ namespace });
    return response.items.map((ds) => ({
      name: ds.metadata?.name || '',
      replicas: ds.status?.desiredNumberScheduled || 0,
      readyReplicas: ds.status?.numberReady || 0,
      labels: ds.spec?.selector?.matchLabels || {},
    }));
  }

  async getLabels(connectionId: string, namespace: string): Promise<LabelInfo[]> {
    const pods = await this.getPods(connectionId, namespace);
    const labelCounts = new Map<string, number>();

    for (const pod of pods) {
      for (const [key, value] of Object.entries(pod.labels)) {
        const labelKey = `${key}=${value}`;
        labelCounts.set(labelKey, (labelCounts.get(labelKey) || 0) + 1);
      }
    }

    return Array.from(labelCounts.entries()).map(([label, count]) => {
      const [key, value] = label.split('=');
      return { key, value, podCount: count };
    });
  }

  async getPodsByWorkload(
    connectionId: string,
    namespace: string,
    workloadType: 'deployment' | 'statefulset' | 'daemonset',
    workloadName: string
  ): Promise<PodInfo[]> {
    const { appsApi, coreApi } = this.getClient(connectionId);
    let labelSelector: Record<string, string> = {};

    switch (workloadType) {
      case 'deployment': {
        const dep = await appsApi.readNamespacedDeployment({ name: workloadName, namespace });
        labelSelector = dep.spec?.selector?.matchLabels || {};
        break;
      }
      case 'statefulset': {
        const sts = await appsApi.readNamespacedStatefulSet({ name: workloadName, namespace });
        labelSelector = sts.spec?.selector?.matchLabels || {};
        break;
      }
      case 'daemonset': {
        const ds = await appsApi.readNamespacedDaemonSet({ name: workloadName, namespace });
        labelSelector = ds.spec?.selector?.matchLabels || {};
        break;
      }
    }

    const selectorString = Object.entries(labelSelector)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    const response = await coreApi.listNamespacedPod({ namespace, labelSelector: selectorString });
    return response.items.map((pod) => ({
      name: pod.metadata?.name || '',
      status: pod.status?.phase || 'Unknown',
      containers: pod.spec?.containers.map((c) => c.name) || [],
      labels: pod.metadata?.labels || {},
    }));
  }

  async getPodsByLabel(connectionId: string, namespace: string, labelSelector: string): Promise<PodInfo[]> {
    const { coreApi } = this.getClient(connectionId);
    const response = await coreApi.listNamespacedPod({ namespace, labelSelector });
    return response.items.map((pod) => ({
      name: pod.metadata?.name || '',
      status: pod.status?.phase || 'Unknown',
      containers: pod.spec?.containers.map((c) => c.name) || [],
      labels: pod.metadata?.labels || {},
    }));
  }

  async startLogStream(
    sessionId: string,
    connectionId: string,
    namespace: string,
    podName: string,
    containerName: string,
    options: LogOptions,
    onData: (data: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const { kc } = this.getClient(connectionId);
    const log = new k8s.Log(kc);

    const logOptions: any = {
      follow: options.follow,
      pretty: false,
      timestamps: true,
    };

    if (options.sinceTime) {
      logOptions.sinceTime = options.sinceTime.toISOString();
    }

    if (options.tailLines) {
      logOptions.tailLines = options.tailLines;
    }

    try {
      const stream = new Writable({
        write(chunk: Buffer, _encoding, callback) {
          onData(chunk.toString());
          callback();
        },
      });

      stream.on('error', (err: Error) => {
        onError(err);
      });

      const abortController = await log.log(
        namespace,
        podName,
        containerName,
        stream,
        logOptions
      );

      this.logStreams.set(sessionId, {
        request: abortController,
        abort: () => {
          abortController.abort();
          stream.destroy();
        },
      });
    } catch (error) {
      onError(error as Error);
    }
  }

  stopLogStream(sessionId: string): void {
    const stream = this.logStreams.get(sessionId);
    if (stream) {
      stream.abort();
      this.logStreams.delete(sessionId);
    }
  }

  stopAllLogStreams(): void {
    for (const sessionId of this.logStreams.keys()) {
      this.stopLogStream(sessionId);
    }
  }
}

export const k8sService = new K8sService();
