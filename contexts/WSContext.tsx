import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface WSContextType {
  isConnected: boolean;
  lastPong: Date | null;
  send: (message: string) => void;
  sendImage: (imagePath: string) => void;
}

const WSContext = createContext<WSContextType>({
  isConnected: false,
  lastPong: null,
  send: () => {},
  sendImage: () => {},
});

export const useWS = () => useContext(WSContext);

export const WSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastPong, setLastPong] = useState<Date | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const pingInterval = useRef<NodeJS.Timeout>();

  const connect = () => {
    ws.current = new WebSocket('ws://localhost:3000/ws');

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    ws.current.onmessage = (event) => {
      const message = event.data;
      if (message === 'pong') {
        setLastPong(new Date());
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  };

  useEffect(() => {
    connect();

    // Setup ping interval
    pingInterval.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send('ping');
      }
    }, 60000); // Send ping every minute

    return () => {
      clearInterval(pingInterval.current);
      ws.current?.close();
    };
  }, []);

  const send = (message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    }
  };

  const sendImage = async (imagePath: string): Promise<any> => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        return new Promise((resolve, reject) => {
          // Set up one-time message handler for this image
          const messageHandler = (event: WebSocketMessageEvent) => {
            try {
              const response = JSON.parse(event.data);
              ws.current?.removeEventListener('message', messageHandler);
              resolve(response);
            } catch (error) {
              reject(error);
            }
          };

          ws.current?.addEventListener('message', messageHandler);

          // Convert file path to base64
          fetch(`file://${imagePath}`)
            .then(response => response.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                ws.current?.send(reader.result as string);
              };
              reader.readAsDataURL(blob);
            })
            .catch(error => {
              ws.current?.removeEventListener('message', messageHandler);
              reject(error);
            });
        });
      } catch (error) {
        console.error('Error sending image:', error);
        throw error;
      }
    }
    throw new Error('WebSocket not connected');
  };

  return (
    <WSContext.Provider value={{ isConnected, lastPong, send, sendImage }}>
      {children}
    </WSContext.Provider>
  );
};
