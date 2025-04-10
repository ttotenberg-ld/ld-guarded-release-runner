import React from 'react';
import { Box, Button, Typography, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startSimulation, stopSimulation } from '../api/simulationApi';

const SimulationControls = ({ running, connected }) => {
  const handleStart = async () => {
    try {
      // Get current form values directly from the DOM to ensure we have the latest values
      // even if the user hasn't clicked Save in the ConfigForm
      const formElements = document.querySelectorAll('input[name], textarea[name]');
      let currentConfig = {};
      
      // First get the saved config as a base
      const savedConfig = localStorage.getItem('ldConfig');
      if (!savedConfig) {
        alert('Please configure settings first');
        return;
      }
      
      // Parse saved config
      currentConfig = JSON.parse(savedConfig);
      
      // Update config with latest values from form fields
      formElements.forEach(element => {
        if (element.name) {
          // Handle checkbox/switch inputs
          if (element.type === 'checkbox') {
            currentConfig[element.name] = element.checked;
          } 
          // Handle regular inputs
          else {
            currentConfig[element.name] = element.value;
          }
        }
      });
      
      // Ensure toggle states are properly preserved as booleans
      ['error_metric_enabled', 'latency_metric_enabled', 'business_metric_enabled'].forEach(toggleKey => {
        // Make sure toggle values are strictly boolean (not string "true"/"false")
        // Use strict comparison to check if the value should be false
        if (currentConfig[toggleKey] === false || currentConfig[toggleKey] === 'false' || currentConfig[toggleKey] === 0) {
          currentConfig[toggleKey] = false;
        } else {
          currentConfig[toggleKey] = true;
        }
      });
      
      // Ensure ranges are arrays
      ['latency_metric_1_false_range', 'latency_metric_1_true_range'].forEach(rangeKey => {
        if (typeof currentConfig[rangeKey] === 'string') {
          try {
            const values = currentConfig[rangeKey].split(',').map(v => parseInt(v.trim(), 10));
            const validValues = values.filter(v => !isNaN(v));
            if (validValues.length === 2) {
              currentConfig[rangeKey] = validValues;
            } else {
              currentConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
            }
          } catch (err) {
            currentConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
          }
        } else if (!Array.isArray(currentConfig[rangeKey])) {
          currentConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
        }
      });
      
      // Make sure numeric fields are numbers
      ['error_metric_1_false_converted', 'error_metric_1_true_converted', 
       'business_metric_1_false_converted', 'business_metric_1_true_converted'].forEach(field => {
        if (typeof currentConfig[field] === 'string') {
          currentConfig[field] = parseInt(currentConfig[field], 10) || 0;
        }
      });
      
      // Save the current config to localStorage before starting
      localStorage.setItem('ldConfig', JSON.stringify(currentConfig));
      
      await startSimulation(currentConfig);
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
          color="warning"
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
