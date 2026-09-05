import { useEffect, useRef, useState } from 'react';
import { createWebsocket, disconnectWebsocket } from '../services/websocketService';

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const messages = useRef<string[]>([]);

  useEffect(() => {
    const client = createWebsocket(url, () => setConnected(true), (m) => messages.current.unshift(m));
    return () => {
      disconnectWebsocket();
    };
  }, [url]);

  return { connected, messages: messages.current };
}
