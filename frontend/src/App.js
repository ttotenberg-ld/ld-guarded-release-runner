import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import ConfigForm from './components/ConfigForm';
import SimulationControls from './components/SimulationControls';
import StatusPanel from './components/StatusPanel';
import { getStatus } from './api/simulationApi';
import useWebSocket from './hooks/useWebSocket';

function App() {
  const [status, setStatus] = useState({ running: false, events_sent: 0, last_error: null });
  
  // Initialize WebSocket connection for real-time updates
  const { connected } = useWebSocket({
    onMessage: (data) => {
      // Handle status messages
      if (data.type === 'status') {
        setStatus(data.data);
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
        
        {/* Right column - Controls and Status */}
        <Box sx={{ flex: '2 1 0', minWidth: 0 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>Controls</Typography>
            <SimulationControls 
              running={status.running} 
              connected={connected}
            />
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>Status</Typography>
            <StatusPanel status={status} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
