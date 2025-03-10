import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [section, setSection] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string>("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateUserId = (name: string, role: string) => {
    const prefix = role === 'student' ? 'ST' : role === 'teacher' ? 'TE' : 'AD';
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${randomNum}`;
  };

  const handleAddSubject = () => {
    if (currentSubject && !selectedSubjects.includes(currentSubject)) {
      setSelectedSubjects([...selectedSubjects, currentSubject]);
      setCurrentSubject("");
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userId = generateUserId(fullName, role);
      
      const userData = {
        full_name: fullName,
        role: role,
        user_id: userId,
        ...(role === 'student' && { grade, section }),
        ...(role === 'teacher' && { subjects: selectedSubjects }),
      };

      await signUp(email, password, userData);

      toast({
        title: "Registration successful",
        description: "Please check your email to confirm your account",
      });
      
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("student");
      setSection("");
      setGrade("");
      setSelectedSubjects([]);
      
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = error.message || "Registration failed. Please try again.";
      
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate("/");
    } catch (error: any) {
      console.error("Signin error:", error);
      let errorMessage = "Invalid email or password. ";
      
      if (error.message.includes("rate limit")) {
        errorMessage += "Please wait a moment before trying again.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage += "Please check your email for confirmation link.";
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome to School Management</CardTitle>
          <CardDescription>Sign in or create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <SignInForm
                email={email}
                password={password}
                isLoading={isLoading}
                onEmailChange={(e) => setEmail(e.target.value)}
                onPasswordChange={(e) => setPassword(e.target.value)}
                onSubmit={handleSignIn}
              />
            </TabsContent>

            <TabsContent value="signup">
              <SignUpForm
                email={email}
                password={password}
                fullName={fullName}
                role={role}
                grade={grade}
                section={section}
                selectedSubjects={selectedSubjects}
                currentSubject={currentSubject}
                isLoading={isLoading}
                onEmailChange={(e) => setEmail(e.target.value)}
                onPasswordChange={(e) => setPassword(e.target.value)}
                onFullNameChange={(e) => setFullName(e.target.value)}
                onRoleChange={setRole}
                onGradeChange={setGrade}
                onSectionChange={setSection}
                onSubjectChange={setCurrentSubject}
                onAddSubject={handleAddSubject}
                onRemoveSubject={handleRemoveSubject}
                onSubmit={handleSignUp}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
