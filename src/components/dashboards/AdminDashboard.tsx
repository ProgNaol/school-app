import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Users, BookOpen, GraduationCap, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AnnouncementForm from "../forms/AnnouncementForm";
import { useAuth } from "@/contexts/AuthContext";

export function AdminDashboard() {
  console.log("AdminDashboard rendering");
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);

  // Add a check here to make sure this is rendering for an admin
  if (!profile || profile.role !== 'admin') {
    console.error("AdminDashboard: Not an admin user", profile);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          This dashboard is only accessible to admin users.
        </AlertDescription>
      </Alert>
    );
  }

  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      try {
        console.log("Fetching admin statistics");
        
        // Get student count
        const { count: studentCount, error: studentError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        if (studentError) throw studentError;

        // Get teacher count
        const { count: teacherCount, error: teacherError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'teacher');

        if (teacherError) throw teacherError;

        // Get section count
        const { count: sectionCount, error: sectionError } = await supabase
          .from('sections')
          .select('*', { count: 'exact', head: true });

        if (sectionError) throw sectionError;

        // Get announcement count
        const { count: announcementCount, error: announcementError } = await supabase
          .from('announcements')
          .select('*', { count: 'exact', head: true });

        if (announcementError) throw announcementError;
        
        return { 
          studentCount: studentCount || 0, 
          teacherCount: teacherCount || 0, 
          sectionCount: sectionCount || 0,
          announcementCount: announcementCount || 0
        };
      } catch (error: any) {
        console.error("Error fetching admin stats:", error);
        setError(error.message);
        return {
          studentCount: 0,
          teacherCount: 0,
          sectionCount: 0,
          announcementCount: 0
        };
      }
    },
  });

  const { data: recentUsers, isLoading: isLoadingUsers, isError: isErrorUsers } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: async () => {
      try {
        console.log("Fetching recent users");
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        console.log("Recent users fetched:", data);
        return data || [];
      } catch (error) {
        console.error("Error in recent users query:", error);
        setError("Failed to load recent users");
        return [];
      }
    },
    retry: 2,
    staleTime: 60000
  });

  // Display any errors prominently
  if (error || isErrorStats || isErrorUsers) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "There was an error loading your dashboard data. Please try refreshing the page."}
          </AlertDescription>
        </Alert>
        
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Reload Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
        
        <Dialog open={isAnnouncementFormOpen} onOpenChange={setIsAnnouncementFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <AnnouncementForm onSuccess={() => setIsAnnouncementFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.studentCount || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.teacherCount || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.sectionCount || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Announcements</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.announcementCount || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <ul className="space-y-2">
              {recentUsers && recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <li key={user.id} className="border-b pb-2 last:border-0">
                    <div className="font-semibold">{user.full_name}</div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">{user.role}</span>
                      <span className="text-sm">ID: {user.user_id}</span>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No users found</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
