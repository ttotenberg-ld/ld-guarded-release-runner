import axios from 'axios';

// API base URL - with enhanced logging to debug Railway deployment issues
const getApiUrl = () => {
  // If running on Railway, use the internal service URL
  if (window.location.hostname.includes('railway.app')) {
    console.log('Detected Railway deployment, using internal backend URL');
    return 'http://ld-gr-backend.railway.internal';
  }
  
  // Try runtime env first
  if (window.REACT_APP_API_URL) {
    console.log('Using runtime window.REACT_APP_API_URL:', window.REACT_APP_API_URL);
    
    // Add http:// protocol if not present
    if (!window.REACT_APP_API_URL.startsWith('http://') && !window.REACT_APP_API_URL.startsWith('https://')) {
      return 'http://' + window.REACT_APP_API_URL;
    }
    return window.REACT_APP_API_URL;
  }
  
  // Try build time env next
  if (process.env.REACT_APP_API_URL) {
    console.log('Using build-time process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    
    // Add http:// protocol if not present
    if (!process.env.REACT_APP_API_URL.startsWith('http://') && !process.env.REACT_APP_API_URL.startsWith('https://')) {
      return 'http://' + process.env.REACT_APP_API_URL;
    }
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback to localhost
  console.log('No environment variables found, using localhost fallback');
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();
console.log('FINAL API URL:', API_URL);

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
