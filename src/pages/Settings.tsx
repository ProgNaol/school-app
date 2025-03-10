import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Shield, Bell, User, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || "",
    theme: "light",
    emailNotifications: true,
    pushNotifications: true
  });
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [gradeSection, setGradeSection] = useState({
    gradeId: profile?.grade_id || '',
    sectionIds: [] as string[]
  });
  
  // Fetch all subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data || [];
    }
  });
  
  // Fetch teacher's current subjects
  const { data: teacherSubjects, isLoading: isLoadingTeacherSubjects } = useQuery({
    queryKey: ['teacher-subjects', profile?.id],
    queryFn: async () => {
      if (!profile?.id || profile.role !== 'teacher') return [];
      
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select('subject_id')
        .eq('teacher_id', profile.id);
        
      if (error) throw error;
      return data?.map(item => item.subject_id) || [];
    },
    enabled: !!profile?.id && profile.role === 'teacher'
  });
  
  // For students - fetch grades and sections
  const { data: grades } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data || [];
    },
    enabled: profile?.role === 'student'
  });
  
  // When teacher subjects load, initialize selected subjects
  useEffect(() => {
    if (teacherSubjects && profile?.role === 'teacher') {
      setSelectedSubjects(teacherSubjects);
    }
  }, [teacherSubjects, profile?.role]);
  
  // Save profile settings
  const saveProfile = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      
      // Update basic profile info
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      // For teachers - update subject associations
      if (profile.role === 'teacher') {
        // First delete existing associations
        const { error: deleteError } = await supabase
          .from('teacher_subjects')
          .delete()
          .eq('teacher_id', profile.id);
          
        if (deleteError) throw deleteError;
        
        // Then add new ones
        if (selectedSubjects.length > 0) {
          const subjectInserts = selectedSubjects.map(subjectId => ({
            teacher_id: profile.id,
            subject_id: subjectId
          }));
          
          const { error: insertError } = await supabase
            .from('teacher_subjects')
            .insert(subjectInserts);
            
          if (insertError) throw insertError;
        }
      }
      
      // For students - update grade and section
      if (profile.role === 'student' && gradeSection.gradeId) {
        // Update student's grade
        const { error: gradeError } = await supabase
          .from('profiles')
          .update({
            grade_id: gradeSection.gradeId
          })
          .eq('id', profile.id);
          
        if (gradeError) throw gradeError;
        
        // Update section associations
        if (gradeSection.sectionIds.length > 0) {
          // Remove existing sections
          const { error: deleteSectionError } = await supabase
            .from('student_sections')
            .delete()
            .eq('student_id', profile.id);
            
          if (deleteSectionError) throw deleteSectionError;
          
          // Add new sections
          const sectionInserts = gradeSection.sectionIds.map(sectionId => ({
            student_id: profile.id,
            section_id: sectionId
          }));
          
          const { error: insertSectionError } = await supabase
            .from('student_sections')
            .insert(sectionInserts);
            
          if (insertSectionError) throw insertSectionError;
        }
      }
      
      toast({
        title: "Settings updated",
        description: "Your profile settings have been saved.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['teacher-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['student-sections'] });
      
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  if (!user || !profile) {
    return <div className="p-6">Please log in to view settings.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {profile.role === 'teacher' && (
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
          )}
          {profile.role === 'student' && (
            <TabsTrigger value="grade">Grade & Section</TabsTrigger>
          )}
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          {profile.role === 'admin' && (
            <TabsTrigger value="security">Security</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={profile.role} disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {profile.role === 'teacher' && (
          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <CardTitle>Teaching Subjects</CardTitle>
                <CardDescription>
                  Select the subjects you teach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>Your Subjects</Label>
                  {isLoadingTeacherSubjects ? (
                    <div>Loading subjects...</div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {subjects?.map(subject => (
                        <Badge 
                          key={subject.id}
                          variant={selectedSubjects.includes(subject.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (selectedSubjects.includes(subject.id)) {
                              setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
                            } else {
                              setSelectedSubjects([...selectedSubjects, subject.id]);
                            }
                          }}
                        >
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Click on a subject to select or deselect it
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Subjects"}
                  <BookOpen className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        
        {profile.role === 'student' && (
          <TabsContent value="grade">
            <Card>
              <CardHeader>
                <CardTitle>Grade & Section</CardTitle>
                <CardDescription>
                  Select your grade and section
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>Grade</Label>
                  <Select
                    value={gradeSection.gradeId}
                    onValueChange={(value) => setGradeSection({...gradeSection, gradeId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades?.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label>Sections</Label>
                  <Select
                    value={gradeSection.sectionIds.join(',')}
                    onValueChange={(value) => setGradeSection({...gradeSection, sectionIds: value.split(',')})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sections" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Grade & Section"}
                  <Save className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-notifications"
                  checked={profileData.emailNotifications}
                  onCheckedChange={(checked) => 
                    setProfileData({...profileData, emailNotifications: checked})
                  }
                />
                <Label htmlFor="email-notifications">Email notifications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="push-notifications"
                  checked={profileData.pushNotifications}
                  onCheckedChange={(checked) => 
                    setProfileData({...profileData, pushNotifications: checked})
                  }
                />
                <Label htmlFor="push-notifications">Push notifications</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save preferences'}
                {!saving && <Save className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {profile.role === 'admin' && (
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Admin security settings will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings; 