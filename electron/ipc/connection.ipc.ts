import { ipcMain, dialog } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { sshTunnelService, SSHConfig } from '../services/ssh-tunnel.service.js';
import { k8sService } from '../services/k8s.service.js';

interface ConnectionConfig {
  id?: string;
  name: string;
  ssh?: SSHConfig;
  kubeconfig: string;
}

interface StoredConnection extends ConnectionConfig {
  id: string;
  tunnelPort?: number;
}

const connections: Map<string, StoredConnection> = new Map();

export function registerConnectionIpc(): void {
  // TLS Insecure setting
  ipcMain.handle('settings:tls-insecure', async (_event, insecure: boolean) => {
    k8sService.setTlsInsecure(insecure);
  });

  ipcMain.handle('connection:add', async (_event, config: ConnectionConfig) => {
    const id = config.id || uuidv4();
    let tunnelPort: number | undefined;

    // Create SSH tunnel if SSH config provided
    if (config.ssh) {
      // Extract K8s API server from kubeconfig
      const serverMatch = config.kubeconfig.match(/server:\s*https?:\/\/([^:/\s]+):?(\d+)?/);
      if (serverMatch) {
        const remoteHost = serverMatch[1];
        const remotePort = parseInt(serverMatch[2] || '6443', 10);
        tunnelPort = await sshTunnelService.createTunnel(id, config.ssh, remoteHost, remotePort);
      }
    }

    // Connect K8s client
    await k8sService.connect(id, config.kubeconfig, tunnelPort);

    const storedConnection: StoredConnection = {
      ...config,
      id,
      tunnelPort,
    };

    connections.set(id, storedConnection);
    return id;
  });

  ipcMain.handle('connection:test', async (_event, config: ConnectionConfig) => {
    try {
      // Test SSH connection if provided
      if (config.ssh) {
        const sshOk = await sshTunnelService.testConnection(config.ssh);
        if (!sshOk) {
          return false;
        }
      }

      // Try to connect and get namespaces as a test
      const tempId = `test-${Date.now()}`;
      let tunnelPort: number | undefined;

      if (config.ssh) {
        const serverMatch = config.kubeconfig.match(/server:\s*https?:\/\/([^:/\s]+):?(\d+)?/);
        if (serverMatch) {
          const remoteHost = serverMatch[1];
          const remotePort = parseInt(serverMatch[2] || '6443', 10);
          tunnelPort = await sshTunnelService.createTunnel(tempId, config.ssh, remoteHost, remotePort);
        }
      }

      await k8sService.connect(tempId, config.kubeconfig, tunnelPort);
      await k8sService.getNamespaces(tempId);

      // Cleanup
      k8sService.disconnect(tempId);
      if (config.ssh) {
        await sshTunnelService.closeTunnel(tempId);
      }

      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  });

  ipcMain.handle('connection:list', async () => {
    return Array.from(connections.values()).map(({ id, name, ssh }) => ({
      id,
      name,
      hasSSH: !!ssh,
    }));
  });

  ipcMain.handle('connection:remove', async (_event, id: string) => {
    const connection = connections.get(id);
    if (connection) {
      k8sService.disconnect(id);
      if (connection.ssh) {
        await sshTunnelService.closeTunnel(id);
      }
      connections.delete(id);
    }
  });

  // Save connections to file
  ipcMain.handle('connection:save', async () => {
    const result = await dialog.showSaveDialog({
      title: '연결 정보 저장',
      defaultPath: 'kube-connections.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false };
    }

    try {
      const data = Array.from(connections.values()).map(({ tunnelPort, ...rest }) => rest);
      await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Failed to save connections:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Load connections from file
  ipcMain.handle('connection:load', async () => {
    const result = await dialog.showOpenDialog({
      title: '연결 정보 불러오기',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false };
    }

    try {
      const content = await fs.readFile(result.filePaths[0], 'utf-8');
      const data = JSON.parse(content) as ConnectionConfig[];

      // Add each connection
      const addedIds: string[] = [];
      for (const config of data) {
        const id = config.id || uuidv4();
        let tunnelPort: number | undefined;

        if (config.ssh) {
          const serverMatch = config.kubeconfig.match(/server:\s*https?:\/\/([^:/\s]+):?(\d+)?/);
          if (serverMatch) {
            const remoteHost = serverMatch[1];
            const remotePort = parseInt(serverMatch[2] || '6443', 10);
            tunnelPort = await sshTunnelService.createTunnel(id, config.ssh, remoteHost, remotePort);
          }
        }

        await k8sService.connect(id, config.kubeconfig, tunnelPort);

        const storedConnection: StoredConnection = {
          ...config,
          id,
          tunnelPort,
        };

        connections.set(id, storedConnection);
        addedIds.push(id);
      }

      return { success: true, count: addedIds.length };
    } catch (error) {
      console.error('Failed to load connections:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
