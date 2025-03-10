import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, Suspense, useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConnectionErrorHandler } from "@/components/ConnectionErrorHandler";

export function StudentDashboard() {
  const { profile, connectionError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

  // Show connection error handler if there's a connection problem
  if (connectionError.isError) {
    return <ConnectionErrorHandler />;
  }

  if (!profile || profile.role !== 'student') {
    console.error("StudentDashboard: Not a student user", profile);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          This dashboard is only accessible to student users.
        </AlertDescription>
      </Alert>
    );
  }

  // Set up timeout detection
  useEffect(() => {
    const timeoutTimer = setTimeout(() => {
      setTimeoutOccurred(true);
    }, 5000); // Show timeout message after 5 seconds
    
    return () => clearTimeout(timeoutTimer);
  }, []);

  // Optimized query for assignments - single query with joins
  const { data: assignments, isLoading: isLoadingAssignments, isError: isErrorAssignments } = useQuery({
    queryKey: ['student-assignments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      try {
        console.debug('Fetching student assignments...');
        // Optimized query that gets assignments in a single query with proper joins
        const { data, error } = await supabase
          .from('student_sections')
          .select(`
            section_id,
            assignments!inner(id, title, description, due_date, section_id, created_at)
          `)
          .eq('student_id', profile.id);

        if (error) {
          console.error('Error fetching assignments:', error);
          throw error;
        }

        // Flatten and transform the data structure
        const flattenedAssignments = data && Array.isArray(data)
          ? data.flatMap((section: any) => section.assignments || [])
              .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          : [];

        return flattenedAssignments || [];
      } catch (error) {
        setError("Failed to load assignments");
        return [];
      }
    },
    enabled: !!profile?.id,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });

  // Optimized query for announcements - single query with joins
  const { data: announcements, isLoading: isLoadingAnnouncements, isError: isErrorAnnouncements } = useQuery({
    queryKey: ['student-announcements', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      try {
        console.debug('Fetching student announcements...');
        // Optimized query that gets announcements in a single query with proper joins
        const { data, error } = await supabase
          .from('student_sections')
          .select(`
            section_id,
            announcements!inner(id, title, content, section_id, created_at)
          `)
          .eq('student_id', profile.id);

        if (error) {
          console.error('Error fetching announcements:', error);
          throw error;
        }

        // Flatten and transform the data structure
        const flattenedAnnouncements = data && Array.isArray(data)
          ? data.flatMap((section: any) => section.announcements || [])
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5) // Limit to 5 most recent
          : [];

        return flattenedAnnouncements || [];
      } catch (error) {
        setError("Failed to load announcements");
        return [];
      }
    },
    enabled: !!profile?.id,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });

  // Show timeout message if data is taking too long to load
  if (timeoutOccurred && (isLoadingAssignments || isLoadingAnnouncements) && !error) {
    return (
      <div className="space-y-6">
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Loading is taking longer than expected</AlertTitle>
          <AlertDescription>
            Your dashboard is still loading. This might happen due to a slow connection. You can wait or try refreshing.
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Refresh Dashboard
        </Button>
      </div>
    );
  }

  if (error || isErrorAssignments || isErrorAnnouncements) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "There was an error loading your dashboard data. Please try refreshing the page."}
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={() => window.location.reload()}
          variant="default"
        >
          Reload Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Student Dashboard</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={
          <Card>
            <CardHeader>
              <CardTitle>Loading Assignments...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </CardContent>
          </Card>
        }>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAssignments ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <ul className="space-y-2">
                  {assignments && Array.isArray(assignments) && assignments.length > 0 ? (
                    assignments.map((assignment: any) => (
                      <li key={assignment.id} className="border-b pb-2 last:border-0">
                        <div className="font-semibold">{assignment.title}</div>
                        <div className="text-sm">Due: {new Date(assignment.due_date).toLocaleDateString()}</div>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No assignments yet</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </Suspense>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAnnouncements ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <ul className="space-y-2">
                {announcements && Array.isArray(announcements) && announcements.length > 0 ? (
                  announcements.map((announcement: any) => (
                    <li key={announcement.id} className="border-b pb-2 last:border-0">
                      <div className="font-semibold">{announcement.title}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No announcements yet</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
