
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const SUBJECTS = [
  'IT',
  'Amharic',
  'English',
  'Affan_Oromo',
  'Physics',
  'Chemistry',
  'History',
  'Geography'
] as const;

interface TeacherFieldsProps {
  selectedSubjects: string[];
  currentSubject: string;
  onSubjectChange: (value: string) => void;
  onAddSubject: () => void;
  onRemoveSubject: (subject: string) => void;
}

export function TeacherFields({
  selectedSubjects,
  currentSubject,
  onSubjectChange,
  onAddSubject,
  onRemoveSubject,
}: TeacherFieldsProps) {
  return (
    <div className="space-y-2">
      <Label>Subjects</Label>
      <div className="flex gap-2 mb-2">
        <Select value={currentSubject} onValueChange={onSubjectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select subjects" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.filter(subject => !selectedSubjects.includes(subject)).map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          type="button" 
          variant="secondary"
          onClick={onAddSubject}
          disabled={!currentSubject}
        >
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedSubjects.map((subject) => (
          <Badge key={subject} variant="secondary" className="flex items-center gap-1">
            {subject.replace('_', ' ')}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => onRemoveSubject(subject)}
            />
          </Badge>
        ))}
      </div>
    </div>
  );
}
