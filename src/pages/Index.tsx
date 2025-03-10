import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Bell, Settings } from "lucide-react";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { TeacherDashboard } from "@/components/dashboards/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Notifications } from "@/components/Notifications";
import { ErrorBoundary } from "react-error-boundary";

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-48 w-full" />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-md">
      <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong:</h2>
      <pre className="text-sm bg-white p-4 rounded border mb-4 overflow-auto">{error.message}</pre>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

const Index = () => {
  const { user, profile, loading, signOut, connectionError, retryConnection } = useAuth();
  const navigate = useNavigate();
  
  // Add this state to manage local loading state
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(null);
  const [pageState, setPageState] = useState<string>("initializing");

  // Add detailed debugging after login
  useEffect(() => {
    console.log("Index page mounted or updated with state:", {
      userExists: !!user,
      profileExists: !!profile,
      loading,
      connectionError,
      pageState
    });
    
    if (user) {
      console.log("User authenticated:", {
        userId: user.id,
        email: user.email,
        profileRole: profile?.role || "No profile role"
      });
    }
  }, [user, profile, loading, connectionError, pageState]);

  useEffect(() => {
    if (!loading) {
      // When auth loading is done, finish our local loading after a brief delay
      // to prevent flickering if profile loads quickly
      const timer = setTimeout(() => {
        setLocalLoading(false);
        setPageState(user ? "loaded" : "no-user");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  useEffect(() => {
    if (!loading && !user) {
      console.log("No user found, redirecting to auth");
      setPageState("redirecting");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Show early loading state with skeleton
  if (loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <LoadingSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (connectionError.isError) {
    console.log("Rendering connection error state:", connectionError);
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Connection Error</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-50 p-4 rounded-md border border-red-200">
              <p className="text-red-700 mb-4">
                {connectionError.message || "There was a problem connecting to the server. Please check your internet connection and try again."}
                <br />
                <span className="text-sm text-red-500">{connectionError.code ? `Error code: ${connectionError.code}` : ""}</span>
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry Connection
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile && user) {
    console.log("User exists but profile is missing, showing setup screen with user ID:", user.id);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white shadow-md rounded-md max-w-md">
          <h2 className="text-xl font-bold mb-2">Setting up your account</h2>
          <p className="text-gray-600 mb-4">We're retrieving your profile information...</p>
          
          <div className="flex justify-center mb-6">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-sm mb-4">
            <p className="text-blue-700">User ID: {user.id}</p>
            <p className="text-blue-700">Email: {user.email}</p>
          </div>
          
          <div className="text-sm text-gray-500 mt-2 flex justify-center">
            <Button variant="outline" className="mr-2" onClick={async () => {
              console.log("Manual retry for profile fetching");
              await retryConnection();
            }}>
              Retry Connection
            </Button>
            <Button variant="outline" className="text-red-500" onClick={() => {
              console.log("User manually signing out due to profile loading issues");
              signOut();
            }}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  let DashboardComponent;
  
  try {
    if (profile.role === "student") {
      DashboardComponent = StudentDashboard;
    } else if (profile.role === "teacher") {
      DashboardComponent = TeacherDashboard;
    } else if (profile.role === "admin") {
      DashboardComponent = AdminDashboard;
    } else {
      throw new Error(`Unknown role: ${profile.role}`);
    }
  } catch (err) {
    console.error("Error determining dashboard component:", err);
    setLocalError(err);
  }

  if (localError) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-bold text-red-600">Dashboard Error</h2>
        <p>{localError.message}</p>
        <Button onClick={() => signOut()} className="mt-4">Sign Out</Button>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">School Management System</h1>
            <p className="text-sm text-gray-600">Welcome, {profile.full_name}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Notifications />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative rounded-full h-10 w-10 p-0">
                  <Avatar>
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{profile.full_name}</DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs text-gray-500">
                  Role: {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 pb-4 border-b">
            <h2 className="text-xl font-semibold">
              {profile.role === 'admin' && 'Admin Dashboard'}
              {profile.role === 'teacher' && 'Teacher Dashboard'}
              {profile.role === 'student' && 'Student Dashboard'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
            {DashboardComponent && <DashboardComponent />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default Index;
