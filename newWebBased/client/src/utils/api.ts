// API utility for making requests with proper base URL
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // Parse JSON response automatically
  return response.json();
};

// Convenience methods
export const apiGet = (endpoint: string, options: RequestInit = {}) => 
  apiRequest(endpoint, { method: 'GET', ...options });

export const apiPost = (endpoint: string, data?: any, options: RequestInit = {}) => 
  apiRequest(endpoint, { 
    method: 'POST', 
    body: data ? JSON.stringify(data) : undefined,
    ...options 
  });

export const apiPut = (endpoint: string, data?: any, options: RequestInit = {}) => 
  apiRequest(endpoint, { 
    method: 'PUT', 
    body: data ? JSON.stringify(data) : undefined,
    ...options 
  });

export const apiDelete = (endpoint: string, options: RequestInit = {}) => 
  apiRequest(endpoint, { method: 'DELETE', ...options });
