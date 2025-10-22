import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = async () => {
    if (socket?.connected || isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);
      const token = await Storage.getItem("accessToken");
      
      if (!token) {
        console.log('No token found, cannot connect to socket');
        setIsConnecting(false);
        return;
      }

      console.log('🔌 Initializing global socket connection...');
      
      const newSocket = io(ENDPOINTS.socket, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket'],
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Global socket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
      });

      newSocket.on('disconnect', (reason) => {
        console.log('⚠️ Global socket disconnected:', reason);
        setIsConnected(false);
        setIsConnecting(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Global socket connection error:', error.message);
        setIsConnected(false);
        setIsConnecting(false);
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log('🔄 Max reconnection attempts reached, stopping reconnection');
          newSocket.disconnect();
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Global socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        reconnectAttempts.current = 0;
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Global socket reconnection attempt ${attemptNumber}...`);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Global socket reconnection error:', error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Global socket reconnection failed');
        setIsConnected(false);
        setIsConnecting(false);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Error connecting to socket:', error);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (socket) {
      console.log('🔌 Disconnecting global socket...');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`Cannot emit event '${event}' - socket not connected`);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};