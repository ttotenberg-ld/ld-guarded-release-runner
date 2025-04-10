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
      
      // Ensure toggle states are properly preserved as booleans
      ['error_metric_enabled', 'latency_metric_enabled', 'business_metric_enabled'].forEach(toggleKey => {
        // Make sure toggle values are strictly boolean (not string "true"/"false")
        // Use strict comparison to check if the value should be false
        if (config[toggleKey] === false || config[toggleKey] === 'false' || config[toggleKey] === 0) {
          config[toggleKey] = false;
        } else {
          config[toggleKey] = true;
        }
      });
      
      // Ensure ranges are arrays
      ['latency_metric_1_false_range', 'latency_metric_1_true_range'].forEach(rangeKey => {
        if (typeof config[rangeKey] === 'string') {
          try {
            const values = config[rangeKey].split(',').map(v => parseInt(v.trim(), 10));
            const validValues = values.filter(v => !isNaN(v));
            if (validValues.length === 2) {
              config[rangeKey] = validValues;
            } else {
              config[rangeKey] = rangeKey.includes('false') ? [50, 100] : [75, 125];
            }
          } catch (err) {
            config[rangeKey] = rangeKey.includes('false') ? [50, 100] : [75, 125];
          }
        } else if (!Array.isArray(config[rangeKey])) {
          config[rangeKey] = rangeKey.includes('false') ? [50, 100] : [75, 125];
        }
      });
      
      // Make sure numeric fields are numbers
      ['error_metric_1_false_converted', 'error_metric_1_true_converted', 
       'business_metric_1_false_converted', 'business_metric_1_true_converted'].forEach(field => {
        if (typeof config[field] === 'string') {
          config[field] = parseInt(config[field], 10) || 0;
        }
      });
      
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
