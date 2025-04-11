import { useState, useEffect, useCallback, useRef } from 'react';

// WebSocket URL - try runtime env first, then build-time env, then fallback
// Make sure to add protocol if not present
const getWsUrl = () => {
  let url = window.REACT_APP_WS_URL || process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';
  
  // Add ws:// protocol if not present
  if (url && !url.startsWith('ws://') && !url.startsWith('wss://')) {
    url = 'ws://' + url;
  }
  
  return url;
};

const WS_URL = getWsUrl();
console.log('Using WebSocket URL:', WS_URL);

const useWebSocket = ({ onMessage }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  
  // Update ref when onMessage changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  
  // Initialize WebSocket connection - only once
  useEffect(() => {
    let ws = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    
    const connect = () => {
      // Clean up any existing connections
      if (ws) {
        ws.close();
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      // Create new WebSocket connection
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        
        // Send ping every 30 seconds to keep connection alive
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket disconnected (code: ${event.code})`);
        setConnected(false);
        
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        
        // Only reconnect if this wasn't a normal closure
        if (event.code !== 1000) {
          console.log('Scheduling reconnect attempt...');
          // Try to reconnect after a delay
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Use the ref to always have the latest callback
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      setSocket(ws);
    };
    
    // Initial connection
    connect();
    
    // Clean up on unmount
    return () => {
      if (ws) {
        // Use 1000 (Normal Closure) to avoid reconnect attempts
        ws.close(1000, 'Component unmounted');
      }
      
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  // No dependencies - only run once on mount
  }, []); 
  
  // Send message through WebSocket
  const sendMessage = useCallback((data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }, [socket]);
  
  return { connected, sendMessage };
};

export default useWebSocket;