import React from 'react';
import { Box, Typography, Grid, Paper, Chip } from '@mui/material';

const StatusPanel = ({ status }) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            textAlign: 'center',
            backgroundColor: status.running ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
            borderColor: status.running ? 'success.main' : 'error.main'
          }}
        >
          <Typography variant="overline" display="block" gutterBottom>
            Simulation
          </Typography>
          <Chip 
            label={status.running ? 'Running' : 'Stopped'} 
            color={status.running ? 'success' : 'error'}
            sx={{ fontWeight: 'bold' }}
          />
        </Paper>
      </Grid>
      
      <Grid item xs={12} sm={8}>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            textAlign: 'center',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            borderColor: 'primary.main',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <Typography variant="overline" display="block" gutterBottom>
            Events Sent
          </Typography>
          <Typography variant="h3" component="div" color="primary.main">
            {status.events_sent.toLocaleString()}
          </Typography>
        </Paper>
      </Grid>
      
      {status.last_error && (
        <Grid item xs={12}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              borderColor: 'error.main'
            }}
          >
            <Typography variant="overline" display="block" gutterBottom color="error">
              Last Error
            </Typography>
            <Typography variant="body2" color="error.main">
              {status.last_error}
            </Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default StatusPanel;
