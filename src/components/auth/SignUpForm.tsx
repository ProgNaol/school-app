
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentFields } from "./StudentFields";
import { TeacherFields } from "./TeacherFields";

interface SignUpFormProps {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "teacher" | "admin";
  grade: string;
  section: string;
  selectedSubjects: string[];
  currentSubject: string;
  isLoading: boolean;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFullNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (value: "student" | "teacher" | "admin") => void;
  onGradeChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onAddSubject: () => void;
  onRemoveSubject: (subject: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SignUpForm({
  email,
  password,
  fullName,
  role,
  grade,
  section,
  selectedSubjects,
  currentSubject,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onFullNameChange,
  onRoleChange,
  onGradeChange,
  onSectionChange,
  onSubjectChange,
  onAddSubject,
  onRemoveSubject,
  onSubmit,
}: SignUpFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={onEmailChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={onPasswordChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full-name">Full Name</Label>
        <Input
          id="full-name"
          type="text"
          placeholder="Enter your full name"
          value={fullName}
          onChange={onFullNameChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={onRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role === "teacher" && (
        <TeacherFields
          selectedSubjects={selectedSubjects}
          currentSubject={currentSubject}
          onSubjectChange={onSubjectChange}
          onAddSubject={onAddSubject}
          onRemoveSubject={onRemoveSubject}
        />
      )}

      {role === "student" && (
        <StudentFields
          grade={grade}
          section={section}
          onGradeChange={onGradeChange}
          onSectionChange={onSectionChange}
        />
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
