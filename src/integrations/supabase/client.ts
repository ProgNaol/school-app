// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Unified configuration that works in both development and production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://uvqdugteqgjnwtrufrhe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWR1Z3RlcWdqbnd0cnVmcmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MTI5NTUsImV4cCI6MjA1NjM4ODk1NX0.GsMrNp2gcypqUAXbfCs_GM344bA-Iwv25ZUVIatiJEw";

// For development/testing - set to true to bypass connection checks
// This helps if you're getting false "connection error" messages
const BYPASS_CONNECTION_CHECK = true;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Enhanced error logger that provides more diagnostic information
const logError = (error: any, context: string) => {
  console.error(`Supabase ${context} error:`, error);
  // Log additional diagnostics for network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    console.error('Network connectivity issue detected');
  }
  return error;
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'educraft-auth-storage',
  },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      // Log the URL for debugging but redact sensitive parts
      let url: string;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
      } else {
        url = String(input); // Fallback
      }
      const sanitizedUrl = url.replace(/(?<=\?|&|^)(key|apikey|token|password)=[^&]*/gi, '$1=REDACTED');
      console.debug(`Supabase request to: ${sanitizedUrl}`);
      
      return fetch(input, init)
        .then(response => {
          if (!response.ok) {
            // Log response status for non-200 responses
            console.warn(`Supabase response status: ${response.status} ${response.statusText}`);
          }
          return response;
        })
        .catch((error) => {
          throw logError(error, 'fetch');
        });
    },
  },
});

// Enhanced helper to check Supabase connection with detailed diagnostics and retry logic
export const checkSupabaseConnection = async (retryAttempt = 0) => {
  // Development bypass for connection check if enabled
  if (BYPASS_CONNECTION_CHECK) {
    console.log("⚠️ DEVELOPMENT MODE: Connection check bypassed");
    return { connected: true, bypassEnabled: true };
  }

  try {
    console.debug(`Attempting Supabase connection check (attempt ${retryAttempt + 1})...`);
    
    // Use a more lenient timeout for the health check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Basic health check that doesn't require authentication
      const healthCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY
        },
        signal: controller.signal
      });
      
      // Clear the timeout as we got a response
      clearTimeout(timeoutId);
      
      // Even if we get a non-200 response, we'll consider the connection successful
      // as long as we got any response (meaning network is working)
      console.debug(`Supabase health check received status: ${healthCheckResponse.status}`);
      
      // Only check if we can get any response - doesn't need to be a 200
      // This is more lenient and allows login even if there are permission issues
      return { connected: true };
    } catch (fetchError) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If this was an abort error (timeout), give a specific message
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        console.warn('Supabase connection check timed out');
        
        // If we haven't tried too many times, retry the connection
        if (retryAttempt < 2) {
          console.log(`Retrying connection (attempt ${retryAttempt + 2})...`);
          return checkSupabaseConnection(retryAttempt + 1);
        }
      }
      
      // Try a fallback approach - check if auth session exists
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          console.log('Auth session exists, considering connected despite fetch error');
          return { connected: true };
        }
      } catch (sessionError) {
        console.error('Session check also failed:', sessionError);
      }
      
      // If all else fails, throw the original error
      throw fetchError;
    }
  } catch (e) {
    console.error('Supabase connection check exception:', e);
    return {
      connected: false,
      error: e instanceof Error ? e.message : 'Unknown error connecting to Supabase',
      details: e
    };
  }

};