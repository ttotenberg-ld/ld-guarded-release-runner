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
        submissionConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
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
  const [configValues, setConfigValues] = useState({
    flag_key: '',
    error_metric_1: '',
    latency_metric_1: '',
    business_metric_1: '',
    error_metric_enabled: true,
    latency_metric_enabled: true,
    business_metric_enabled: true
  });
  const [resourceStatuses, setResourceStatuses] = useState({
    flag: { status: 'pending', message: '' },
    errorMetric: { status: 'pending', message: '' },
    latencyMetric: { status: 'pending', message: '' },
    businessMetric: { status: 'pending', message: '' },
    metricAttachment: { status: 'pending', message: '' }
  });

  const handleClickOpen = () => {
    setOpen(true);
    // Reset states
    setLoading(false);
    setError(null);
    setResult(null);
    
    // Get the current form values directly from the form elements
    const formElements = document.querySelectorAll('input[name], textarea[name]');
    let currentConfig = {};
    
    // First get the saved config as a base
    try {
      const savedConfig = localStorage.getItem('ldConfig');
      if (savedConfig) {
        currentConfig = JSON.parse(savedConfig);
      }
      
      // Update with latest values from the form
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
      
      // Update display values with current form values
      setConfigValues({
        flag_key: currentConfig.flag_key || '',
        error_metric_1: currentConfig.error_metric_1 || '',
        latency_metric_1: currentConfig.latency_metric_1 || '',
        business_metric_1: currentConfig.business_metric_1 || '',
        error_metric_enabled: currentConfig.error_metric_enabled !== false,
        latency_metric_enabled: currentConfig.latency_metric_enabled !== false,
        business_metric_enabled: currentConfig.business_metric_enabled !== false
      });
    } catch (error) {
      console.error('Error loading config values:', error);
    }
    
    setResourceStatuses({
      flag: { status: 'pending', message: '' },
      errorMetric: { status: 'pending', message: '' },
      latencyMetric: { status: 'pending', message: '' },
      businessMetric: { status: 'pending', message: '' },
      metricAttachment: { status: 'pending', message: '' }
    });
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current form values directly from the DOM to ensure we have the latest values
      // even if the user hasn't clicked Save in the ConfigForm
      const formElements = document.querySelectorAll('input[name], textarea[name]');
      let currentConfig = {};
      
      // First get the saved config as a base
      const savedConfig = localStorage.getItem('ldConfig');
      if (savedConfig) {
        currentConfig = JSON.parse(savedConfig);
      }
      
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
      
      // Basic validation
      if (!currentConfig.sdk_key || !currentConfig.api_key || !currentConfig.project_key || !currentConfig.flag_key) {
        throw new Error('All required fields must be filled');
      }
      
      // Process and save the configuration to ensure we have the latest values
      currentConfig = saveConfiguration(currentConfig);
      
      // Update display values with the latest config
      setConfigValues({
        flag_key: currentConfig.flag_key || '',
        error_metric_1: currentConfig.error_metric_1 || '',
        latency_metric_1: currentConfig.latency_metric_1 || '',
        business_metric_1: currentConfig.business_metric_1 || '',
        error_metric_enabled: currentConfig.error_metric_enabled !== false,
        latency_metric_enabled: currentConfig.latency_metric_enabled !== false,
        business_metric_enabled: currentConfig.business_metric_enabled !== false
      });
      
      // Update status for flag creation
      setResourceStatuses(prev => ({
        ...prev, 
        flag: { status: 'loading', message: 'Creating flag...' }
      }));
      
      // Create resources - pass the entire configuration without altering metric keys
      const results = await createLaunchDarklyResources(currentConfig);
      setResult(results);
      
      // Update statuses based on results
      const newStatuses = { 
        flag: { 
          status: results.flag.error ? 'error' : 'success',
          message: results.flag.error || 'Flag created successfully!'
        },
        errorMetric: { 
          status: !currentConfig.error_metric_enabled ? 'disabled' : 
                  results.metrics.error?.error ? 'error' : 'success',
          message: !currentConfig.error_metric_enabled ? 'Metric disabled' :
                   results.metrics.error?.error || 'Error metric created successfully!'
        },
        latencyMetric: { 
          status: !currentConfig.latency_metric_enabled ? 'disabled' : 
                  results.metrics.latency?.error ? 'error' : 'success',
          message: !currentConfig.latency_metric_enabled ? 'Metric disabled' :
                   results.metrics.latency?.error || 'Latency metric created successfully!'
        },
        businessMetric: { 
          status: !currentConfig.business_metric_enabled ? 'disabled' : 
                  results.metrics.business?.error ? 'error' : 'success',
          message: !currentConfig.business_metric_enabled ? 'Metric disabled' :
                   results.metrics.business?.error || 'Business metric created successfully!'
        },
        metricAttachment: {
          status: (!currentConfig.error_metric_enabled && !currentConfig.latency_metric_enabled && !currentConfig.business_metric_enabled) ? 'disabled' :
                  results.metricAttachment?.error ? 'error' : 
                  results.metricAttachment ? 'success' : 'pending',
          message: (!currentConfig.error_metric_enabled && !currentConfig.latency_metric_enabled && !currentConfig.business_metric_enabled) ? 'No metrics to attach' :
                   results.metricAttachment?.error ? results.metricAttachment.error : 
                   results.metricAttachment ? 'Metrics attached to flag successfully!' : 'Pending...'
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
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleClickOpen}
          disabled={disabled}
          sx={{ px: 4 }}
        >
          ✨ Auto-Create LaunchDarkly Resources ✨
        </Button>
      </Box>
      
      <Dialog open={open} onClose={handleClose} maxWidth="md">
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
                primary={
                  <Box display="flex" alignItems="center">
                    <Typography fontWeight="bold" mr={1}>Boolean Flag:</Typography>
                    <Typography color="info.main" fontFamily="monospace">
                      {configValues.flag_key || 'Not set'}
                    </Typography>
                  </Box>
                }
                secondary={resourceStatuses.flag.status !== 'pending' ? resourceStatuses.flag.message : 'Pending creation'} 
              />
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.errorMetric.status)}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box display="flex" alignItems="center" sx={{ opacity: configValues.error_metric_enabled ? 1 : 0.5 }}>
                    <Typography fontWeight="bold" mr={1}>Error Metric (lower is better):</Typography>
                    <Typography color="info.main" fontFamily="monospace">
                      {configValues.error_metric_enabled 
                        ? configValues.error_metric_1 || 'Not set'
                        : 'Disabled'}
                    </Typography>
                  </Box>
                }
                secondary={resourceStatuses.errorMetric.status !== 'pending' ? resourceStatuses.errorMetric.message : 'Pending creation'} 
              />
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.latencyMetric.status)}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box display="flex" alignItems="center" sx={{ opacity: configValues.latency_metric_enabled ? 1 : 0.5 }}>
                    <Typography fontWeight="bold" mr={1}>Latency Metric (lower is better):</Typography>
                    <Typography color="info.main" fontFamily="monospace">
                      {configValues.latency_metric_enabled 
                        ? configValues.latency_metric_1 || 'Not set'
                        : 'Disabled'}
                    </Typography>
                  </Box>
                }
                secondary={resourceStatuses.latencyMetric.status !== 'pending' ? resourceStatuses.latencyMetric.message : 'Pending creation'} 
              />
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.businessMetric.status)}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box display="flex" alignItems="center" sx={{ opacity: configValues.business_metric_enabled ? 1 : 0.5 }}>
                    <Typography fontWeight="bold" mr={1}>Conversion Metric (higher is better):</Typography>
                    <Typography color="info.main" fontFamily="monospace">
                      {configValues.business_metric_enabled 
                        ? configValues.business_metric_1 || 'Not set'
                        : 'Disabled'}
                    </Typography>
                  </Box>
                }
                secondary={resourceStatuses.businessMetric.status !== 'pending' ? resourceStatuses.businessMetric.message : 'Pending creation'} 
              />
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(resourceStatuses.metricAttachment.status)}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box display="flex" alignItems="center">
                    <Typography fontWeight="bold" mr={1}>Attach Metrics to Flag:</Typography>
                    <Typography color="info.main" fontFamily="monospace">
                      {(configValues.error_metric_enabled || configValues.latency_metric_enabled || configValues.business_metric_enabled) 
                        ? 'Metrics will be attached to flag for measured rollout'
                        : 'No metrics to attach'}
                    </Typography>
                  </Box>
                }
                secondary={resourceStatuses.metricAttachment.status !== 'pending' ? resourceStatuses.metricAttachment.message : 'Pending attachment'} 
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