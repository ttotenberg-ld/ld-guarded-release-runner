import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Configure axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to make API requests via the proxy
const makeProxyRequest = async (url, method, payload, api_key) => {
  try {
    const response = await api.post('/ld-api-proxy/proxy', {
      url,
      method,
      payload,
      api_key
    });
    
    if (!response.data.success) {
      return { 
        error: `API Error: ${response.data.status_code} - ${response.data.data?.message || 'Unknown error'}` 
      };
    }
    
    return response.data.data;
  } catch (error) {
    // Extract the most useful error message
    let errorMessage = 'Unknown error occurred';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const data = error.response.data;
      errorMessage = data.detail || data.message || `API Error: ${error.response.status}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from server. Please check your network connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
    }
    
    return { error: errorMessage };
  }
};

/**
 * Creates resources in LaunchDarkly based on the provided configuration
 * @param {Object} config - The configuration from the form
 * @returns {Promise<Object>} - The result of the resource creation
 */
export const createLaunchDarklyResources = async (config) => {
  try {
    // Create flag first
    const flagResponse = await createFlag(config);
    
    const results = {
      flag: flagResponse,
      metrics: {
        error: null,
        latency: null,
        business: null
      }
    };
    
    // Create metrics based on toggles
    if (config.error_metric_enabled) {
      results.metrics.error = await createErrorMetric(config);
    }
    
    if (config.latency_metric_enabled) {
      results.metrics.latency = await createLatencyMetric(config);
    }
    
    if (config.business_metric_enabled) {
      results.metrics.business = await createBusinessMetric(config);
    }
    
    return results;
  } catch (error) {
    console.error('Error creating LaunchDarkly resources:', error);
    throw error;
  }
};

/**
 * Creates a boolean flag in LaunchDarkly
 * @param {Object} config - The configuration object
 * @returns {Promise<Object>} - The API response
 */
const createFlag = async (config) => {
  const { api_key, project_key, flag_key } = config;
  
  const url = `https://app.launchdarkly.com/api/v2/flags/${project_key}`;
  
  const payload = {
    name: flag_key,
    key: flag_key,
    description: 'Created by the LaunchDarkly Guarded Rollout Runner',
    variations: [
      {
        value: true,
        name: 'True',
        description: 'Treatment'
      },
      {
        value: false,
        name: 'False',
        description: 'Control'
      }
    ],
    temporary: false,
    tags: ['guarded-rollout-runner'],
    defaults: {
      onVariation: 0,
      offVariation: 1
    },
    clientSideAvailability: {
      usingMobileKey: false,
      usingEnvironmentId: true
    }
  };
  
  return makeProxyRequest(url, 'post', payload, api_key);
};

/**
 * Creates an occurrence metric for errors (lower is better)
 * @param {Object} config - The configuration object
 * @returns {Promise<Object>} - The API response
 */
const createErrorMetric = async (config) => {
  const { api_key, project_key, error_metric_1 } = config;
  
  const url = `https://app.launchdarkly.com/api/v2/metrics/${project_key}`;
  
  const payload = {
    key: `${error_metric_1}`,
    name: `${error_metric_1}`,
    kind: 'custom',
    isNumeric: false,
    tags: ['guarded-rollout-runner'],
    description: 'Tracks error occurrences - lower is better',
    unit: '',
    eventKey: error_metric_1,
    selector: null,
    successCriteria: 'LowerThanBaseline',
    randomizationUnits: ['user'],
    unitAggregationType: 'average'
  };
  
  return makeProxyRequest(url, 'post', payload, api_key);
};

/**
 * Creates a numeric average metric for latency (lower is better)
 * @param {Object} config - The configuration object
 * @returns {Promise<Object>} - The API response
 */
const createLatencyMetric = async (config) => {
  const { api_key, project_key, latency_metric_1 } = config;
  
  const url = `https://app.launchdarkly.com/api/v2/metrics/${project_key}`;
  
  const payload = {
    key: `${latency_metric_1}`,
    kind: 'custom',
    name: `${latency_metric_1}`,
    isNumeric: true,
    tags: ['guarded-rollout-runner'],
    description: 'Tracks latency in milliseconds - lower is better',
    unit: 'ms',
    eventKey: latency_metric_1,
    selector: 'value',
    successCriteria: 'LowerThanBaseline',
    randomizationUnits: ['user'],
    unitAggregationType: 'average'
  };
  
  return makeProxyRequest(url, 'post', payload, api_key);
};

/**
 * Creates an occurrence metric for business/conversion (higher is better)
 * @param {Object} config - The configuration object
 * @returns {Promise<Object>} - The API response
 */
const createBusinessMetric = async (config) => {
  const { api_key, project_key, business_metric_1 } = config;
  
  const url = `https://app.launchdarkly.com/api/v2/metrics/${project_key}`;
  
  const payload = {
    key: `${business_metric_1}`,
    name: `${business_metric_1}`,
    kind: 'custom',
    isNumeric: false,
    tags: ['guarded-rollout-runner'],
    description: 'Tracks conversion events - higher is better',
    unit: '',
    eventKey: business_metric_1,
    selector: null,
    successCriteria: 'HigherThanBaseline',
    randomizationUnits: ['user'],
    unitAggregationType: 'average'
  };
  
  return makeProxyRequest(url, 'post', payload, api_key);
}; 