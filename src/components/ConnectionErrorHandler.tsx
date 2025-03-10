import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Server, Wifi, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Component to handle Supabase connection errors with retry functionality
 * Provides clear error messages and actions for users to take
 */
type ConnectionErrorHandlerProps = {
  // Optional custom retry handler
  onRetry?: () => Promise<void>;
  // Optional custom error object
  error?: {
    isError: boolean;
    message: string;
    code?: string;
    details?: any;
  }
};

export function ConnectionErrorHandler({ onRetry, error }: ConnectionErrorHandlerProps = {}) {
  const { connectionError, retryConnection, loading } = useAuth();
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [automaticRetryEnabled, setAutomaticRetryEnabled] = useState(true);
  
  // Use provided error or fall back to context error
  const errorToDisplay = error || connectionError;

  // Automatic retry logic for temporary network issues
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;

    if (errorToDisplay.isError && automaticRetryEnabled && retryCount < 3) {
      retryTimer = setTimeout(() => {
        handleRetry();
      }, 5000 * (retryCount + 1)); // Exponential backoff: 5s, 10s, 15s
    }

    return () => {
      clearTimeout(retryTimer);
    };
  }, [connectionError.isError, retryCount, automaticRetryEnabled]);

  // Handle manual retry
  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await retryConnection();
  };

  // If no connection error, don't render anything
  if (!connectionError.isError) {
    return null;
  }

  // Get error message based on error type
  const getErrorMessage = () => {
    if (connectionError.code === 'NETWORK_ERROR' || 
        (connectionError.message && connectionError.message.includes('network'))) {
      return "Network connection issue detected";
    } else if (connectionError.code === 'PGRST301' || 
              connectionError.code === '23505' || 
              connectionError.code?.startsWith('42')) {
      return "Database query error";
    } else if (connectionError.code === 'SUPABASE_FETCH_ERROR') {
      return "Unable to reach the server";
    } else {
      return "There was a problem connecting to the server";
    }
  };

  return (
    <Card className="border-destructive shadow-lg">
      <CardHeader className="bg-destructive/10">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-destructive" />
          <CardTitle>Connection Error</CardTitle>
        </div>
        <CardDescription>
          {getErrorMessage()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Server Connection Failed</AlertTitle>
          <AlertDescription>
            We couldn't connect to our servers. This might be due to your internet connection, 
            a temporary server outage, or network restrictions.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-muted-foreground" />
            <span>Please check your internet connection and try again.</span>
          </div>

          {showTechnicalDetails && (
            <div className="mt-4 rounded-md bg-muted p-3 text-xs font-mono">
              <p>Error code: {connectionError.code || 'UNKNOWN'}</p>
              <p>Message: {connectionError.message}</p>
              <p>Time: {new Date().toISOString()}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="space-x-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleRetry} 
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Home
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
        >
          {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
        </Button>
      </CardFooter>
    </Card>
  );
}
