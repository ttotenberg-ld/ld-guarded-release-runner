import axios from 'axios';

// API base URL - try runtime env first, then build-time env, then fallback
// Make sure to add protocol if not present
const getApiUrl = () => {
  let url = window.REACT_APP_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // Add http:// protocol if not present
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  
  return url;
};

const API_URL = getApiUrl();
console.log('Using API URL:', API_URL);

// Configure axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Start simulation with configuration
export const startSimulation = async (config) => {
  try {
    const response = await api.post('/simulation/start', config);
    return response.data;
  } catch (error) {
    console.error('Error starting simulation:', error);
    throw error;
  }
};

// Stop simulation
export const stopSimulation = async () => {
  try {
    const response = await api.post('/simulation/stop');
    return response.data;
  } catch (error) {
    console.error('Error stopping simulation:', error);
    throw error;
  }
};

// Get simulation status
export const getStatus = async () => {
  try {
    const response = await api.get('/simulation/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching status:', error);
    throw error;
  }
};
