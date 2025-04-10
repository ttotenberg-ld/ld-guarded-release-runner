import React from 'react';
import { Box, Typography, Grid, Paper, Chip, Divider, Card, CardContent, Stack } from '@mui/material';

// Format number with specified decimal places
const formatNumber = (num, decimals = 1) => {
  if (num === 0 || !num) return '0';
  return Number(num).toFixed(decimals);
};

// Stat display component for consistent styling
const StatDisplay = ({ label, value, unit = '', color = 'warning.main' }) => (
  <Box sx={{ textAlign: 'center', mb: 1 }}>
    <Typography variant="caption" display="block" gutterBottom color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" color={color} sx={{ fontWeight: 'medium', lineHeight: 1.2 }}>
      {value}{unit}
    </Typography>
  </Box>
);

// Format stats for display
const formatStats = (stats) => {
  if (!stats) return { avgLatency: '0', errorRate: '0', businessRate: '0' };
  
  return {
    avgLatency: formatNumber(stats.latency.avg),
    errorRate: formatNumber(stats.error_rate.avg),
    businessRate: formatNumber(stats.business.avg)
  };
};

const StatusPanel = ({ status }) => {
  const controlStats = formatStats(status.stats?.control);
  const treatmentStats = formatStats(status.stats?.treatment);

  return (
    <Box>
      {/* Events Sent Counter */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          textAlign: 'center',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderColor: 'warning.main',
          mb: 2
        }}
      >
        <Typography variant="overline" display="block" gutterBottom>
          Events Sent
        </Typography>
        <Typography variant="h3" component="div" color="warning.main">
          {status.events_sent.toLocaleString()}
        </Typography>
      </Paper>
      
      {/* Statistics Section */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'divider'
        }}
      >
        <Typography variant="overline" display="block" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
          Aggregated Statistics
        </Typography>
        
        <Grid container spacing={2}>
          {/* Control Group */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                  Control Group
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <StatDisplay 
                  label="Avg Latency" 
                  value={controlStats.avgLatency} 
                  unit=" ms" 
                />
                
                <StatDisplay 
                  label="Error Rate" 
                  value={controlStats.errorRate} 
                  unit="%" 
                  color="error.main"
                />
                
                <StatDisplay 
                  label="Conversion Rate" 
                  value={controlStats.businessRate} 
                  unit="%" 
                  color="success.main"
                />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Treatment Group */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                  Treatment Group
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <StatDisplay 
                  label="Avg Latency" 
                  value={treatmentStats.avgLatency} 
                  unit=" ms" 
                />
                
                <StatDisplay 
                  label="Error Rate" 
                  value={treatmentStats.errorRate} 
                  unit="%" 
                  color="error.main"
                />
                
                <StatDisplay 
                  label="Conversion Rate" 
                  value={treatmentStats.businessRate} 
                  unit="%" 
                  color="success.main"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Last Error Display */}
      {status.last_error && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            backgroundColor: 'rgba(211, 47, 47, 0.1)',
            borderColor: 'error.main',
            mt: 2
          }}
        >
          <Typography variant="overline" display="block" gutterBottom color="error">
            Last Error
          </Typography>
          <Typography variant="body2" color="error.main">
            {status.last_error}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default StatusPanel;
