import axios from 'axios';

// API base URL - dynamic based on environment
const getApiUrl = () => {
  // If running on Railway, use the correct public backend URL
  if (window.location.hostname.includes('railway.app')) {
    const backendUrl = 'https://ld-gr-backend-production.up.railway.app';
    console.log('LaunchDarklyApi: Using backend URL:', backendUrl);
    return backendUrl;
  }
  
  // Try runtime env first
  if (window.REACT_APP_API_URL) {
    console.log('LaunchDarklyApi: Using runtime API URL:', window.REACT_APP_API_URL);
    
    // Add https:// protocol if not present
    if (!window.REACT_APP_API_URL.startsWith('http://') && !window.REACT_APP_API_URL.startsWith('https://')) {
      // Use HTTPS in production
      return window.location.protocol === 'https:' 
        ? 'https://' + window.REACT_APP_API_URL 
        : 'http://' + window.REACT_APP_API_URL;
    }
    return window.REACT_APP_API_URL;
  }
  
  // Try build time env next
  if (process.env.REACT_APP_API_URL) {
    console.log('LaunchDarklyApi: Using build-time API URL:', process.env.REACT_APP_API_URL);
    
    // Add https:// protocol if not present
    if (!process.env.REACT_APP_API_URL.startsWith('http://') && !process.env.REACT_APP_API_URL.startsWith('https://')) {
      // Use HTTPS in production
      return window.location.protocol === 'https:' 
        ? 'https://' + process.env.REACT_APP_API_URL 
        : 'http://' + process.env.REACT_APP_API_URL;
    }
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback to localhost
  console.log('LaunchDarklyApi: No environment variables found, using localhost fallback');
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();
console.log('LaunchDarklyApi: FINAL API URL:', API_URL);

// Configure axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to make API requests via the proxy
const makeProxyRequest = async (url, method, payload, api_key, headers) => {
  try {
    // Use axios for all requests
    const response = await api.post('/ld-api-proxy/proxy', {
      url,
      method,
      payload,
      api_key,
      headers
    });
    
    // Check if the status code indicates success (2xx) even if success flag is false
    if (response.data.status_code >= 200 && response.data.status_code < 300) {
      // This is a successful response regardless of the success flag
      return {
        ...response.data.data,
        status_code: response.data.status_code,
        success: true
      };
    }
    
    if (!response.data.success) {
      return { 
        error: `API Error: ${response.data.status_code} - ${response.data.data?.message || 'Unknown error'}`,
        status_code: response.data.status_code,
        data: response.data.data,
        raw_response: response.data
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
      },
      metricAttachment: null
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
    
    // Collect metric keys to attach, even if creation failed with 409 (already exists)
    const metricKeys = [];
    if (config.error_metric_enabled) {
      // Include error metric key if enabled (regardless of creation result)
      metricKeys.push(config.error_metric_1);
    }
    if (config.latency_metric_enabled) {
      // Include latency metric key if enabled (regardless of creation result)
      metricKeys.push(config.latency_metric_1);
    }
    if (config.business_metric_enabled) {
      // Include business metric key if enabled (regardless of creation result)
      metricKeys.push(config.business_metric_1);
    }
    
    // Attach metrics to flag if we have metrics to attach
    if (metricKeys.length > 0 && (!flagResponse.error || flagResponse.status_code === 409)) {
      console.log('Attaching metrics to flag with keys:', metricKeys);
      results.metricAttachment = await attachMetricsToFlag(config, metricKeys);
    } else {
      console.log('Skipping metric attachment: no metrics to attach or flag creation failed');
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

/**
 * Attaches metrics to the flag for measured rollout
 * @param {Object} config - The configuration object
 * @param {Array<string>} metricKeys - The metric keys to attach
 * @returns {Promise<Object>} - The API response
 */
const attachMetricsToFlag = async (config, metricKeys) => {
  const { api_key, project_key, flag_key } = config;
  
  const url = `https://app.launchdarkly.com/api/v2/projects/${project_key}/flags/${flag_key}/measured-rollout-configuration`;
  
  const payload = {
    metricKeys: metricKeys
  };
  
  // Use makeProxyRequest with special beta API header
  const response = await makeProxyRequest(url, 'put', payload, api_key, {
    'LD-API-Version': 'beta'
  });
  
  // Add explicit check for 200 status code in raw_response
  if (response && response.raw_response && response.raw_response.status_code === 200) {
    return {
      success: true,
      message: 'Metrics successfully attached to flag',
      metricKeys,
      data: response.raw_response.data
    };
  }
  
  // Handle the various responses:
  
  // 1. Successful attachment (200 OK)
  if (response && !response.error) {
    return { 
      success: true,
      message: 'Metrics attached to flag successfully!',
      metricKeys: metricKeys,
      data: response
    };
  }
  
  // 2. Resource already exists cases (409 or 200 in error)
  if (response && response.status_code === 409) {
    return {
      success: true,
      message: 'Metrics are already attached to this flag',
      metricKeys: metricKeys,
      data: response.data
    };
  }
  
  // 3. We sometimes get 200 returned as an "error" due to how the proxy reports success
  if (response && response.error && (
    response.error.includes('200') || 
    response.status_code === 200 ||
    (response.raw_response && response.raw_response.status_code === 200)
  )) {
    return {
      success: true,
      message: 'Metrics successfully attached (or already attached) to flag',
      metricKeys: metricKeys,
      data: response.data || response.raw_response?.data
    };
  }
  
  // 4. Something else went wrong, return the error
  return response;
}; 