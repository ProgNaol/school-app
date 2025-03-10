import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import PostForm from "../forms/PostForm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TeacherDashboard() {
  console.log("TeacherDashboard rendering");
  const { profile, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);

  // Add a check here for the teacher role
  if (!profile || profile.role !== 'teacher') {
    console.error("TeacherDashboard: Not a teacher user", profile);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          This dashboard is only accessible to teacher users.
        </AlertDescription>
      </Alert>
    );
  }

  // Fetch sections for the teacher - Using user_id instead of teacher_id
  const { data: sections, isLoading: isLoadingSections, isError: isErrorSections } = useQuery({
    queryKey: ['teacher-sections', profile?.id],
    queryFn: async () => {
      try {
        // First, check if we have a profile
        if (!profile?.id) {
          console.error("No profile ID available for teacher sections query");
          return [];
        }
        
        console.log("Fetching sections for teacher ID:", profile.id);
        
        // Try to get sections where the user (profile.id) is associated as a teacher
        // This query might need to be adjusted based on your actual schema
        const { data, error } = await supabase
          .from('sections')
          .select('*');
          // Temporarily removing the filter:
          // .eq('teacher_id', profile.id);
        
        console.log("Sections data:", data);

        if (error) {
          console.error("Error fetching sections:", error);
          throw error;
        }
        
        // For now, return all sections (you can modify this once we know the schema)
        return data || [];
      } catch (error: any) {
        console.error("Error fetching teacher sections:", error);
        setError(`Failed to load sections: ${error.message}`);
        return [];
      }
    },
    enabled: !!profile?.id,
  });

  // Fetch assignments created by the teacher
  const { data: assignments, isLoading: isLoadingAssignments, isError: isErrorAssignments } = useQuery({
    queryKey: ['teacher-assignments', profile?.id],
    queryFn: async () => {
      try {
        if (!profile?.id) return [];
        
        console.log("Fetching assignments for teacher ID:", profile.id);
        
        // Modify query to match actual database structure
        const { data, error } = await supabase
          .from('assignments')
          .select(`
            *
          `)
          // Adjust this filter based on your schema
          .eq('created_by', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching assignments:", error);
          throw error;
        }
        
        return data || [];
      } catch (error: any) {
        console.error("Error fetching teacher assignments:", error);
        setError(`Failed to load assignments: ${error.message}`);
        return [];
      }
    },
    enabled: !!profile?.id,
  });

  // Temporarily disabled quizzes query - the table doesn't exist yet
  const [quizzesTableExists, setQuizzesTableExists] = useState(false);
  const [quizzesMessage, setQuizzesMessage] = useState("Quizzes feature is coming soon!");
  
  // Check if the quizzes table exists before attempting to query it
  const { data: quizzes, isLoading: isLoadingQuizzes, isError: isErrorQuizzes } = useQuery({
    queryKey: ['teacher-quizzes', profile?.id],
    queryFn: async () => {
      try {
        if (!profile?.id) return [];
        
        // Try to query the table directly and catch any errors
        // We'll use a try/catch approach that's more straightforward
        try {
          // This will throw an error if the table doesn't exist
          // We're using a type assertion to bypass TypeScript's type checking
          // since we're specifically handling the error case where the table doesn't exist
          const { error } = await (supabase as any)
            .from('quizzes')
            .select('count')
            .limit(1);
            
          // If there's an error, throw it to be caught below
          if (error) throw error;
          
          // If we get here, the table exists
          setQuizzesTableExists(true);
        } catch (error: any) {
          // Check if the error is because the table doesn't exist
          if (error.message && error.message.includes("relation \"public.quizzes\" does not exist")) {
            setQuizzesTableExists(false);
            setQuizzesMessage("The quizzes feature is not available yet. It will be coming soon!");
            return [];
          }
          // If it's another error, rethrow it
          throw error;
        }
        
        // Only proceed if the table exists
        if (quizzesTableExists) {
          // Proceed with normal query - using type assertion to bypass type checking
          const { data, error } = await (supabase as any)
            .from('quizzes')
            .select('*')
            .eq('created_by', profile.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data || [];
        }
        
        // If table doesn't exist, we've already returned an empty array above
        return [];
      } catch (error: any) {
        // Don't set the global error if it's just the table missing
        if (error.message && error.message.includes("relation \"public.quizzes\" does not exist")) {
          setQuizzesTableExists(false);
          setQuizzesMessage("The quizzes feature is not available yet. It will be coming soon!");
          return [];
        }
        
        console.error("Error fetching teacher quizzes:", error);
        return [];
      }
    },
    enabled: !!profile?.id,
    retry: false, // Don't retry if the table doesn't exist
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Only show the global error if it's not just the quizzes table missing
  if (error || isErrorSections || isErrorAssignments) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || "There was an error loading your dashboard. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Teacher Dashboard</h2>
        <Dialog open={isPostFormOpen} onOpenChange={setIsPostFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <PostForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Sections</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSections ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <ul className="space-y-2">
                {sections && Array.isArray(sections) && sections.length > 0 ? (
                  sections.map((section: any) => (
                    <li key={section.id} className="border-b pb-2 last:border-0">
                      <div className="font-medium">{section.name}</div>
                      <div className="text-sm text-muted-foreground">{section.description}</div>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No sections assigned yet</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="assignments" className="flex-1">Assignments</TabsTrigger>
            <TabsTrigger value="quizzes" className="flex-1" disabled={!quizzesTableExists}>Quizzes {!quizzesTableExists && "(Coming Soon)"}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAssignments ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {assignments && Array.isArray(assignments) && assignments.length > 0 ? (
                      assignments.map((assignment: any) => (
                        <li key={assignment.id} className="border-b pb-2 last:border-0">
                          <div className="font-medium">{assignment.title}</div>
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
          </TabsContent>
          
          <TabsContent value="quizzes">
            <Card>
              <CardHeader>
                <CardTitle>Recent Quizzes</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingQuizzes ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : !quizzesTableExists ? (
                  <div className="p-4 border border-dashed rounded-md text-center">
                    <p className="text-muted-foreground mb-2">{quizzesMessage}</p>
                    <p className="text-xs text-muted-foreground">Check back later for updates.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {quizzes && Array.isArray(quizzes) && quizzes.length > 0 ? (
                      quizzes.map((quiz: any) => (
                        <li key={quiz.id} className="border-b pb-2 last:border-0">
                          <div className="font-medium">{quiz.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No quizzes yet</li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
