import { ipcMain, BrowserWindow } from 'electron';
import { k8sService } from '../services/k8s.service.js';

export function registerK8sIpc(): void {
  // Namespace operations
  ipcMain.handle('k8s:namespaces', async (_event, { connectionId }) => {
    return k8sService.getNamespaces(connectionId);
  });

  // Pod operations
  ipcMain.handle('k8s:pods', async (_event, { connectionId, namespace }) => {
    return k8sService.getPods(connectionId, namespace);
  });

  ipcMain.handle('k8s:containers', async (_event, { connectionId, namespace, podName }) => {
    return k8sService.getContainers(connectionId, namespace, podName);
  });

  // Workload operations
  ipcMain.handle('k8s:deployments', async (_event, { connectionId, namespace }) => {
    return k8sService.getDeployments(connectionId, namespace);
  });

  ipcMain.handle('k8s:statefulsets', async (_event, { connectionId, namespace }) => {
    return k8sService.getStatefulSets(connectionId, namespace);
  });

  ipcMain.handle('k8s:daemonsets', async (_event, { connectionId, namespace }) => {
    return k8sService.getDaemonSets(connectionId, namespace);
  });

  ipcMain.handle('k8s:labels', async (_event, { connectionId, namespace }) => {
    return k8sService.getLabels(connectionId, namespace);
  });

  ipcMain.handle('k8s:pods-by-workload', async (_event, { connectionId, namespace, workloadType, workloadName }) => {
    return k8sService.getPodsByWorkload(connectionId, namespace, workloadType, workloadName);
  });

  ipcMain.handle('k8s:pods-by-label', async (_event, { connectionId, namespace, labelSelector }) => {
    return k8sService.getPodsByLabel(connectionId, namespace, labelSelector);
  });

  // Log streaming
  ipcMain.handle('k8s:logs:start', async (event, config) => {
    const { sessionId, connectionId, namespace, podName, containerName, follow, sinceTime, tailLines } = config;

    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;

    await k8sService.startLogStream(
      sessionId,
      connectionId,
      namespace,
      podName,
      containerName,
      {
        follow,
        sinceTime: sinceTime ? new Date(sinceTime) : undefined,
        tailLines,
      },
      (data) => {
        if (!window.isDestroyed()) {
          window.webContents.send('k8s:logs:data', { sessionId, data });
        }
      },
      (error) => {
        if (!window.isDestroyed()) {
          window.webContents.send('k8s:logs:error', { sessionId, error: error.message });
        }
      }
    );
  });

  ipcMain.handle('k8s:logs:stop', async (_event, { sessionId }) => {
    k8sService.stopLogStream(sessionId);
  });
}
