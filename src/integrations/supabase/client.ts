// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Unified configuration that works in both development and production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://uvqdugteqgjnwtrufrhe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWR1Z3RlcWdqbnd0cnVmcmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MTI5NTUsImV4cCI6MjA1NjM4ODk1NX0.GsMrNp2gcypqUAXbfCs_GM344bA-Iwv25ZUVIatiJEw";

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

// Enhanced helper to check Supabase connection with detailed diagnostics
export const checkSupabaseConnection = async () => {
  try {
    console.debug('Attempting Supabase connection check...');
    
    // First check: API status/health check that doesn't require authentication
    const healthCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/`)
      .catch(error => {
        console.error('Supabase health check failed:', error);
        throw new Error('Cannot reach Supabase server. Please check your internet connection.');
      });

    if (!healthCheckResponse.ok) {
      console.error(`Supabase health check failed with status: ${healthCheckResponse.status}`);
      return {
        connected: false,
        error: `Server responded with status: ${healthCheckResponse.status}`,
        details: await healthCheckResponse.text().catch(() => 'No details available')
      };
    }
    
    // Second check: Authenticated query to verify permissions
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('Supabase query check failed:', error);
      return {
        connected: false,
        error: error.message,
        code: error.code,
        details: error
      };
    }
    
    console.debug('Supabase connection successful!');
    return { connected: true, data };
  } catch (e) {
    console.error('Supabase connection check exception:', e);
    return {
      connected: false,
      error: e instanceof Error ? e.message : 'Unknown error connecting to Supabase',
      details: e
    };
  }
};