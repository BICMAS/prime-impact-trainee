
export enum CourseStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Completed = 'Completed'
}

export interface ScormModule {
  lessons: any;
  id: string;
  title: string;
  content: string; // HTML content or URL
  duration: string;
  isCompleted: boolean;

}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: "Mandatory" | "Recommended" | "Optional";
  status: CourseStatus;
  progress: number;
  totalModules: number;
  completedModules: number;
  deadline?: string;
  isDownloaded: boolean;
  modules: PlayerModule[];
  certificateUrl?: string;
  scormPackageId?: string;
  quizScore?: number | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Trainee';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// New Types for Dashboard Insights & Learning Path

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'star' | 'medal' | 'trophy' | 'target' | 'zap' | 'shield';
  earnedDate?: string;
  isLocked: boolean;
}

export interface UserStats {
  streakDays: number;
  totalLearningHours: number;
  completedCourses: number;
  averageScore: number;
  weeklyActivity: number[]; // Array of 7 numbers (0-100) representing daily activity
  scoreTrend: number; // Percentage change
  completedCoursesTrend: number; // Absolute change
  bicmasCoins: number;
  badges: Badge[];
}

export interface LearningPathStep {
  id: string;
  courseId?: string; // Optional link to a specific course
  title: string;
  description: string;
  status: 'locked' | 'unlocked' | 'in-progress' | 'completed';
  type: 'course' | 'milestone' | 'assessment';
  estimatedTime?: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalSteps: number;
  completedSteps: number;
  steps: LearningPathStep[];
}

// Community & Forum Types

export interface ForumThread {
  id: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  title: string;
  content: string;
  category: 'General' | 'Course Help' | 'Safety' | 'Social';
  likes: number;
  replies: number;
  timestamp: string;
  isPinned?: boolean;
}

export interface ChatContact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

export interface DirectMessage {
  id: string;
  senderId: string; // 'me' or contactId
  text: string;
  timestamp: string;
  isRead: boolean;
}
export interface AssignedCourse {
  id: string;              // course.id
  assignmentId: string;    // assignment.id
  title: string;
  description: string;
  status: CourseStatus;
  progress: number;
  deadline?: string;
  thumbnail: string;
  isDownloaded: boolean;
}

export interface PlayerLesson {
  id: string;
  title: string;
  scormPackageId: string | null;
  isCompleted: boolean;
  estimatedDuration: number;
}

export interface PlayerModule {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  lessons: PlayerLesson[];
}

export interface ScormLaunchResponse {
  launchUrl: string;
}

export interface ScormManifestResponse {
  manifest: any;
  basePath: string;
}