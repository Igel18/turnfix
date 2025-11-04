// Simple cache for GET requests to avoid duplicate calls
const requestCache = new Map<string, Promise<any>>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 30000; // 30 seconds - increased to reduce API calls

// Request queue to limit concurrent requests
const pendingRequests = new Set<string>();
const MAX_CONCURRENT_REQUESTS = 3;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API utility for making requests with proper base URL
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // For GET requests, check cache first
  if (!options.method || options.method === 'GET') {
    const cacheKey = url;
    const now = Date.now();
    
    // Check if we have a valid cached promise
    if (requestCache.has(cacheKey) && cacheExpiry.has(cacheKey)) {
      const expiry = cacheExpiry.get(cacheKey)!;
      if (now < expiry) {
        console.log('Using cached request for:', cacheKey);
        return requestCache.get(cacheKey)!;
      } else {
        // Expired cache
        requestCache.delete(cacheKey);
        cacheExpiry.delete(cacheKey);
      }
    }
  }

  const makeRequest = async (): Promise<any> => {
    // Wait if too many concurrent requests
    while (pendingRequests.size >= MAX_CONCURRENT_REQUESTS) {
      await delay(100);
    }

    pendingRequests.add(url);

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(2000, 500 * Math.pow(2, 1)); // Exponential backoff starting at 1000ms
        console.warn(`Rate limited for ${url}. Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        return makeRequest(); // Retry the request
      }
      
      if (!response.ok) {
        // Try to get error details from response body
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP error! status: ${response.status}` };
        }
        
        // Create an error object that includes the response details
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`) as any;
        error.response = {
          status: response.status,
          data: errorData
        };
        throw error;
      }
      
      // Parse JSON response automatically
      return response.json();
    } catch (error) {
      console.error('API request failed for', url, ':', error);
      throw error;
    } finally {
      pendingRequests.delete(url);
    }
  };

  const requestPromise = makeRequest();

  // Cache GET requests
  if (!options.method || options.method === 'GET') {
    const cacheKey = url;
    requestCache.set(cacheKey, requestPromise);
    cacheExpiry.set(cacheKey, Date.now() + CACHE_DURATION);

    // Clean up cache entry after completion
    requestPromise
      .then(() => {
        // Success - keep in cache for CACHE_DURATION
        setTimeout(() => {
          requestCache.delete(cacheKey);
          cacheExpiry.delete(cacheKey);
        }, CACHE_DURATION);
      })
      .catch(() => {
        // Error - remove from cache immediately (don't cache errors)
        requestCache.delete(cacheKey);
        cacheExpiry.delete(cacheKey);
      });
  }

  return requestPromise;
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

// Cache invalidation utility
export const invalidateCache = (pattern?: string) => {
  if (pattern) {
    // Invalidate specific URLs matching the pattern
    for (const [key] of requestCache) {
      if (key.includes(pattern)) {
        requestCache.delete(key);
        cacheExpiry.delete(key);
      }
    }
  } else {
    // Clear entire cache
    requestCache.clear();
    cacheExpiry.clear();
  }
  console.log('Cache invalidated for:', pattern || 'all requests');
};
