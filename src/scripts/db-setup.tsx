/**
 * Database Setup Script
 * 
 * Run this script once to set up the correct schema for your database.
 * This will create all necessary tables with the proper relationships.
 */

import { supabase } from "@/integrations/supabase/client";

async function setupDatabase() {
  console.log("Setting up database schema...");
  
  try {
    // Create subjects table
    const { error: subjectsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (subjectsError) {
      throw subjectsError;
    }
    
    // Create grades table
    const { error: gradesError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (gradesError) {
      throw gradesError;
    }
    
    // Create sections table if it doesn't exist - now with subject and grade references
    const { error: sectionsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
        grade_id UUID REFERENCES grades(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (sectionsError) {
      throw sectionsError;
    }
    
    // Create teacher_subjects junction table
    const { error: teacherSubjectsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(teacher_id, subject_id)
      );
    `);
    
    if (teacherSubjectsError) {
      throw teacherSubjectsError;
    }
    
    // Create teacher_sections junction table
    const { error: teacherSectionsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS teacher_sections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(teacher_id, section_id)
      );
    `);
    
    if (teacherSectionsError) {
      throw teacherSectionsError;
    }
    
    // Create student_sections junction table
    const { error: studentSectionsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS student_sections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, section_id)
      );
    `);
    
    if (studentSectionsError) {
      throw studentSectionsError;
    }
    
    // Update profiles table to add grade_id for students
    const { error: profilesAlterError } = await supabase.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS grade_id UUID REFERENCES grades(id);
    `);
    
    if (profilesAlterError) {
      throw profilesAlterError;
    }
    
    // Create assignments table
    const { error: assignmentsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id),
        due_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (assignmentsError) {
      throw assignmentsError;
    }
    
    // Insert default subjects
    const { error: insertSubjectsError } = await supabase
      .from('subjects')
      .upsert([
        { name: 'Mathematics', description: 'Mathematics curriculum' },
        { name: 'Science', description: 'Science curriculum' },
        { name: 'English', description: 'English curriculum' },
        { name: 'History', description: 'History curriculum' },
        { name: 'Geography', description: 'Geography curriculum' },
        { name: 'Physical Education', description: 'Physical Education curriculum' },
        { name: 'Art', description: 'Art curriculum' },
        { name: 'Music', description: 'Music curriculum' }
      ], { onConflict: 'name' });
    
    if (insertSubjectsError) {
      throw insertSubjectsError;
    }
    
    // Insert default grades
    const { error: insertGradesError } = await supabase
      .from('grades')
      .upsert([
        { name: 'Grade 1', description: 'First grade' },
        { name: 'Grade 2', description: 'Second grade' },
        { name: 'Grade 3', description: 'Third grade' },
        { name: 'Grade 4', description: 'Fourth grade' },
        { name: 'Grade 5', description: 'Fifth grade' },
        { name: 'Grade 6', description: 'Sixth grade' },
        { name: 'Grade 7', description: 'Seventh grade' },
        { name: 'Grade 8', description: 'Eighth grade' },
        { name: 'Grade 9', description: 'Ninth grade' },
        { name: 'Grade 10', description: 'Tenth grade' },
        { name: 'Grade 11', description: 'Eleventh grade' },
        { name: 'Grade 12', description: 'Twelfth grade' }
      ], { onConflict: 'name' });
      
    if (insertGradesError) {
      throw insertGradesError;
    }
    
    // Create sections for each subject and grade
    const subjects = await supabase.from('subjects').select('id, name');
    const grades = await supabase.from('grades').select('id, name');
    
    if (subjects.error) throw subjects.error;
    if (grades.error) throw grades.error;
    
    const sections = [];
    const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    for (const grade of grades.data || []) {
      for (const subject of subjects.data || []) {
        for (const letter of sectionLetters) {
          sections.push({
            name: `${letter}`,
            description: `${subject.name} section ${letter} for ${grade.name}`,
            subject_id: subject.id,
            grade_id: grade.id
          });
        }
      }
    }
    
    if (sections.length > 0) {
      const { error: createSectionsError } = await supabase
        .from('sections')
        .upsert(sections, { 
          onConflict: 'name, subject_id, grade_id' 
        });
        
      if (createSectionsError) {
        throw createSectionsError;
      }
    }
    
    console.log("Database schema setup complete!");
    return true;
  } catch (error) {
    console.error("Database schema setup failed:", error);
    return false;
  }
}

export { setupDatabase }; 