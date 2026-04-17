export type User = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: {
    display_name?: string;
    [key: string]: any;
  };
};

export type AuthState = {
  user: User | null;
  session: any | null;
  loading: boolean;
};

export type UserType = 'client' | 'coach';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  App: undefined;
  CoachAuth: undefined;
  CoachOnboarding: undefined;
  CoachApp: undefined;
};

export type OnboardingStackParamList = {
  Onboarding1: undefined; // Start your Fitness Journey
  Onboarding2: undefined; // What is your weight?
  Onboarding3: undefined; // What is your height?
  OnboardingPersonalDetails: undefined; // Name, Age, Gender
  Onboarding4: undefined; // What do you want to achieve? (Goal Selection)
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyOtp: { email: string };
  ResetPassword: { email: string };
  PasswordChangedSuccess: undefined;
};

export type CoachAuthStackParamList = {
  CoachWelcome: undefined;
  CoachLogin: undefined;
  CoachSignup: undefined;
  ForgotPassword: undefined;
  VerifyOtp: { email: string };
  ResetPassword: { email: string };
  PasswordChangedSuccess: undefined;
};

export type CoachOnboardingStackParamList = {
  CoachOnboarding: undefined;
  CoachCVUpload: undefined;
  CoachCertifications: undefined;
  CoachProfilePreview: undefined;
  CoachPending: undefined;
};

export type CoachAppTabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  Calendar: undefined;
  Chat: undefined;
  CoachProfile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Marketplace: undefined;
  CoachDetail: { coachId: string };
  BookSession: { coachId: string; coachName?: string };
  ClientChat: { conversationId: string };
  NotificationInbox: undefined;
  VideoCall: { bookingId: string; videoRoomId: string };
};

export type AppTabParamList = {
  Home: undefined;
  Workouts: undefined;
  Library: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  AccountInformation: undefined;
  Goals: undefined;
  BodyMeasurement: undefined;
  EditWeightHeight: { initialTab?: 'weight' | 'height' };
  EditProfile: undefined;
  UnitPreferences: undefined;
  NotificationsSettings: undefined;
  TextSizeSettings: undefined;
  LanguageSettings: undefined;
  ThemeSettings: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  MyPacks: undefined;
  MyPrograms: undefined;
  MyBookings: undefined;
  ClientConversations: undefined;
  ClientChatScreen: { conversationId: string };
  NotificationInbox: undefined;
  ProgramDetail: { programId: string };
  ExerciseDetail: {
    exerciseId: string;
    exerciseName?: string;
  };
  WorkoutSession: {
    workoutId?: string;
    workoutName: string;
    workoutType: 'native' | 'custom';
    exercises: Array<{
      id: string;
      name: string;
      sets: string;
      reps: string;
      restTime: string;
    }>;
    sessionId?: string;
    selectedDay?: number;
    returnTo?: string;
  };
  WorkoutSummary: {
    workoutName: string;
    durationMinutes: number;
    exercises: Array<{
      id: string;
      name: string;
      sets: string;
      reps: string;
      weights?: (number | null)[];
      completedSets?: boolean[];
      completed?: boolean;
    }>;
    completedAt?: string;
    returnTo?: string;
  };
};

export type LibraryStackParamList = {
  LibraryMain: undefined;
  WorkoutDetail: {
    workoutId?: string;
    workoutName?: string;
    workoutDifficulty?: string;
    workoutImage?: string;
    returnTo?: string;
  };
  ExerciseSelection: {
    initialSelection?: string[];
  } | undefined;
  WorkoutBuilder: {
    selectedExercises?: Array<{
      id: string;
      name: string;
      image?: string;
      default_sets?: number;
      default_reps?: number;
      default_rest_time?: number;
    }>;
    addedExercises?: Array<{
      id: string;
      name: string;
      image?: string;
      default_sets?: number;
      default_reps?: number;
      default_rest_time?: number;
    }>;
    workoutId?: string; // For edit mode
    workoutName?: string;
    workoutExercises?: Array<{
      id: string;
      name: string;
      sets: string;
      reps: string;
      restTime: string;
    }>;
  };

  WorkoutSession: {
    workoutId?: string;
    workoutName: string;
    workoutType: 'native' | 'custom';
    exercises: Array<{
      id: string;
      name: string;
      sets: string;
      reps: string;
      restTime: string;
    }>;
    sessionId?: string; // For resuming incomplete sessions
    selectedDay?: number; // Selected day for split workouts (1-7)
    returnTo?: string;
  };
  ExerciseDetail: {
    exerciseId: string;
    exerciseName?: string; // Optional: for native workouts that might not have UUID IDs
  };
  WorkoutSummary: {
    workoutName: string;
    durationMinutes: number;
    exercises: Array<{
      id: string;
      name: string;
      sets: string;
      reps: string;
      weights?: (number | null)[];
      completedSets?: boolean[];
      completed?: boolean;
    }>;
    completedAt?: string;
    returnTo?: string;
  };
};

export type ProgressStackParamList = {
  ProgressMain: undefined;
  RecordDetails: undefined;
  ConsistencyDetails: undefined;
  Nutrition: undefined;
  AddFood: { mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'; date?: string };
  NutritionGoals: undefined;
};

