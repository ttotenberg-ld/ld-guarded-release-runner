import React, { useState } from 'react';
import { Box, TextField, Button, Alert, Grid, InputAdornment, Typography, Divider, Paper } from '@mui/material';
import { startSimulation } from '../api/simulationApi';

// Default configuration with placeholder values
const DEFAULT_CONFIG = {
  sdk_key: '',
  api_key: '',
  project_key: '',
  flag_key: '',
  latency_metric_1: 'latency',
  error_metric_1: 'error-rate',
  business_metric_1: 'conversion',
  latency_metric_1_false_range: [50, 100],
  latency_metric_1_true_range: [75, 125],
  error_metric_1_false_converted: 5,
  error_metric_1_true_converted: 10,
  business_metric_1_false_converted: 10,
  business_metric_1_true_converted: 15
};

const ConfigForm = ({ disabled }) => {
  const [config, setConfig] = useState(() => {
    // Try to load from localStorage
    const savedConfig = localStorage.getItem('ldConfig');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (e) {
        console.error('Error parsing saved config:', e);
      }
    }
    return DEFAULT_CONFIG;
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = value;
    
    // Handle array inputs
    if (name.includes('range')) {
      try {
        // For range fields, keep the string value in the input
        // but parse it when submitting
        setConfig(prev => ({
          ...prev,
          [name]: value
        }));
        return;
      } catch (error) {
        console.error('Error handling range:', error);
      }
    }
    
    // Handle percentage inputs
    if (name.includes('converted')) {
      parsedValue = parseInt(value, 10);
    }
    
    setConfig(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      // Validate config
      if (!config.sdk_key || !config.api_key || !config.project_key || !config.flag_key) {
        throw new Error('All required fields must be filled');
      }
      
      // Parse range values before submitting
      const submissionConfig = { ...config };
      
      // Process the ranges
      ['latency_metric_1_false_range', 'latency_metric_1_true_range'].forEach(rangeKey => {
        if (typeof submissionConfig[rangeKey] === 'string') {
          try {
            const values = submissionConfig[rangeKey].split(',').map(v => parseInt(v.trim(), 10));
            // Filter out NaN values
            const validValues = values.filter(v => !isNaN(v));
            
            // Ensure array has exactly 2 elements
            if (validValues.length !== 2) {
              throw new Error(`${rangeKey} must have exactly 2 values`);
            }
            
            submissionConfig[rangeKey] = validValues;
          } catch (err) {
            throw new Error(`Invalid range format for ${rangeKey}: ${err.message}`);
          }
        }
      });
      
      // Save to localStorage
      localStorage.setItem('ldConfig', JSON.stringify(submissionConfig));
      
      // Submit configuration to start simulation
      await startSimulation(submissionConfig);
      setSuccess('Simulation started successfully!');
    } catch (error) {
      console.error('Error starting simulation:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to start simulation');
    }
  };
  
  // Helper for range inputs display
  const formatRange = (range) => {
    if (Array.isArray(range)) {
      return range.join(', ');
    }
    return range || '';
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ '& .MuiTextField-root': { my: 1 } }}>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
      
      {/* Section 1: SDK key, API key, Project key, Flag key */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
            LaunchDarkly Connection
          </Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1.5}>
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
              type="password"
              helperText="Your LaunchDarkly server-side SDK Key"
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
              type="password"
              helperText="Your LaunchDarkly API Key with read permissions to flags"
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
              helperText="Flag key to evaluate and send events to"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Section 2: Error metric name, control conversion rate, treatment conversion rate */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
            Error Metric Configuration
          </Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <TextField
              name="error_metric_1"
              label="Error Metric Name"
              value={config.error_metric_1}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              placeholder="error-rate"
              helperText="e.g., error-rate"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="error_metric_1_false_converted"
              label="Control Conversion Rate"
              value={config.error_metric_1_false_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              type="number"
              placeholder="5"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Percentage when flag returns false (control)"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="error_metric_1_true_converted"
              label="Treatment Conversion Rate"
              value={config.error_metric_1_true_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              type="number"
              placeholder="10"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Percentage when flag returns true (treatment)"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Section 3: Latency metric name, control range, treatment range */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
            Latency Configuration
          </Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <TextField
              name="latency_metric_1"
              label="Latency Metric Name"
              value={config.latency_metric_1}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              placeholder="latency"
              helperText="e.g., latency"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="latency_metric_1_false_range"
              label="Control Range"
              value={formatRange(config.latency_metric_1_false_range)}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              placeholder="50, 100"
              helperText="Min, Max values when flag returns false (control)"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="latency_metric_1_true_range"
              label="Treatment Range"
              value={formatRange(config.latency_metric_1_true_range)}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              placeholder="75, 125"
              helperText="Min, Max values when flag returns true (treatment)"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Section 4: Business metric name, control conversion rate, treatment conversion rate */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
            Business Conversion Configuration
          </Typography>
          <Divider sx={{ flex: 1, ml: 1 }} />
        </Box>
        
        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <TextField
              name="business_metric_1"
              label="Business Metric Name"
              value={config.business_metric_1}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              placeholder="payment-success"
              helperText="e.g., conversion, purchase-success, signup-success"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="business_metric_1_false_converted"
              label="Control Conversion Rate"
              value={config.business_metric_1_false_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              type="number"
              placeholder="10"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Percentage when flag returns false (control)"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="business_metric_1_true_converted"
              label="Treatment Conversion Rate"
              value={config.business_metric_1_true_converted}
              onChange={handleChange}
              required
              fullWidth
              disabled={disabled}
              size="small"
              type="number"
              placeholder="15"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Percentage when flag returns true (treatment)"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={disabled}
          size="medium"
        >
          Start Simulation
        </Button>
      </Box>
    </Box>
  );
};

export default ConfigForm;
