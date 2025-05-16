import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store the auth token
let authToken: string | null = null;

// Set the auth token for future requests
export function setAuthToken(token: string | null) {
  console.log("Setting auth token:", token ? "token-present" : "token-cleared");
  authToken = token;
  
  // Store token in localStorage for persistence
  if (token) {
    localStorage.setItem('dutchthrift_auth_token', token);
  } else {
    localStorage.removeItem('dutchthrift_auth_token');
  }
}

// Initialize token from localStorage if available
const initToken = () => {
  const savedToken = localStorage.getItem('dutchthrift_auth_token');
  if (savedToken) {
    console.log("Found saved auth token in localStorage");
    authToken = savedToken;
  }
};

// Call initialization
initToken();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = (await res.text()) || res.statusText;
      console.error(`API Error: ${res.status}`, { 
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        responseText: text
      });
      throw new Error(`${res.status}: ${text}`);
    } catch (err: any) {
      console.error("Error parsing error response:", err);
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`Making ${method} request to ${url}`, { hasData: !!data });
    
    // Add a timestamp query parameter to avoid caching issues
    const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    
    const headers: Record<string, string> = {
      ...(data ? { "Content-Type": "application/json" } : {}),
      "Accept": "application/json",
      "Cache-Control": "no-cache, no-store",
      "X-Requested-With": "XMLHttpRequest" // Help server identify this as AJAX request
    };
    
    // Add authorization header if we have a token
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    const res = await fetch(urlWithTimestamp, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      mode: "cors" // Enable CORS for cross-domain requests
    });

    await throwIfResNotOk(res);
    console.log(`${method} request to ${url} succeeded with status:`, res.status);
    return res;
  } catch (error: any) {
    console.error(`${method} request to ${url} failed:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

function getQueryFn<T>({ on401 }: { on401: UnauthorizedBehavior }): QueryFunction<T> {
  return async ({ queryKey }) => {
    try {
      // Extract the URL from the queryKey
      const requestUrl = queryKey[0] as string;
      
      // Add a timestamp query parameter to avoid caching issues
      const url = `${requestUrl}${requestUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      console.log(`Making API request to ${url}`);
      
      // Implement a fetch with timeout to prevent hanging requests
      const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 15000) => {
        const controller = new AbortController();
        const { signal } = controller;
        
        // Create a promise that rejects after the timeout
        const timeoutPromise = new Promise<Response>((_, reject) => {
          setTimeout(() => {
            controller.abort();
            reject(new Error(`Request timeout for ${url} after ${timeout}ms`));
          }, timeout);
        });
        
        // Race the fetch against the timeout
        return Promise.race([
          fetch(url, { ...options, signal }),
          timeoutPromise
        ]);
      };
      
      // Prepare headers
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store",
        "Connection": "keep-alive", // Explicitly request connection reuse
        "X-Requested-With": "XMLHttpRequest" // Help server identify this as AJAX request
      };
      
      // Add authorization header if we have a token
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      // Use our improved fetch with timeout
      const res = await fetchWithTimeout(url, {
        credentials: "include", // Always include credentials (cookies)
        headers,
        mode: "cors" // Enable CORS for cross-domain requests
      });

      if (on401 === "returnNull" && res.status === 401) {
        console.log(`401 response from ${url}, returning null as configured`);
        return null as unknown as T;
      }

      await throwIfResNotOk(res);
      
      // Handle empty responses gracefully
      const contentLength = res.headers.get('content-length');
      if (contentLength === '0' || !res.headers.get('content-type')?.includes('application/json')) {
        console.log(`Empty or non-JSON response from ${url}`);
        return null as unknown as T;
      }
      
      const data = await res.json();
      console.log(`Successful response from ${url}`, { dataReceived: !!data });
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`Request aborted or timed out for ${queryKey[0]}`);
        throw new Error(`Request timeout or aborted for ${queryKey[0]}`);
      }
      console.error(`API request failed for ${queryKey[0]}:`, error);
      throw error;
    }
  };
}

// Enhanced query client with extreme rate limit protection
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn<unknown>({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // Reduce automatic refetching
      refetchOnReconnect: false, // Reduce automatic refetching
      retryOnMount: true,
      staleTime: 300000, // 5 minutes - greatly increased cache time to reduce DB hits
      cacheTime: 3600000, // 1 hour - keep data in cache much longer
      // Extreme retry strategy for rate limited connections
      retry: (failureCount, error: any) => {
        // Don't retry on 404 (not found) or 400 (bad request)
        if (error?.message?.includes('404:') || error?.message?.includes('400:')) {
          return false;
        }
        
        // Special handling for rate limit errors
        const isRateLimit = 
          error?.message?.includes('rate limit') || 
          error?.message?.includes('exceeded') ||
          error?.message?.includes('500');
          
        // For rate limits, retry more times with longer delays
        if (isRateLimit) {
          console.log(`Rate limit detected, retry ${failureCount}/10`);
          return failureCount < 10; // Retry up to 10 times for rate limits
        }
        
        // For other errors, retry fewer times
        return failureCount < 3;
      },
      retryDelay: attemptIndex => {
        // Much more aggressive exponential backoff with high jitter
        const baseDelay = Math.min(2000 * (2 ** attemptIndex), 120000); // Up to 2 minutes
        const jitter = baseDelay * 0.5 * Math.random(); // 50% jitter
        console.log(`Retry delay: ${baseDelay + jitter}ms`);
        return baseDelay + jitter;
      }
    },
    mutations: {
      // More aggressive retry for mutations too
      retry: (failureCount, error: any) => {
        // Don't retry on client errors (4xx)
        if (error?.message?.includes('4')) {
          return false;
        }
        // Retry up to 3 times for server errors (5xx) or network issues
        return failureCount < 3;
      },
      retryDelay: attemptIndex => 1000 * (attemptIndex + 1), // Linear backoff: 1s, 2s, 3s
    },
  },
});

// Error logging handled through standard query and mutation settings
// (removed subscriptions due to TypeScript compatibility issues)

// Re-export the getQueryFn for use in other files
export { getQueryFn };
