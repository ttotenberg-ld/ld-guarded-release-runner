import { useState, useEffect, useCallback, useRef } from 'react';

// WebSocket URL - with enhanced logging to debug Railway deployment issues
const getWsUrl = () => {
  // If running on Railway, use the internal service URL with WSS
  if (window.location.hostname.includes('railway.app')) {
    console.log('Detected Railway deployment, using internal backend WebSocket URL with WSS');
    return 'wss://ld-gr-backend.railway.internal/ws';
  }
  
  // Try runtime env first
  if (window.REACT_APP_WS_URL) {
    console.log('Using runtime window.REACT_APP_WS_URL:', window.REACT_APP_WS_URL);
    
    // Add appropriate protocol if not present
    if (!window.REACT_APP_WS_URL.startsWith('ws://') && !window.REACT_APP_WS_URL.startsWith('wss://')) {
      // Use WSS in production (if loaded over HTTPS)
      return window.location.protocol === 'https:' 
        ? 'wss://' + window.REACT_APP_WS_URL 
        : 'ws://' + window.REACT_APP_WS_URL;
    }
    return window.REACT_APP_WS_URL;
  }
  
  // Try build time env next
  if (process.env.REACT_APP_WS_URL) {
    console.log('Using build-time process.env.REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
    
    // Add appropriate protocol if not present
    if (!process.env.REACT_APP_WS_URL.startsWith('ws://') && !process.env.REACT_APP_WS_URL.startsWith('wss://')) {
      // Use WSS in production (if loaded over HTTPS)
      return window.location.protocol === 'https:' 
        ? 'wss://' + process.env.REACT_APP_WS_URL 
        : 'ws://' + process.env.REACT_APP_WS_URL;
    }
    return process.env.REACT_APP_WS_URL;
  }
  
  // Fallback to localhost
  console.log('No WebSocket environment variables found, using localhost fallback');
  // Use secure websocket if page is served over HTTPS
  return window.location.protocol === 'https:' 
    ? 'wss://localhost:8000/ws' 
    : 'ws://localhost:8000/ws';
};

const WS_URL = getWsUrl();
console.log('FINAL WebSocket URL:', WS_URL);

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