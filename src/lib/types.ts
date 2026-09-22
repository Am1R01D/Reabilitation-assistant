export type UserRole = 'patient' | 'doctor';

export type SwellingLevel = 'none' | 'mild' | 'severe';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  password_hash: string;
}

export interface Patient {
  id: number;
  user_id: number;
  doctor_id: number;
  condition: string;
  start_date: string;
}

export interface CheckIn {
  id: number;
  patient_id: number;
  date: string;
  pain: number;
  swelling: SwellingLevel;
  mobility: number;
  fatigue: number;
  sleep_quality: number;
  exercises_completed: number;
  created_at: string;
}

export interface ExerciseSession {
  id: number;
  patient_id: number;
  exercise_type: string;
  reps: number;
  average_angle: number;
  range_of_motion: number;
  form_score: number;
  duration: number;
  created_at: string;
}

export interface Alert {
  id: number;
  patient_id: number;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  acknowledged: number;
  created_at: string;
}

export interface GeminiAnalysis {
  id: number;
  patient_id: number;
  summary: string;
  positive_trends: string;
  concerning_changes: string;
  adherence_summary: string;
  clinician_points: string;
  created_at: string;
}

export interface Gamification {
  patient_id: number;
  recovery_streak: number;
  exercise_streak: number;
  weekly_goal: number;
  weekly_completed: number;
}

export interface ExerciseMetrics {
  reps: number;
  averageAngle: number;
  rangeOfMotion: number;
  formScore: number;
  exerciseDuration: number;
}

export interface GeminiRecoveryAnalysis {
  summary: string;
  positiveTrends: string[];
  concerningChanges: string[];
  adherenceSummary: string;
  clinicianReviewPoints: string[];
}
