import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { checkSupabaseConnection } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types defined outside of component functions
type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  created_at: string;
  updated_at: string;
  bio?: string;
  avatar_url?: string;
};

type ConnectionError = {
  isError: boolean;
  message: string;
  code?: string;
  details?: any;
}

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  connectionError: ConnectionError;
  retryConnection: () => Promise<boolean>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component defined as a named function declaration
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<ConnectionError>({
    isError: false,
    message: ""
  });
  const navigate = useNavigate();

  // Check connection to Supabase backend
  const checkConnection = async () => {
    try {
      // Check connection status
      const connectionStatus = await checkSupabaseConnection();
      
      if (!connectionStatus.connected) {
        console.error("Connection check failed:", connectionStatus.error);
        setConnectionError({
          isError: true,
          message: connectionStatus.error || "Unable to connect to the server",
          code: connectionStatus.code,
          details: connectionStatus.details
        });
        return false;
      }
      
      // Reset connection error if previously set
      setConnectionError({
        isError: false,
        message: ""
      });
      return true;
    } catch (error) {
      console.error("Connection check error:", error);
      setConnectionError({
        isError: true,
        message: error instanceof Error ? error.message : "Failed to check connection status",
        details: error
      });
      return false;
    }
  };

  // Declare initializeAuth function reference to resolve circular dependency
  let initializeAuthFn: () => Promise<void>;
  
  // Function to retry connection (can be called by UI)
  const retryConnection = async () => {
    setLoading(true);
    const success = await checkConnection();
    if (success && initializeAuthFn) {
      await initializeAuthFn();
      return true;
    }
    setLoading(false);
    return false;
  };

  useEffect(() => {
    let isActive = true; // Prevent state updates after unmount
    let authSubscription: { unsubscribe: () => void } | null = null;

    // Define the initialization function
    const initializeAuth = async () => {
      try {
        // Always check connection first
        const isConnected = await checkConnection();
        if (!isConnected) {
          setLoading(false);
          return; // Don't continue if connection check fails
        }
        
        // Get session with timeout handling
        const sessionPromise = supabase.auth.getSession();
        
        // Set a timeout for the session fetch
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session fetch timeout')), 8000);
        });
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (!isActive) return;
        
        setUser(session?.user ?? null);
        
        // If we have a session, fetch profile right away
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isActive) return;
          
          setUser(session?.user ?? null);
          
          if (session?.user) {
            fetchProfile(session.user.id);
          } else {
            setProfile(null);
            setLoading(false);
          }
        });

        authSubscription = subscription;
      } catch (error) {
        if (!isActive) return;
        
        console.error("Error initializing auth:", error);
        setConnectionError({
          isError: true,
          message: error instanceof Error ? error.message : "Failed to initialize authentication",
          details: error
        });
        setLoading(false);
      }
    };

    // Assign the function to our module-level reference
    initializeAuthFn = initializeAuth;
    
    // Initial auth initialization
    initializeAuth();

    // Cleanup function
    return () => {
      isActive = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Use a timeout to prevent hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();
        
      clearTimeout(timeoutId);

      if (error) {
        console.error("Error fetching profile:", error);
        setConnectionError({
          isError: true,
          message: error.message || "Failed to fetch user profile",
          code: error.code,
          details: error
        });
        
        // Show toast notification
        toast.error("Failed to load profile", {
          description: "There was a problem connecting to the server. You can try refreshing the page."
        });
      } else {
        setProfile(data);
      }
    } catch (e) {
      console.error("Exception fetching profile:", e);
      setConnectionError({
        isError: true,
        message: e instanceof Error ? e.message : "Failed to fetch user profile",
        details: e
      });
      
      // Show toast notification for exceptions
      toast.error("Connection error", {
        description: "There was a problem connecting to the server. Please check your internet connection."
      });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("No user data returned");
      }

      const profileData = {
        id: authData.user.id,
        full_name: userData.full_name,
        role: userData.role,
        user_id: userData.user_id,
        ...(userData.role === 'student' && { 
          grade: userData.grade,
          section: userData.section 
        }),
        ...(userData.role === 'teacher' && { 
          subjects: userData.subjects 
        }),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error("Failed to create user profile");
      }
    } catch (error: any) {
      console.error("Error in signUp:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in with email:", email);
      
      // We'll attempt sign-in directly and only show connection errors if sign-in fails with network issues
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error("Supabase signIn error:", error);
          
          // Check if this is an auth error or a connection issue
          if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
            // This is a network related error - now we'll do a more thorough check
            const connectionResult = await checkSupabaseConnection();
            if (!connectionResult.connected) {
              console.error("Confirmed connection issue during sign-in:", connectionResult);
              setConnectionError({
                isError: true,
                message: "Connection issue detected. Please check your internet or try again later.",
                code: error.message
              });
              toast.error("Connection issue. Please check your internet and try again.");
            } else {
              // We got a network error but can actually connect - might be a temporary glitch
              console.log("Network error during sign-in but connection check passed - might be temporary");
              toast.error("Temporary connection issue. Please try signing in again.");
            }
          }
          
          throw error;
        }
        
        // If we get here, sign-in was successful
        console.log("Sign in successful!", data.user?.id);
      } catch (signInError: any) {
        // If it's a network error but we haven't checked connection yet, try a direct auth check
        if (signInError.message && (signInError.message.includes('network') || 
            signInError.message.includes('Failed to fetch'))) {
          
          console.log("Attempting to verify existing session after network error...");
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            console.log("Found existing session despite network error");
            // Don't return the session, just acknowledge it
          }
        }
        
        // Rethrow if we couldn't recover
        throw signInError;
      }
      
      // Don't need to set user here as the auth subscription will handle that
    } catch (error) {
      console.error("Error in signIn:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      signUp, 
      signIn, 
      signOut, 
      loading,
      retryConnection, 
      connectionError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context defined as a named function declaration
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log("Auth context state:", { 
      userExists: !!context.user,
      profileExists: !!context.profile,
      loading: context.loading 
    });
  }
  
  return context;
}
