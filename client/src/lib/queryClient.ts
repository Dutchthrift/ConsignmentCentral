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
      
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store"
        }
      });

      if (on401 === "returnNull" && res.status === 401) {
        console.log(`401 response from ${url}, returning null as configured`);
        return null as unknown as T;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Successful response from ${url}`, { dataReceived: !!data });
      return data;
    } catch (error: any) {
      console.error(`API request failed for ${queryKey[0]}:`, error);
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn<unknown>({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Changed to handle reconnections
      refetchOnReconnect: true,  // Added to handle reconnections
      retryOnMount: true,        // Added to retry queries on component re-mount
      staleTime: 30000,         // 30 seconds instead of Infinity
      retry: 3,                  // Try up to 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 2,                  // Allow retrying mutations
      retryDelay: 1000,          // 1s delay between retries
    },
  },
});

// Re-export the getQueryFn for use in other files
export { getQueryFn };
