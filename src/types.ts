export interface SocialLink {
  label: string;
  url: string;
}

export interface Profile {
  name: string;
  headline: string;
  about: string[];
  location?: string;
  email: string;
  socials?: SocialLink[];
  photo?: string;
  /** Short status shown next to the green dot in the header. */
  status?: string;
  /** Skill ids the owner names as their current top focus. */
  focusSkills?: string[];
  stats?: Stat[];
}

export interface Stat {
  value: string;
  label: string;
  projectId?: string;
}

export interface Experience {
  id: string;
  role: string;
  organization: string;
  start: string;
  end: string;
  location?: string;
  highlights: string[];
  skills: string[];
  /** Skills to show first on the Classic card. */
  topSkills?: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  start: string;
  end: string;
  notes?: string;
  gpa?: string;
  honors?: string[];
  activities?: string[];
  skills?: string[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  term?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
  skills: string[];
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  year?: string;
  githubUrl?: string;
  pdfUrl?: string;
  skills: string[];
  experienceId?: string;
  educationId?: string;
  courseId?: string;
  team?: string;
  /** 'poc' marks a proof of concept (labelled as such and drawn lighter in the graph). */
  kind?: 'poc';
}

export interface Skill {
  id: string;
  label: string;
  category?: string;
  /** General-purpose tools: drawn faintly in the graph so they don't pull projects together. */
  generic?: boolean;
}

export interface Content {
  profile: Profile;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  courses?: Course[];
  certifications?: Certification[];
  skillRelations?: [string, string][];
}

export type Mode = 'classic' | 'graph';
