import { Client } from '@stomp/stompjs';

let client: Client | null = null;

export function createWebsocket(url: string, onConnect?: () => void, onMessage?: (msg: string) => void) {
  client = new Client({ brokerURL: url });
  client.onConnect = () => onConnect && onConnect();
  client.onStompError = (err) => console.error('STOMP error', err);
  client.activate();
  return client;
}

export function disconnectWebsocket() {
  if (client) {
    client.deactivate();
    client = null;
  }
}
