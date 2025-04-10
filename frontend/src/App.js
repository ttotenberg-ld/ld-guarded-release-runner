import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import ConfigForm from './components/ConfigForm';
import SimulationControls from './components/SimulationControls';
import EventsLog from './components/EventsLog';
import StatusPanel from './components/StatusPanel';
import { getStatus } from './api/simulationApi';
import useWebSocket from './hooks/useWebSocket';

function App() {
  const [status, setStatus] = useState({ running: false, events_sent: 0, last_error: null });
  const [logs, setLogs] = useState([]);
  
  // Initialize WebSocket connection for real-time updates
  const { connected } = useWebSocket({
    onMessage: (data) => {
      // Handle different message types
      if (data.type === 'status') {
        setStatus(data.data);
      } else if (data.type === 'log') {
        // Add timestamp to log
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        setLogs(prevLogs => [{ timestamp, message: data.message }, ...prevLogs.slice(0, 499)]);
      }
    }
  });
  
  // Fetch initial status when component mounts
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await getStatus();
        setStatus(response);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };
    
    fetchStatus();
  }, []);
  
  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          LaunchDarkly Guarded Release Runner
        </Typography>
      </Box>
      
      {/* Main content layout */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {/* Left column - Configuration */}
        <Box sx={{ flex: '3 1 0', minWidth: 0 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>Configuration</Typography>
            <ConfigForm disabled={status.running} />
          </Paper>
        </Box>
        
        {/* Right column - Controls, Status and Logs */}
        <Box sx={{ flex: '2 1 0', minWidth: 0 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>Controls</Typography>
            <SimulationControls 
              running={status.running} 
              connected={connected}
            />
          </Paper>
          
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>Status</Typography>
            <StatusPanel status={status} />
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>Event Log</Typography>
            <EventsLog logs={logs} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
