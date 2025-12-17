import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as net from 'net';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
}

export interface TunnelInfo {
  localPort: number;
  server: net.Server;
  client: Client;
}

class SSHTunnelService {
  private tunnels: Map<string, TunnelInfo> = new Map();

  async createTunnel(
    id: string,
    sshConfig: SSHConfig,
    remoteHost: string,
    remotePort: number
  ): Promise<number> {
    if (this.tunnels.has(id)) {
      await this.closeTunnel(id);
    }

    const privateKey = fs.readFileSync(sshConfig.privateKeyPath);
    const client = new Client();

    const connectConfig: ConnectConfig = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      privateKey,
    };

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        const server = net.createServer((socket) => {
          client.forwardOut(
            socket.remoteAddress || '127.0.0.1',
            socket.remotePort || 0,
            remoteHost,
            remotePort,
            (err, stream) => {
              if (err) {
                socket.end();
                return;
              }
              socket.pipe(stream).pipe(socket);
            }
          );
        });

        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          if (address && typeof address === 'object') {
            const localPort = address.port;
            this.tunnels.set(id, { localPort, server, client });
            resolve(localPort);
          } else {
            reject(new Error('Failed to get local port'));
          }
        });

        server.on('error', (err) => {
          reject(err);
        });
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.connect(connectConfig);
    });
  }

  async closeTunnel(id: string): Promise<void> {
    const tunnel = this.tunnels.get(id);
    if (tunnel) {
      tunnel.server.close();
      tunnel.client.end();
      this.tunnels.delete(id);
    }
  }

  async testConnection(sshConfig: SSHConfig): Promise<boolean> {
    const privateKey = fs.readFileSync(sshConfig.privateKeyPath);
    const client = new Client();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        client.end();
        resolve(false);
      }, 10000);

      client.on('ready', () => {
        clearTimeout(timeout);
        client.end();
        resolve(true);
      });

      client.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      client.connect({
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        privateKey,
      });
    });
  }

  getTunnelPort(id: string): number | undefined {
    return this.tunnels.get(id)?.localPort;
  }

  closeAll(): void {
    for (const id of this.tunnels.keys()) {
      this.closeTunnel(id);
    }
  }
}

export const sshTunnelService = new SSHTunnelService();
