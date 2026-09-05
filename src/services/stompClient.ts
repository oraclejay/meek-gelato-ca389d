import { Client } from '@stomp/stompjs';

let stompClient: Client | null = null;

export const createStompClient = (brokerURL: string, onConnect?: () => void, onMessage?: (message: string) => void) => {
  if (stompClient) {
    return stompClient;
  }

  stompClient = new Client({
    brokerURL,
    reconnectDelay: 5000,
    onConnect: () => {
      stompClient?.subscribe('/topic/public', (message) => {
        const payload = message.body;
        onMessage?.(payload);
      });
      onConnect?.();
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    },
  });

  stompClient.activate();
  return stompClient;
};

export const disconnectStompClient = () => {
  stompClient?.deactivate();
  stompClient = null;
};
