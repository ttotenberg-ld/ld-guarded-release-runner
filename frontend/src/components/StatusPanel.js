import React from 'react';
import { Box, Typography, Grid, Paper, Chip, Divider, Card, CardContent, Stack } from '@mui/material';

// Format number with specified decimal places
const formatNumber = (num, decimals = 1) => {
  if (num === undefined || num === null) return '0';
  return Number(num).toFixed(decimals);
};

// Stat display component for consistent styling
const StatDisplay = ({ label, value, unit = '', color = 'warning.main', subtitle = null }) => (
  <Box sx={{ textAlign: 'center', mb: 1.5, p: 0.75, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.05)' }}>
    <Typography 
      variant="body2" 
      display="block" 
      sx={{ fontWeight: 'medium' }}
    >
      {label}
    </Typography>
    <Typography 
      variant="h6" 
      color={color} 
      sx={{ fontWeight: 'bold', lineHeight: 1.1, my: 0.5, fontSize: '1.125rem' }}
    >
      {value}{unit}
    </Typography>
    {subtitle && (
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ fontSize: '0.75rem', display: 'block', opacity: 0.7 }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

// Format stats for display
const formatStats = (stats) => {
  if (!stats) return { 
    errorRate: '0', 
    avgLatency: '0', 
    businessRate: '0',
    errorCount: 0,
    errorTotal: 0,
    latencyCount: 0,
    businessCount: 0,
    businessTotal: 0
  };
  
  return {
    errorRate: formatNumber(stats.error_rate.avg),
    avgLatency: formatNumber(stats.latency.avg),
    businessRate: formatNumber(stats.business.avg),
    errorCount: stats.error_rate.sum,
    errorTotal: stats.error_rate.count,
    latencyCount: stats.latency.count,
    businessCount: stats.business.sum,
    businessTotal: stats.business.count
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
          p: 1.5, 
          textAlign: 'center',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderColor: 'warning.main',
          mb: 2,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 'bold', 
            textTransform: 'uppercase', 
            letterSpacing: 0.5, 
            ml: 1,
            fontSize: '1rem' 
          }}
        >
          Events Sent
        </Typography>
        <Typography 
          variant="h5" 
          component="div" 
          color="warning.main" 
          sx={{ fontWeight: 'bold', mr: 1, fontSize: '1.5rem' }}
        >
          {status.events_sent.toLocaleString()}
        </Typography>
      </Paper>
      
      {/* Guarded Rollout Status */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 1.5, 
          textAlign: 'center',
          backgroundColor: status.guarded_rollout_active ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
          borderColor: status.guarded_rollout_active ? 'success.main' : 'error.main',
          mb: 2,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 'bold', 
            textTransform: 'uppercase', 
            letterSpacing: 0.5, 
            ml: 1,
            fontSize: '1rem' 
          }}
        >
          Guarded Rollout
        </Typography>
        <Chip
          label={status.guarded_rollout_active ? 'ACTIVE' : 'INACTIVE'}
          color={status.guarded_rollout_active ? 'success' : 'error'}
          variant="filled"
          size="small"
          sx={{ fontWeight: 'bold', mr: 1 }}
        />
      </Paper>
      
      {/* Statistics Section */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'divider',
          borderRadius: 1.5
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1.5, 
            fontSize: '1rem'
          }}
        >
          Aggregated Statistics
        </Typography>
        
        <Grid container spacing={1.5}>
          {/* Control Group */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', height: '100%' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'text.primary', 
                    mb: 1,
                    fontSize: '1rem'
                  }}
                >
                  Control Group
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                
                <StatDisplay 
                  label="Error Rate" 
                  value={controlStats.errorRate} 
                  unit="%" 
                  color="error.main"
                  subtitle={`${controlStats.errorCount} errors out of ${controlStats.errorTotal} events`}
                />
                
                <StatDisplay 
                  label="Latency" 
                  value={controlStats.avgLatency} 
                  unit=" ms"
                  subtitle={`Average across ${controlStats.latencyCount} events`}
                />
                
                <StatDisplay 
                  label="Conversion Rate" 
                  value={controlStats.businessRate} 
                  unit="%" 
                  color="success.main"
                  subtitle={`${controlStats.businessCount} conversions out of ${controlStats.businessTotal} events`}
                />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Treatment Group */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', height: '100%' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'text.primary', 
                    mb: 1,
                    fontSize: '1rem'
                  }}
                >
                  Treatment Group
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                
                <StatDisplay 
                  label="Error Rate" 
                  value={treatmentStats.errorRate} 
                  unit="%" 
                  color="error.main"
                  subtitle={`${treatmentStats.errorCount} errors out of ${treatmentStats.errorTotal} events`}
                />
                
                <StatDisplay 
                  label="Latency" 
                  value={treatmentStats.avgLatency} 
                  unit=" ms"
                  subtitle={`Average across ${treatmentStats.latencyCount} events`}
                />
                
                <StatDisplay 
                  label="Conversion Rate" 
                  value={treatmentStats.businessRate} 
                  unit="%" 
                  color="success.main"
                  subtitle={`${treatmentStats.businessCount} conversions out of ${treatmentStats.businessTotal} events`}
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
            p: 1.5, 
            backgroundColor: 'rgba(211, 47, 47, 0.1)',
            borderColor: 'error.main',
            mt: 2,
            borderRadius: 1.5
          }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 'bold', 
              color: 'error.main', 
              mb: 0.5,
              fontSize: '1rem'
            }}
          >
            Last Error
          </Typography>
          <Typography 
            variant="body2" 
            color="error.main"
            sx={{ fontSize: '0.875rem' }}
          >
            {status.last_error}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default StatusPanel;
