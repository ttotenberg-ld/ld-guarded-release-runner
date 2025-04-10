import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography, Box, Alert, CircularProgress, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import { createLaunchDarklyResources } from '../api/launchDarklyApi';

// Helper function to save the configuration, similar to handleSubmit in ConfigForm
const saveConfiguration = (currentConfig) => {
  try {
    // Create a copy of the config
    const submissionConfig = { ...currentConfig };
    
    // Process the ranges
    ['latency_metric_1_false_range', 'latency_metric_1_true_range'].forEach(rangeKey => {
      if (typeof submissionConfig[rangeKey] === 'string') {
        try {
          const values = submissionConfig[rangeKey].split(',').map(v => parseInt(v.trim(), 10));
          const validValues = values.filter(v => !isNaN(v));
          
          // Ensure array has exactly 2 elements
          if (validValues.length !== 2) {
            throw new Error(`${rangeKey} must have exactly 2 values`);
          }
          
          submissionConfig[rangeKey] = validValues;
        } catch (err) {
          throw new Error(`Invalid range format for ${rangeKey}: ${err.message}`);
        }
      } else if (!Array.isArray(submissionConfig[rangeKey])) {
        // If it's neither a string nor an array, default to the placeholder values
        submissionConfig[rangeKey] = rangeKey.includes('false') ? [50, 100] : [75, 125];
      }
    });
    
    // Make sure all number fields are integers
    ['error_metric_1_false_converted', 'error_metric_1_true_converted', 
     'business_metric_1_false_converted', 'business_metric_1_true_converted'].forEach(field => {
      if (typeof submissionConfig[field] === 'string') {
        submissionConfig[field] = parseInt(submissionConfig[field], 10) || 0;
      }
    });
    
    // Ensure toggle states are properly saved as booleans
    ['error_metric_enabled', 'latency_metric_enabled', 'business_metric_enabled'].forEach(toggleKey => {
      // Explicitly convert to boolean
      if (submissionConfig[toggleKey] === false || submissionConfig[toggleKey] === 'false' || submissionConfig[toggleKey] === 0) {
        submissionConfig[toggleKey] = false;
      } else {
        submissionConfig[toggleKey] = true;
      }
    });
    
    // Save to localStorage
    localStorage.setItem('ldConfig', JSON.stringify(submissionConfig));
    
    // Return the processed config
    return submissionConfig;
  } catch (error) {
    console.error('Error saving configuration:', error);
    throw error;
  }
};

const LaunchDarklyResourceCreator = ({ disabled }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [resourceStatuses, setResourceStatuses] = useState({
    flag: { status: 'pending', message: '' },
    errorMetric: { status: 'pending', message: '' },
    latencyMetric: { status: 'pending', message: '' },
    businessMetric: { status: 'pending', message: '' }
  });

  const handleClickOpen = () => {
    setOpen(true);
    // Reset states
    setLoading(false);
    setError(null);
    setResult(null);
    setResourceStatuses({
      flag: { status: 'pending', message: '' },
      errorMetric: { status: 'pending', message: '' },
      latencyMetric: { status: 'pending', message: '' },
      businessMetric: { status: 'pending', message: '' }
    });
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current config from form via localStorage
      const savedConfig = localStorage.getItem('ldConfig');
      if (!savedConfig) {
        throw new Error('No configuration found. Please save your configuration first.');
      }
      
      // Parse and validate config
      let config = JSON.parse(savedConfig);
      
      // Basic validation
      if (!config.sdk_key || !config.api_key || !config.project_key || !config.flag_key) {
        throw new Error('All required fields must be filled');
      }
      
      // Process and save the configuration to ensure we have the latest values
      // This helps synchronize with any form changes that might not have been saved yet
      config = saveConfiguration(config);
      
      // Update status for flag creation
      setResourceStatuses(prev => ({
        ...prev, 
        flag: { status: 'loading', message: 'Creating flag...' }
      }));
      
      // Create resources
      const results = await createLaunchDarklyResources(config);
      setResult(results);
      
      // Update statuses based on results
      const newStatuses = { 
        flag: { 
          status: results.flag.error ? 'error' : 'success',
          message: results.flag.error || 'Flag created successfully!'
        },
        errorMetric: { 
          status: !config.error_metric_enabled ? 'disabled' : 
                  results.metrics.error?.error ? 'error' : 'success',
          message: !config.error_metric_enabled ? 'Metric disabled' :
                   results.metrics.error?.error || 'Error metric created successfully!'
        },
        latencyMetric: { 
          status: !config.latency_metric_enabled ? 'disabled' : 
                  results.metrics.latency?.error ? 'error' : 'success',
          message: !config.latency_metric_enabled ? 'Metric disabled' :
                   results.metrics.latency?.error || 'Latency metric created successfully!'
        },
        businessMetric: { 
          status: !config.business_metric_enabled ? 'disabled' : 
                  results.metrics.business?.error ? 'error' : 'success',
          message: !config.business_metric_enabled ? 'Metric disabled' :
                   results.metrics.business?.error || 'Business metric created successfully!'
        }
      };
      
      setResourceStatuses(newStatuses);
    } catch (error) {
      console.error('Error creating LaunchDarkly resources:', error);
      setError(error.message || 'An error occurred while creating resources');
      
      // Update all pending statuses to error
      setResourceStatuses(prev => {
        const updated = {...prev};
        Object.keys(updated).forEach(key => {
          if (updated[key].status === 'pending' || updated[key].status === 'loading') {
            updated[key] = { status: 'error', message: 'Failed to process' };
          }
        });
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'disabled':
        return <PendingIcon color="disabled" />;
      case 'loading':
        return <CircularProgress size={20} />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleClickOpen}
        disabled={disabled}
        fullWidth
        sx={{ mt: 2 }}
      >
        Create LaunchDarkly Resources
      </Button>
      
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Create LaunchDarkly Resources</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will create the following resources in LaunchDarkly based on your configuration:
          </DialogContentText>
          
          <List sx={{ mt: 2 }}>
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.flag.status)}
              </ListItemIcon>
              <ListItemText 
                primary="Boolean Flag" 
                secondary={resourceStatuses.flag.status !== 'pending' ? resourceStatuses.flag.message : 'Pending creation'} 
              />
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.errorMetric.status)}
              </ListItemIcon>
              <ListItemText 
                primary="Error Metric (lower is better)"
                secondary={resourceStatuses.errorMetric.status !== 'pending' ? resourceStatuses.errorMetric.message : 'Pending creation'} 
              />
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.latencyMetric.status)}
              </ListItemIcon>
              <ListItemText 
                primary="Latency Metric (lower is better)"
                secondary={resourceStatuses.latencyMetric.status !== 'pending' ? resourceStatuses.latencyMetric.message : 'Pending creation'} 
              />
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.businessMetric.status)}
              </ListItemIcon>
              <ListItemText 
                primary="Conversion Metric (higher is better)"
                secondary={resourceStatuses.businessMetric.status !== 'pending' ? resourceStatuses.businessMetric.message : 'Pending creation'} 
              />
            </ListItem>
          </List>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          {result && !error && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Resources created successfully!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
          <Button 
            onClick={handleCreate} 
            color="primary" 
            variant="contained"
            disabled={loading || !!result}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Creating...' : result ? 'Created' : 'Create Resources'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LaunchDarklyResourceCreator; 