import React from 'react';
import { Box, Button, Typography, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startSimulation, stopSimulation } from '../api/simulationApi';

const SimulationControls = ({ running, connected }) => {
  const handleStart = async () => {
    try {
      const savedConfig = localStorage.getItem('ldConfig');
      if (!savedConfig) {
        alert('Please configure settings first');
        return;
      }
      
      const config = JSON.parse(savedConfig);
      await startSimulation(config);
    } catch (error) {
      console.error('Error starting simulation:', error);
      alert(`Failed to start simulation: ${error.message}`);
    }
  };
  
  const handleStop = async () => {
    try {
      await stopSimulation();
    } catch (error) {
      console.error('Error stopping simulation:', error);
      alert(`Failed to stop simulation: ${error.message}`);
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mr: 2 }}>Status:</Typography>
        <Chip 
          label={connected ? 'Connected' : 'Disconnected'} 
          color={connected ? 'success' : 'error'}
          size="small"
        />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={handleStart}
          disabled={running || !connected}
          fullWidth
        >
          Start Simulation
        </Button>
        
        <Button
          variant="contained"
          color="error"
          startIcon={<StopIcon />}
          onClick={handleStop}
          disabled={!running || !connected}
          fullWidth
        >
          Stop Simulation
        </Button>
      </Box>
    </Box>
  );
};

export default SimulationControls;
