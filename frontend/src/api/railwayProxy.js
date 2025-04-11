/**
 * This file provides a workaround for Railway's CORS limitations 
 * by implementing a client-side proxy through the fetch API
 */

// Function to convert fetch responses to a simpler format
const processResponse = async (response) => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        data,
        status: response.status,
        ok: response.ok
      };
    } else {
      const text = await response.text();
      return {
        data: text,
        status: response.status,
        ok: response.ok
      };
    }
  } catch (error) {
    console.error('Error processing response:', error);
    return {
      data: null,
      status: response.status,
      ok: false,
      error: 'Failed to process response'
    };
  }
};

// Simple fetch wrapper with error handling
const fetchWithRetry = async (url, options, retries = 2) => {
  try {
    const response = await fetch(url, options);
    return await processResponse(response);
  } catch (error) {
    console.error(`Fetch error (retries left: ${retries}):`, error);
    if (retries > 0) {
      // Wait for a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    } else {
      return {
        data: null,
        status: 0,
        ok: false,
        error: error.message || 'Network request failed'
      };
    }
  }
};

// Railway Proxy API
const railwayProxy = {
  // Simulate axios-like interfaces
  get: async (path) => {
    console.log(`[Railway Proxy] GET ${path}`);
    const backendUrl = 'https://ld-gr-backend.railway.app';
    const url = `${backendUrl}${path}`;
    
    return fetchWithRetry(url, {
      method: 'GET',
      credentials: 'omit', // Don't include cookies to avoid CORS issues
      headers: {
        'Accept': 'application/json',
      }
    });
  },
  
  post: async (path, data) => {
    console.log(`[Railway Proxy] POST ${path}`, data);
    const backendUrl = 'https://ld-gr-backend.railway.app';
    const url = `${backendUrl}${path}`;
    
    return fetchWithRetry(url, {
      method: 'POST',
      credentials: 'omit', // Don't include cookies to avoid CORS issues
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data)
    });
  }
};

export default railwayProxy; 