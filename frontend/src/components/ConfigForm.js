import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Alert, Grid, InputAdornment, Typography, Divider, Paper, 
         Switch, FormControlLabel, Chip } from '@mui/material';
import { startSimulation } from '../api/simulationApi';
import { getEnvironmentKey } from '../api/launchDarklyApi';
import LaunchDarklyResourceCreator from './LaunchDarklyResourceCreator';

// Default configuration with placeholder values
const DEFAULT_CONFIG = {
  sdk_key: '',
  api_key: '',
  project_key: 'default',
  flag_key: 'test-flag',
  environment_key: '',
  latency_metric_1: 'latency',
  error_metric_1: 'error-rate',
  business_metric_1: 'purchase-completion',
  latency_metric_1_false_range: [50, 100],
  latency_metric_1_true_range: [75, 125],
  error_metric_1_false_converted: 5,
  error_metric_1_true_converted: 10,
  business_metric_1_false_converted: 15,
  business_metric_1_true_converted: 20,
  error_metric_enabled: true,
  latency_metric_enabled: true,
  business_metric_enabled: true
};

const ConfigForm = ({ disabled }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [savedToStorage, setSavedToStorage] = useState({
    sdk_key: false,
    api_key: false
  });
  const [environment, setEnvironment] = useState('');
  
  const [config, setConfig] = useState(() => {
    const savedConfig = localStorage.getItem('ldConfig');
    
    let initialConfig = {
      sdk_key: '',
      api_key: '',
      project_key: 'default',
      flag_key: 'test-flag',
      environment_key: '',
      latency_metric_1: 'latency',
      error_metric_1: 'error-rate',
      business_metric_1: 'purchase-completion',
      latency_metric_1_false_range: [50, 100],
      latency_metric_1_true_range: [75, 125],
      error_metric_1_false_converted: 5,
      error_metric_1_true_converted: 10,
      business_metric_1_false_converted: 15,
      business_metric_1_true_converted: 20,
      error_metric_enabled: true,
      latency_metric_enabled: true,
      business_metric_enabled: true
    };
    
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        initialConfig = { ...initialConfig, ...parsedConfig };
        
        // If SDK key exists in saved config, mark it as saved
        if (parsedConfig.sdk_key) {
          setSavedToStorage(prev => ({
            ...prev,
            sdk_key: true
          }));
        }
        
        // If API key exists in saved config, mark it as saved
        if (parsedConfig.api_key) {
          setSavedToStorage(prev => ({
            ...prev,
            api_key: true
          }));
        }
        
        // If environment_key exists, set it in state
        if (parsedConfig.environment_key) {
          setEnvironment(parsedConfig.environment_key);
        }
      } catch (e) {
        console.error('Error parsing saved config:', e);
      }
    }
    
    return initialConfig;
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]: value
    });
    
    // If SDK key or API key changed, reset the saved status
    if (name === 'sdk_key' || name === 'api_key') {
      setSavedToStorage(prev => ({
        ...prev,
        [name]: false
      }));
      
      // If SDK key changed, reset environment
      if (name === 'sdk_key') {
        setEnvironment('');
      }
    }
    
    // Clear error/success when changing values
    setError(null);
    setSuccess(null);
  };

  // Handle toggle changes
  const handleToggleChange = (e) => {
    const { name, checked } = e.target;
    console.log(`Toggle changed: ${name} = ${checked}`);
    
    // Create updated config
    const updatedConfig = {
      ...config,
      [name]: checked
    };
    
    // Update state
    setConfig(updatedConfig);
    
    // Save to localStorage immediately to ensure changes persist
    // Create a submission copy to ensure proper formatting
    const submissionConfig = { ...updatedConfig };
    
    // Process ranges for localStorage
    ['latency_metric_1_false_range', 'latency_metric_1_true_range'].forEach(rangeKey => {
      if (typeof submissionConfig[rangeKey] === 'string') {
        try {
          const values = submissionConfig[rangeKey].split(',').map(v => parseInt(v.trim(), 10));
          const validValues = values.filter(v => !isNaN(v));
          if (validValues.length === 2) {
            submissionConfig[rangeKey] = validValues;
          } else {
            submissionConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
          }
        } catch (err) {
          submissionConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
        }
      }
    });
    
    // Ensure toggle states are strictly boolean
    ['error_metric_enabled', 'latency_metric_enabled', 'business_metric_enabled'].forEach(toggleKey => {
      submissionConfig[toggleKey] = submissionConfig[toggleKey] === true;
    });
    
    console.log(`Saving toggle state: ${name} = ${submissionConfig[name]}`);
    localStorage.setItem('ldConfig', JSON.stringify(submissionConfig));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config.sdk_key || !config.api_key || !config.project_key || !config.flag_key) {
      setError('Please fill out all required fields!');
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      
      const submissionConfig = { ...config };
      
      // Process range inputs to ensure they are arrays
      ['latency_metric_1_false_range', 'latency_metric_1_true_range'].forEach(rangeKey => {
        if (typeof submissionConfig[rangeKey] === 'string') {
          try {
            const values = submissionConfig[rangeKey].split(',').map(v => parseInt(v.trim(), 10));
            const validValues = values.filter(v => !isNaN(v));
            if (validValues.length === 2) {
              submissionConfig[rangeKey] = validValues;
            } else {
              submissionConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
            }
          } catch (err) {
            submissionConfig[rangeKey] = rangeKey.includes('false') ? [50, 125] : [52, 131];
          }
        } else if (!Array.isArray(submissionConfig[rangeKey])) {
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
        console.log(`Saving ${toggleKey}: ${submissionConfig[toggleKey]}`);
      });
      
      // Try to get the environment key if we don't have it
      if (!submissionConfig.environment_key && submissionConfig.sdk_key && submissionConfig.api_key && submissionConfig.project_key) {
        try {
          const envKey = await getEnvironmentKey(submissionConfig);
          if (envKey) {
            submissionConfig.environment_key = envKey;
            setEnvironment(envKey);
          }
        } catch (envError) {
          console.error('Error fetching environment key:', envError);
        }
      }
      
      // Save to localStorage
      localStorage.setItem('ldConfig', JSON.stringify(submissionConfig));
      
      // Mark SDK and API keys as saved
      setSavedToStorage({
        sdk_key: true,
        api_key: true
      });
      
      // Submit configuration to start simulation
      await startSimulation(submissionConfig);
      setSuccess('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to save configuration');
    }
  };
  
  // Helper for range inputs display
  const formatRange = (range) => {
    if (Array.isArray(range)) {
      return range.join(', ');
    } else if (typeof range === 'string') {
      return range;
    } else if (range === undefined || range === null) {
      return '';
    }
    // Convert anything else to string
    return String(range);
  };
  
  // Common styles for all sections
  const sectionStyle = { p: 1.2, mb: 1.2 };
  const headerStyle = { 
    display: 'flex', 
    alignItems: 'center', 
    mb: 0.3
  };
  
  const titleStyle = {
    fontSize: '1rem', 
    fontWeight: 'bold',
    color: 'warning.main',
    flexShrink: 0
  };

  const formLabelStyle = {
    margin: 0, 
    '& .MuiFormControlLabel-label': {
      fontSize: '0.875rem'
    }
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ 
      '& .MuiTextField-root': { my: 0.5 },
      '& .MuiFormHelperText-root': { margin: 0, fontSize: '0.75rem' },
      '& .MuiInputLabel-root': { fontSize: '0.875rem' },
      '& .MuiInputBase-input': { fontSize: '0.875rem' }
    }}>
      {error && <Alert severity="error" sx={{ mb: 1, py: 0.5, fontSize: '0.875rem' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1, py: 0.5, fontSize: '0.875rem' }}>{success}</Alert>}
      
      {/* Section 1: SDK key, API key, Project key, Flag key */}
      <Paper sx={sectionStyle}>
        <Box sx={headerStyle}>
          <Typography variant="body1" sx={titleStyle}>LaunchDarkly Connection</Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1}>
          <Grid item xs={12} md={6}>
            <TextField
              name="sdk_key"
              label="SDK Key"
              value={config.sdk_key}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              type={savedToStorage.sdk_key ? "password" : "text"}
              margin="dense"
              helperText={
                environment ? 
                `Your LaunchDarkly server-side SDK Key (Environment: ${environment})` : 
                "Your LaunchDarkly server-side SDK Key"
              }
              InputProps={{
                endAdornment: environment && savedToStorage.sdk_key ? (
                  <InputAdornment position="end">
                    <Chip 
                      label={`Environment: ${environment}`} 
                      size="small" 
                      color="warning" 
                      sx={{ 
                        height: '22px', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: '#f59e0b',
                        '& .MuiChip-label': { 
                          padding: '0 8px' 
                        }
                      }} 
                    />
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="api_key"
              label="API Key"
              value={config.api_key}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              type={savedToStorage.api_key ? "password" : "text"}
              margin="dense"
              helperText="Your LaunchDarkly API Key with read + write permissions"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="project_key"
              label="Project Key"
              value={config.project_key}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              margin="dense"
              helperText="Project where the flag exists"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="flag_key"
              label="Flag Key"
              value={config.flag_key}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              margin="dense"
              helperText="Flag key to evaluate and send events to (✨ Auto-creatable ✨)"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Section 2: Error metric name, control conversion rate, treatment conversion rate */}
      <Paper sx={sectionStyle}>
        <Box sx={headerStyle}>
          <FormControlLabel 
            control={
              <Switch 
                checked={config.error_metric_enabled} 
                onChange={handleToggleChange}
                name="error_metric_enabled"
                disabled={disabled}
                size="small"
                color="warning"
              />
            }
            label=""
            sx={formLabelStyle}
          />
          <Typography variant="body1" sx={titleStyle}>Error Metric Configuration</Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1}>
          <Grid item xs={12} md={4}>
            <TextField
              name="error_metric_1"
              label="Error Metric Key"
              value={config.error_metric_1}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.error_metric_enabled}
              size="small"
              margin="dense"
              placeholder="error-rate"
              helperText="e.g., error-rate (✨ Auto-creatable ✨)"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              name="error_metric_1_false_converted"
              label="Control Rate"
              value={config.error_metric_1_false_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.error_metric_enabled}
              size="small"
              margin="dense"
              type="number"
              placeholder="5"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="% when flag returns false (control)"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              name="error_metric_1_true_converted"
              label="Treatment Rate"
              value={config.error_metric_1_true_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.error_metric_enabled}
              size="small"
              margin="dense"
              type="number"
              placeholder="10"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="% when flag returns true (treatment)"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Section 3: Latency metric name, control range, treatment range */}
      <Paper sx={sectionStyle}>
        <Box sx={headerStyle}>
          <FormControlLabel 
            control={
              <Switch 
                checked={config.latency_metric_enabled} 
                onChange={handleToggleChange}
                name="latency_metric_enabled"
                disabled={disabled}
                size="small"
                color="warning"
              />
            }
            label=""
            sx={formLabelStyle}
          />
          <Typography variant="body1" sx={titleStyle}>Latency Configuration</Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1}>
          <Grid item xs={12} md={4}>
            <TextField
              name="latency_metric_1"
              label="Latency Metric Key"
              value={config.latency_metric_1}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.latency_metric_enabled}
              size="small"
              margin="dense"
              placeholder="latency"
              helperText="e.g., latency (✨ Auto-creatable ✨)"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              name="latency_metric_1_false_range"
              label="Control Range"
              value={formatRange(config.latency_metric_1_false_range)}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.latency_metric_enabled}
              size="small"
              margin="dense"
              placeholder="50, 100"
              helperText="Min, Max for control (comma-separated)"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              name="latency_metric_1_true_range"
              label="Treatment Range"
              value={formatRange(config.latency_metric_1_true_range)}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.latency_metric_enabled}
              size="small"
              margin="dense"
              placeholder="75, 125"
              helperText="Min, Max for treatment (comma-separated)"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Section 4: Business metric name, control conversion rate, treatment conversion rate */}
      <Paper sx={sectionStyle}>
        <Box sx={headerStyle}>
          <FormControlLabel 
            control={
              <Switch 
                checked={config.business_metric_enabled} 
                onChange={handleToggleChange}
                name="business_metric_enabled"
                disabled={disabled}
                size="small"
                color="warning"
              />
            }
            label=""
            sx={formLabelStyle}
          />
          <Typography variant="body1" sx={titleStyle}>Business Conversion Configuration</Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1}>
          <Grid item xs={12} md={4}>
            <TextField
              name="business_metric_1"
              label="Business Metric Key"
              value={config.business_metric_1}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.business_metric_enabled}
              size="small"
              margin="dense"
              placeholder="purchase-completion"
              helperText="e.g., purchase-completion (✨ Auto-creatable ✨)"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              name="business_metric_1_false_converted"
              label="Control Rate"
              value={config.business_metric_1_false_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.business_metric_enabled}
              size="small"
              margin="dense"
              type="number"
              placeholder="15"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="% when flag returns false (control)"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              name="business_metric_1_true_converted"
              label="Treatment Rate"
              value={config.business_metric_1_true_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled || !config.business_metric_enabled}
              size="small"
              margin="dense"
              type="number"
              placeholder="5"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="% when flag returns true (treatment)"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Hidden submit button to enable form submission on Enter key */}
      <Button 
        type="submit" 
        sx={{ display: 'none' }}
        disabled={disabled}
      >
        Save
      </Button>
      <br />
      <br />
      <LaunchDarklyResourceCreator disabled={disabled} />
    </Box>
  );
};

export default ConfigForm;
