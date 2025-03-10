import { useState, useEffect, useTransition } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Send, Plus, Trash, Info, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  content: z.string().min(10, {
    message: "Content must be at least 10 characters.",
  }),
  section_id: z.string().optional(),
  subject_id: z.string().optional(),
  grade_id: z.string().optional(),
  type: z.enum(["announcement", "assignment", "quiz"]),
  due_date: z.date().optional(),
  quiz_questions: z.array(
    z.object({
      question: z.string().min(1, "Question is required"),
      type: z.enum(["multiple_choice", "text"]),
      options: z.array(z.string()).optional(),
      correct_option: z.number().optional(),
      points: z.number().min(1),
    })
  ).optional(),
  is_graded: z.boolean().default(true),
  max_attempts: z.number().min(1).default(1),
});

type PostFormValues = z.infer<typeof formSchema>;

type QuestionType = {
  question: string;
  type: "multiple_choice" | "text";
  options?: string[];
  correct_option?: number;
  points: number;
};

export default function PostForm({ onSuccess }: { onSuccess?: () => void }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  // Fetch teacher's subjects
  const { 
    data: teacherSubjects, 
    isLoading: isLoadingSubjects 
  } = useQuery({
    queryKey: ['teacher-subjects', profile?.id],
    queryFn: async () => {
      if (!profile?.id || profile.role !== 'teacher') return [];
      
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          subject:subject_id(id, name, description)
        `)
        .eq('teacher_id', profile.id);
        
      if (error) {
        console.error("Error fetching teacher subjects:", error);
        throw error;
      }
      
      return data?.map(item => item.subject) || [];
    },
    enabled: !!profile?.id && profile.role === 'teacher',
  });
  
  // Use default subject if there's only one
  useEffect(() => {
    if (teacherSubjects?.length === 1 && !selectedSubject) {
      startTransition(() => {
        setSelectedSubject(teacherSubjects[0]?.id || null);
      });
    }
  }, [teacherSubjects, selectedSubject]);
  
  // Fetch grades
  const { 
    data: grades, 
    isLoading: isLoadingGrades 
  } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .order('name');
        
      if (error) {
        console.error("Error fetching grades:", error);
        throw error;
      }
      
      return data || [];
    },
  });
  
  // Fetch sections based on selected subject and grade
  const { 
    data: sections, 
    isLoading: isLoadingSections 
  } = useQuery({
    queryKey: ['sections-by-subject-grade', selectedSubject, selectedGrade],
    queryFn: async () => {
      if (!selectedSubject || !selectedGrade) return [];
      
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('grade_id', selectedGrade);
        
      if (error) {
        console.error("Error fetching sections:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!selectedSubject && !!selectedGrade,
  });

  // Set up the form
  const form = useForm<PostFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "assignment",
      is_graded: true,
      max_attempts: 1,
    },
  });

  // Get the current post type from the form
  const postType = form.watch("type");

  // Update form values when selections change
  useEffect(() => {
    if (selectedSubject) {
      form.setValue('subject_id', selectedSubject);
    }
    
    if (selectedGrade) {
      form.setValue('grade_id', selectedGrade);
    }
  }, [selectedSubject, selectedGrade, form]);

  // Functions for managing quiz questions
  const addQuestion = () => {
    const newQuestion: QuestionType = {
      question: "",
      type: "multiple_choice",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correct_option: 0,
      points: 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: keyof QuestionType, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options![optionIndex] = value;
      setQuestions(updatedQuestions);
    }
  };

  // Handle form submission
  const onSubmit = async (data: PostFormValues) => {
    try {
      if (!profile?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to post.",
          variant: "destructive",
        });
        return;
      }

      if (data.type === "quiz" && questions.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one question to the quiz.",
          variant: "destructive",
        });
        return;
      }

      if (!data.section_id && (data.type === "assignment" || data.type === "quiz")) {
        toast({
          title: "Warning",
          description: "Please select a section.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      setError(null);

      if (data.type === "assignment") {
        // Create assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            title: data.title,
            content: data.content,
            created_by: profile.id,
            section_id: data.section_id,
            subject_id: data.subject_id,
            due_date: data.due_date?.toISOString(),
          });

        if (error) throw error;

        toast({
          title: "Assignment Created",
          description: "Your assignment has been posted successfully."
        });
      } else if (data.type === "quiz") {
        // For now, save quizzes as assignments with questions stored in the content
        const quizData = {
          title: data.title,
          content: JSON.stringify(questions), // Store questions as JSON in content field
          created_by: profile.id,
          section_id: data.section_id,
          subject_id: data.subject_id,
          due_date: data.due_date?.toISOString(),
        };

        const { error } = await supabase
          .from('assignments')
          .insert(quizData);

        if (error) throw error;

        toast({
          title: "Quiz Created",
          description: "Your quiz has been posted successfully."
        });
      } else {
        // For announcements, just post to all sections the teacher teaches
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: data.title,
            content: data.content,
            creator_id: profile.id,
            is_global: false,
          });

        if (error) throw error;

        toast({
          title: "Announcement Posted",
          description: "Your announcement has been posted successfully."
        });
      }

      // Reset form and state
      form.reset();
      setQuestions([]);
      setSelectedSubject(null);
      setSelectedGrade(null);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error creating post:", error);
      setError(error.message || "Failed to create post. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{postType === "assignment" ? "Create Assignment" : postType === "quiz" ? "Create Quiz" : "Post Announcement"}</CardTitle>
      </CardHeader>

      {error && (
        <Alert variant="destructive" className="mx-6 mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset some fields when changing type
                      if (value === "announcement") {
                        setQuestions([]);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select post type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter title" {...field} />
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
                  <FormLabel>
                    {postType === "assignment" ? "Instructions" : postType === "quiz" ? "Description" : "Content"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        postType === "assignment"
                          ? "Enter assignment instructions"
                          : postType === "quiz"
                          ? "Enter quiz description"
                          : "Enter announcement content"
                      }
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(postType === "assignment" || postType === "quiz") && (
              <>
                <FormField
                  control={form.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          startTransition(() => {
                            field.onChange(value);
                            setSelectedSubject(value);
                            form.setValue('section_id', undefined);
                          });
                        }}
                        value={field.value}
                        disabled={isLoadingSubjects || teacherSubjects?.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingSubjects ? "Loading subjects..." : "Select subject"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teacherSubjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                          {teacherSubjects?.length === 0 && !isLoadingSubjects && (
                            <div className="p-2 text-center text-muted-foreground">
                              No subjects available. Please add subjects in your profile settings.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="grade_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          startTransition(() => {
                            field.onChange(value);
                            setSelectedGrade(value);
                            form.setValue('section_id', undefined);
                          });
                        }}
                        value={field.value}
                        disabled={!selectedSubject || isLoadingGrades}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedSubject 
                                ? "Select subject first" 
                                : isLoadingGrades 
                                  ? "Loading grades..." 
                                  : "Select grade"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {grades?.map((grade) => (
                            <SelectItem key={grade.id} value={grade.id}>
                              {grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {!selectedSubject && (
                        <p className="text-sm text-muted-foreground">Please select a subject first</p>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="section_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        value={field.value}
                        disabled={!selectedGrade || !selectedSubject || isLoadingSections || sections?.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedSubject
                                ? "Select subject first"
                                : !selectedGrade
                                  ? "Select grade first"
                                  : isLoadingSections
                                    ? "Loading sections..."
                                    : sections?.length === 0
                                      ? "No sections available"
                                      : "Select section"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sections?.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              Section {section.name}
                            </SelectItem>
                          ))}
                          {sections?.length === 0 && !isLoadingSections && selectedSubject && selectedGrade && (
                            <div className="p-2 text-center text-muted-foreground">
                              No sections available for this subject and grade
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {postType === "quiz" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Questions</h3>
                  <Button type="button" onClick={addQuestion} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
                
                {questions.length === 0 && (
                  <div className="bg-muted p-4 rounded-md text-center">
                    <p className="text-muted-foreground">No questions added yet</p>
                    <Button type="button" onClick={addQuestion} size="sm" variant="outline" className="mt-2">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Question
                    </Button>
                  </div>
                )}
                
                {questions.map((question, qIndex) => (
                  <div key={qIndex} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Question {qIndex + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Question Text</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                          placeholder="Enter your question here"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label>Question Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value: "multiple_choice" | "text") => updateQuestion(qIndex, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select question type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="text">Text Answer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          min="1"
                          value={question.points}
                          onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      {question.type === "multiple_choice" && (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {question.options?.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center space-x-2 mt-2">
                              <Input
                                value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                placeholder={`Option ${oIndex + 1}`}
                                className="flex-1"
                              />
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${qIndex}`}
                                  checked={question.correct_option === oIndex}
                                  onChange={() => updateQuestion(qIndex, 'correct_option', oIndex)}
                                  id={`option-${qIndex}-${oIndex}`}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`option-${qIndex}-${oIndex}`} className="text-sm">Correct</Label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                form.reset();
                setQuestions([]);
                setSelectedSubject(null);
                setSelectedGrade(null);
              }}
              disabled={isSubmitting || isPending}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Post
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 