import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { checkSupabaseConnection } from "@/integrations/supabase/client";

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

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  connectionError: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true; // Prevent state updates after unmount
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        // Get session first with timeout handling
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
        setConnectionError(true);
        setLoading(false);
      }
    };

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
        setConnectionError(true);
      } else {
        setProfile(data);
      }
    } catch (e) {
      setConnectionError(true);
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
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
      connectionError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("Auth context state:", { 
      userExists: !!context.user,
      profileExists: !!context.profile,
      loading: context.loading 
    });
  }
  
  return context;
}
