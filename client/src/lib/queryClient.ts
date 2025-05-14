import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
    
    const res = await fetch(urlWithTimestamp, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
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
      
      // Use our improved fetch with timeout
      const res = await fetchWithTimeout(url, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store",
          "Connection": "keep-alive" // Explicitly request connection reuse
        }
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

// Enhanced query client with more robust error handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn<unknown>({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retryOnMount: true,
      staleTime: 30000,
      // More aggressive retry strategy for unstable connections
      retry: (failureCount, error: any) => {
        // Don't retry on 404 (not found) or 400 (bad request)
        if (error?.message?.includes('404:') || error?.message?.includes('400:')) {
          return false;
        }
        // Retry up to 5 times for network errors or server errors (5xx)
        return failureCount < 5;
      },
      retryDelay: attemptIndex => {
        // Exponential backoff with jitter to prevent thundering herd
        const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
        const jitter = delay * 0.2 * Math.random();
        return delay + jitter;
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
