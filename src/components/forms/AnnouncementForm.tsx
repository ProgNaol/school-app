import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { Send, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  content: z.string().min(10, {
    message: "Content must be at least 10 characters.",
  }),
  is_global: z.boolean().default(true),
  is_important: z.boolean().default(false),
});

type AnnouncementFormValues = z.infer<typeof formSchema>;

export default function AnnouncementForm({ onSuccess }: { onSuccess?: () => void }) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check if user is admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      setError("Only administrators can post announcements.");
    }
  }, [profile]);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      is_global: true,
      is_important: false,
    },
  });

  const onSubmit = async (data: AnnouncementFormValues) => {
    try {
      if (!profile) {
        toast({
          title: "Error",
          description: "You must be logged in to post announcements.",
          variant: "destructive",
        });
        return;
      }

      if (profile.role !== 'admin') {
        toast({
          title: "Permission denied",
          description: "Only administrators can post announcements.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      setError(null);
      
      // Create announcement
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: data.title,
          content: data.content,
          creator_id: profile.id,
          is_global: data.is_global,
          is_important: data.is_important,
        });
        
      if (error) throw error;
      
      // Invalidate the admin announcements query
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      
      toast({
        title: "Announcement posted",
        description: "Your announcement has been published successfully.",
      });
      
      // Reset form
      form.reset();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error posting announcement:", error);
      setError(error.message || "Failed to post announcement. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to post announcement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post Announcement</CardTitle>
      </CardHeader>
      
      {error && (
        <Alert variant="destructive" className="mx-6 mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter announcement title" 
                      {...field} 
                      disabled={profile?.role !== 'admin' || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter announcement content"
                      className="min-h-32"
                      {...field}
                      disabled={profile?.role !== 'admin' || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_global"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Global Announcement</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Show to all users across the platform
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={profile?.role !== 'admin' || isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_important"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Important</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark as an important announcement (highlighted)
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={profile?.role !== 'admin' || isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting || profile?.role !== 'admin'}
            >
              {isSubmitting ? "Posting..." : "Post Announcement"}
              {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 