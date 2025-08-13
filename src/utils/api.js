// API utility functions for making requests

const API_BASE_URL = process.env.NODE_ENV === 'development' ? '' : 'http://localhost:8001';

export const apiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/api/${cleanEndpoint}`;
};

export const apiRequest = async (endpoint, options = {}) => {
  const url = apiUrl(endpoint);
  const defaultOptions = {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.error(`API request to ${url} failed:`, error);
    throw error;
  }
};

export default { apiUrl, apiRequest };
