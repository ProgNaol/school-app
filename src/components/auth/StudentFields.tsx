
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface StudentFieldsProps {
  grade: string;
  section: string;
  onGradeChange: (value: string) => void;
  onSectionChange: (value: string) => void;
}

export function StudentFields({ grade, section, onGradeChange, onSectionChange }: StudentFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="grade">Grade</Label>
        <Select value={grade} onValueChange={onGradeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select your grade" />
          </SelectTrigger>
          <SelectContent>
            {[9, 10, 11, 12].map((g) => (
              <SelectItem key={g} value={g.toString()}>
                Grade {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="section">Section</Label>
        <Select value={section} onValueChange={onSectionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select your section" />
          </SelectTrigger>
          <SelectContent>
            {["A", "B", "C"].map((s) => (
              <SelectItem key={s} value={s}>
                Section {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
