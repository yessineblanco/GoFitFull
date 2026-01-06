import { supabase } from '@/config/supabase';

export interface WorkoutStatsData {
  totalVolume: number;
  avgWeightPerSet: number;
  duration: number;
  volumeChange: number;
  weightChange: number;
  durationChange: number;
  lastSessionVolume: number;
  lastSessionWeight: number;
  lastSessionDuration: number;
  totalSets: number;
  recovery: Record<string, number>; // maps muscle name to recovery percentage (0-100)
  consistency: {
    currentStreak: number;
    thisMonthCount: number;
    weeklyConsistency: boolean[]; // last 7 days boolean
  };
  trends: {
    volume: number;
    weight: number;
    duration: number;
  };
  lastSessionName?: string;
}

export interface PersonalRecord {
  exercise: string;
  weight: number;
  date: string;
  change: number;
  previousWeight: number;
  exerciseId: string;
  reps: number;
  volume: number;
  duration: number; // minutes
  sessionId: string;
}

export interface MuscleGroupData {
  name: string;
  value: number;
  percentage: number;
}

export interface VolumeProgressItem {
  day: string;
  volume: number;
  sets: number;
  date: string;
}

export interface SessionMetrics {
  totalSets: number;
  totalReps: number;
  exercises: number;
  volumePR: boolean;
  setsChange: number;
  repsChange: number;
}

export interface ExerciseBreakdown {
  exercise: string;
  value: number;
  date?: string;
  exerciseId: string;
}

// Exercise to muscle group mapping
const EXERCISE_TO_MUSCLE_GROUP: Record<string, string[]> = {
  'Bench Press': ['Chest', 'Shoulders'],
  'Incline Bench Press': ['Chest', 'Shoulders'],
  'Decline Bench Press': ['Chest'],
  'Dumbbell Press': ['Chest', 'Shoulders'],
  'Chest Fly': ['Chest'],
  'Push Up': ['Chest', 'Shoulders'],

  'Squat': ['Legs'],
  'Front Squat': ['Legs'],
  'Leg Press': ['Legs'],
  'Lunge': ['Legs'],
  'Leg Extension': ['Legs'],
  'Leg Curl': ['Legs'],
  'Calf Raise': ['Legs'],

  'Deadlift': ['Back', 'Legs'],
  'Romanian Deadlift': ['Back', 'Legs'],
  'Barbell Row': ['Back'],
  'Dumbbell Row': ['Back'],
  'Lat Pulldown': ['Back'],
  'Pull Up': ['Back'],
  'Chin Up': ['Back', 'Arms'],
  'Cable Row': ['Back'],

  'Shoulder Press': ['Shoulders'],
  'Overhead Press': ['Shoulders'],
  'Military Press': ['Shoulders'],
  'Lateral Raise': ['Shoulders'],
  'Front Raise': ['Shoulders'],
  'Rear Delt Fly': ['Shoulders'],

  'Bicep Curl': ['Arms'],
  'Hammer Curl': ['Arms'],
  'Preacher Curl': ['Arms'],
  'Concentration Curl': ['Arms'],

  'Tricep Extension': ['Arms'],
  'Tricep Pushdown': ['Arms'],
  'Skull Crusher': ['Arms'],
  'Close Grip Bench': ['Arms', 'Chest'],

  'Plank': ['Core'],
  'Crunch': ['Core'],
  'Sit Up': ['Core'],
  'Russian Twist': ['Core'],
  'Leg Raise': ['Core'],

  'Running': ['Cardio'],
  'Cycling': ['Cardio'],
  'Rowing': ['Cardio'],
};

const getMuscleGroupsForExercise = (exerciseName: string): string[] => {
  // Try exact match first
  if (EXERCISE_TO_MUSCLE_GROUP[exerciseName]) {
    return EXERCISE_TO_MUSCLE_GROUP[exerciseName];
  }

  // Try partial match
  const normalizedName = exerciseName.toLowerCase();
  for (const [key, value] of Object.entries(EXERCISE_TO_MUSCLE_GROUP)) {
    if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
      return value;
    }
  }

  // Default mapping based on keywords
  if (normalizedName.includes('press') || normalizedName.includes('push')) {
    if (normalizedName.includes('shoulder') || normalizedName.includes('overhead')) return ['Shoulders'];
    if (normalizedName.includes('leg')) return ['Legs'];
    return ['Chest'];
  }
  if (normalizedName.includes('squat') || normalizedName.includes('lunge')) return ['Legs'];
  if (normalizedName.includes('curl') || normalizedName.includes('tricep')) return ['Arms'];
  if (normalizedName.includes('row') || normalizedName.includes('pull') || normalizedName.includes('lat')) return ['Back'];
  if (normalizedName.includes('raise')) return ['Shoulders'];
  if (normalizedName.includes('plank') || normalizedName.includes('crunch') || normalizedName.includes('ab')) return ['Core'];

  return ['Other'];
};

/**
 * Fetch comprehensive workout statistics for a user
 */
export const fetchWorkoutStatistics = async (
  userId: string,
  timeRange: 'week' | 'month' | 'year' = 'week'
) => {
  try {
    console.log('📊 Fetching stats for user:', userId, 'Range:', timeRange);

    const now = new Date();
    const startDate = new Date();

    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 28); // Last 4 weeks
    } else if (timeRange === 'month') {
      startDate.setDate(now.getDate() - 120); // ~4 months
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    console.log('📅 Date range:', {
      from: startDate.toISOString(),
      to: now.toISOString()
    });

    // Fetch workout sessions
    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', startDate.toISOString())
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: true });

    console.log('📦 Fetched sessions:', sessions?.length || 0);

    if (error) {
      console.error('❌ Error fetching workout statistics:', error);
      throw error;
    }

    if (!sessions || sessions.length === 0) {
      console.log('⚠️ No sessions found in date range');
      return getEmptyStats();
    }

    console.log('✅ Processing sessions...');
    const processedData = processWorkoutData(sessions, userId);

    // FIX: Calculate GLOBAL trends (Last 2 sessions ever, ignoring date filter)
    const { data: lastSessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .not('completed_at', 'is', null) // Only completed sessions
      .order('completed_at', { ascending: false }) // Newest first
      .limit(2);

    let lastSessionName = 'Workout';

    if (lastSessions && lastSessions.length >= 2) {
      console.log('📊 Calculating Global Trends based on last 2 sessions');
      const latest = lastSessions[0];
      const previous = lastSessions[1];

      lastSessionName = latest.name || 'Workout'; // Get name

      // Calculate stats for these two specific sessions
      const latestStats = calculateSessionStats(latest.exercises_completed || []);
      const previousStats = calculateSessionStats(previous.exercises_completed || []);

      const latestDuration = calculateActualDuration(latest);
      const previousDuration = calculateActualDuration(previous);

      const volumeChange = previousStats.volume > 0
        ? ((latestStats.volume - previousStats.volume) / previousStats.volume) * 100
        : 0;

      const weightChange = previousStats.avgWeight > 0
        ? ((latestStats.avgWeight - previousStats.avgWeight) / previousStats.avgWeight) * 100
        : 0;

      const durationChange = previousDuration > 0
        ? ((latestDuration - previousDuration) / previousDuration) * 100
        : 0;

      // Overwrite the trends in processedData with these global trends
      processedData.stats.trends = {
        volume: Math.round(volumeChange * 10) / 10,
        weight: Math.round(weightChange * 10) / 10,
        duration: Math.round(durationChange * 10) / 10
      };

      // Also update the "Last Session" display values to match the absolute latest session
      processedData.stats.lastSessionVolume = Math.round(latestStats.volume);
      processedData.stats.lastSessionWeight = Math.round(latestStats.avgWeight);
      processedData.stats.lastSessionDuration = latestDuration;
      processedData.stats.lastSessionName = lastSessionName; // Set it

      // FIX: Update sessionMetrics to reflect the TRUE last session, not just the last in range
      const lastSessionExercises = latest.exercises_completed || [];
      const prevSessionExercises = previous.exercises_completed || [];

      // We use existing helper functions (they are available in module scope)
      processedData.sessionMetrics = {
        totalSets: calculateTotalSets(lastSessionExercises),
        totalReps: calculateTotalReps(lastSessionExercises),
        exercises: lastSessionExercises.filter((ex: any) => ex.completed).length,
        volumePR: processedData.sessionMetrics.volumePR, // Keep range-based calculation or mock
        setsChange: calculateTotalSets(lastSessionExercises) - calculateTotalSets(prevSessionExercises),
        repsChange: calculateTotalReps(lastSessionExercises) - calculateTotalReps(prevSessionExercises)
      };

      console.log('✅ Global Trends applied:', processedData.stats.trends);
    } else if (lastSessions && lastSessions.length === 1) {
      // Only one session exists
      const latest = lastSessions[0];
      lastSessionName = latest.name || 'Workout';
      processedData.stats.lastSessionName = lastSessionName;
    } else {
      console.log('⚠️ Not enough global history for trends, using range-based or zero');
    }

    console.log('✅ Processed data:', processedData.stats);

    return processedData;
  } catch (error) {
    console.error('❌ Error in fetchWorkoutStatistics:', error);
    throw error;
  }
};

/**
 * Helper to calculate duration from session object
 */
const calculateActualDuration = (session: any) => {
  if (!session?.started_at || !session?.completed_at) return 0;
  const start = new Date(session.started_at);
  const end = new Date(session.completed_at);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

/**
 * Process raw workout session data into statistics
 */
const processWorkoutData = (sessions: any[], userId: string) => {
  if (sessions.length === 0) {
    return getEmptyStats();
  }

  console.log('🔄 Processing', sessions.length, 'sessions');

  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;
  let totalDuration = 0;
  const muscleGroupCounts: Record<string, number> = {};
  const muscleGroupVolumes: Record<string, number> = {};
  const volumeData: VolumeProgressItem[] = [];
  const exercisePRs: Record<string, {
    weight: number;
    date: string;
    sessionId: string;
    exerciseId: string;
    reps: number;
    volume: number;
    duration: number;
  }> = {};

  // Track per-exercise stats
  const exerciseVolumes: Record<string, { total: number; count: number; id: string }> = {};
  const exerciseWeights: Record<string, { total: number; count: number; id: string }> = {};
  const exerciseDurations: Record<string, { total: number; count: number; id: string }> = {};

  sessions.forEach((session, index) => {
    const exercisesCompleted = session.exercises_completed;

    if (!exercisesCompleted || !Array.isArray(exercisesCompleted)) {
      console.log(`⚠️ Session ${index + 1} has no exercises_completed`);
      return;
    }

    console.log(`📝 Processing session ${index + 1} with ${exercisesCompleted.length} exercises`);

    let sessionVolume = 0;
    let sessionSets = 0;
    let sessionReps = 0;
    let sessionWeight = 0;
    let sessionWeightCount = 0;

    exercisesCompleted.forEach((exercise: any) => {
      const exerciseName = exercise.name;
      const exerciseId = exercise.id;
      const sets = parseInt(exercise.sets) || 0;
      const weights = exercise.weights || [];
      const repsArray = exercise.reps ? exercise.reps.split(',').map((r: string) => parseInt(r.trim())) : [];
      const completedSets = exercise.completedSets || [];

      // Calculate volume and stats for completed sets only
      completedSets.forEach((isCompleted: boolean, setIndex: number) => {
        if (isCompleted && setIndex < weights.length && setIndex < repsArray.length) {
          const weight = parseFloat(weights[setIndex]) || 0;
          const reps = repsArray[setIndex] || 0;
          const setVolume = weight * reps;

          sessionVolume += setVolume;
          sessionSets += 1;
          sessionReps += reps;

          if (weight > 0) {
            sessionWeight += weight;
            sessionWeightCount += 1;
          }

          // Track per-exercise volume
          if (!exerciseVolumes[exerciseName]) {
            exerciseVolumes[exerciseName] = { total: 0, count: 0, id: exerciseId };
          }
          exerciseVolumes[exerciseName].total += setVolume;
          exerciseVolumes[exerciseName].count += 1;

          // Track per-exercise average weight
          if (weight > 0) {
            if (!exerciseWeights[exerciseName]) {
              exerciseWeights[exerciseName] = { total: 0, count: 0, id: exerciseId };
            }
            exerciseWeights[exerciseName].total += weight;
            exerciseWeights[exerciseName].count += 1;
          }
        }
      });

      // Track muscle groups
      const muscleGroups = getMuscleGroupsForExercise(exerciseName);
      muscleGroups.forEach(mg => {
        muscleGroupCounts[mg] = (muscleGroupCounts[mg] || 0) + 1;
      });

      console.log(`    Exercise: ${exerciseName} -> Muscle Groups: [${muscleGroups.join(', ')}]`);

      // Track PRs (max weight across all sets)
      const maxWeight = Math.max(...weights.map((w: any) => parseFloat(w) || 0));
      console.log(`    💪 Exercise PR check: ${exerciseName} - Max weight: ${maxWeight} lbs`);

      if (maxWeight > 0) {
        if (!exercisePRs[exerciseName] || maxWeight > exercisePRs[exerciseName].weight) {
          console.log(`    ⭐ NEW PR for ${exerciseName}: ${maxWeight} lbs (previous: ${exercisePRs[exerciseName]?.weight || 0} lbs)`);

          // Find the set that achieved this max weight to get reps
          let prReps = 0;
          let prVolume = 0;
          let prDuration = 0;

          // Find index of max weight
          weights.forEach((w: any, idx: number) => {
            if (Math.abs(parseFloat(w) - maxWeight) < 0.1 && completedSets[idx]) {
              const r = repsArray[idx] || 0;
              // Prefer higher reps if multiple sets have same max weight? Or just first.
              if (r > prReps) prReps = r;
            }
          });

          // Calculate TOTAL volume for this exercise in this session
          // Or user wants volume of THAT set? Usually volume is total for exercise.
          // Image shows "Volume 405 lbs" which matches 405x1. 
          // If it was session volume it would be higher.
          // Let's assume Volume of the RECORD SET for now, or maybe the image implies total volume? 
          // "Volume 405 lbs" for a 405lb lift suggests just that lift's volume? 
          // 405 * 1 set * 1 rep = 405. 
          // If they did 405x1, volume is 405.

          prVolume = maxWeight * (prReps > 0 ? prReps : 1);

          // Duration: Divide session actual duration by number of exercises (approximation)
          // We calculated `actualDuration` later, let's move that calculation up or use rough estimate here?
          // We can't access `actualDuration` yet as it's calc below. 
          // Let's use `session.duration_minutes` if avail or 0, or calc it here.
          const sTime = new Date(session.started_at).getTime();
          const eTime = new Date(session.completed_at).getTime();
          const sDuration = Math.round((eTime - sTime) / 60000);
          prDuration = exercisesCompleted.length > 0 ? Math.round(sDuration / exercisesCompleted.length) : 0;

          exercisePRs[exerciseName] = {
            weight: maxWeight,
            date: session.started_at,
            sessionId: session.id,
            exerciseId: exerciseId,
            reps: prReps,
            volume: prVolume,
            duration: prDuration
          };
        }
      }
    });

    // FIX #1 & #2: Calculate actual duration from timestamps
    const startTime = new Date(session.started_at);
    const endTime = new Date(session.completed_at);
    const actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    console.log(`  ⏱️ Session ${index + 1} duration:`, {
      started: session.started_at,
      completed: session.completed_at,
      calculatedMinutes: actualDuration,
      databaseMinutes: session.duration_minutes
    });

    // Track exercise duration (use actual calculated duration)
    const totalExercisesInSession = exercisesCompleted.length;
    const durationPerExercise = totalExercisesInSession > 0 ? actualDuration / totalExercisesInSession : 0;

    exercisesCompleted.forEach((exercise: any) => {
      const exerciseName = exercise.name;
      const exerciseId = exercise.id;

      if (!exerciseDurations[exerciseName]) {
        exerciseDurations[exerciseName] = { total: 0, count: 0, id: exerciseId };
      }
      exerciseDurations[exerciseName].total += durationPerExercise;
      exerciseDurations[exerciseName].count += 1;
    });

    totalVolume += sessionVolume;
    totalSets += sessionSets;
    totalReps += sessionReps;
    totalWeight += sessionWeight;
    totalDuration += actualDuration;  // FIX #2: Use calculated duration

    // Distribute session volume across muscle groups
    const sessionMuscleGroups = [...new Set(exercisesCompleted.flatMap((ex: any) => getMuscleGroupsForExercise(ex.name)))];
    if (sessionMuscleGroups.length > 0) {
      const volumePerMuscle = sessionVolume / sessionMuscleGroups.length;
      sessionMuscleGroups.forEach(mg => {
        muscleGroupVolumes[mg] = (muscleGroupVolumes[mg] || 0) + volumePerMuscle;
      });
    }

    // FIX #3: Volume progress data - USE COMPLETED_AT
    const date = new Date(session.completed_at || session.started_at);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

    console.log(`  📅 Session ${index + 1} date:`, {
      completedAt: session.completed_at,
      parsedDate: date.toISOString(),
      dayOfWeek: dayName,
      volume: sessionVolume
    });

    volumeData.push({
      day: dayName,
      volume: sessionVolume,
      sets: sessionSets,
      date: date.toISOString()
    });

    console.log(`  Session ${index + 1} totals:`, {
      volume: sessionVolume,
      sets: sessionSets,
      reps: sessionReps,
      exercises: exercisesCompleted.length
    });
  });

  // --- Recovery Calculation ---
  const muscleRecovery: Record<string, number> = {};
  const nowTime = new Date().getTime();
  const muscleLastTrained: Record<string, number> = {};

  // Find last trained time for each muscle
  // Iterate backwards from most recent session
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const sessionTime = new Date(session.completed_at || session.started_at).getTime();

    // Safety check for exercises
    if (!session.exercises_completed || !Array.isArray(session.exercises_completed)) continue;

    const musclesInSession = new Set<string>();
    session.exercises_completed.forEach((ex: any) => {
      const mgs = getMuscleGroupsForExercise(ex.name);
      mgs.forEach(m => musclesInSession.add(m));
    });

    musclesInSession.forEach(m => {
      if (!muscleLastTrained[m]) {
        muscleLastTrained[m] = sessionTime;
      }
    });
  }

  // Calculate percentage based on 48h recovery window
  const RECOVERY_WINDOW_MS = 48 * 60 * 60 * 1000;

  // Default list of main muscles to always show
  const mainMuscles = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

  mainMuscles.forEach(muscle => {
    const lastTrained = muscleLastTrained[muscle];
    if (!lastTrained) {
      muscleRecovery[muscle] = 100; // Fully recovered if never trained (or not in range)
    } else {
      const elapsed = nowTime - lastTrained;
      const progress = Math.min((elapsed / RECOVERY_WINDOW_MS) * 100, 100);
      muscleRecovery[muscle] = Math.round(progress);
    }
  });

  // --- Consistency Calculation ---
  // 1. Current Streak: Consecutive days with workouts counting backwards from Today (or Yesterday)
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if worked out today
  const workedOutToday = volumeData.some(d => {
    const dDate = new Date(d.date);
    dDate.setHours(0, 0, 0, 0);
    return dDate.getTime() === today.getTime();
  });

  if (workedOutToday) currentStreak++;

  // Check backwards
  let checkDate = new Date(today);
  if (workedOutToday) checkDate.setDate(checkDate.getDate() - 1); // Start checking from yesterday

  // Loop back up to 365 days to find streak
  for (let i = 0; i < 365; i++) {
    const hasWorkout = volumeData.some(d => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === checkDate.getTime();
    });

    if (hasWorkout) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Allow 1 day break? No, strict streak for now.
      // Actually, let's just break if not found.
      // Wait, if we didn't workout today, we start checking from yesterday. 
      // If we didn't workout yesterday either, streak is 0.
      if (!workedOutToday && i === 0) {
        // Check if yesterday had workout
        // If neither today nor yesterday, streak is definitely 0? 
        // Usually apps allow streak to hold if you just missed today (but not yesterday).
        // Let's keep it simple: strict consecutive days.
        break;
      }
      break;
    }
  }

  // 2. This Month Count
  const currentMonth = new Date().getMonth();
  const thisMonthCount = volumeData.filter(d => new Date(d.date).getMonth() === currentMonth).length;

  // 3. Weekly Consistency (Last 7 days boolean)
  const weeklyConsistency = Array(7).fill(false); // [Mon, Tue, ..., Sun] ? Or just last 7 days?
  // Design shows specific days "Thu", "Fri" etc. So let's return a map or list that UI can parse.
  // Actually the UI wants a scrolling calendar. The `organizedVolumeData` (now 28 days) is perfect for that.
  // We'll just pass a summary of consistency here.


  console.log('🏆 Personal Records found:', Object.entries(exercisePRs).map(([name, data]) => ({
    exercise: name,
    maxWeight: data.weight,
    date: data.date
  })));

  // Organize volume data into 28 days (4 weeks) for proper week filtering
  const now = new Date();
  const organizedVolumeData: VolumeProgressItem[] = [];

  // Create 28 days array (4 weeks), starting from Today to 27 days ago (Newest to Oldest)
  for (let i = 0; i < 28; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - i);
    targetDate.setHours(0, 0, 0, 0);

    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][targetDate.getDay()];

    // Find all sessions on this date
    const sessionsOnDay = volumeData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === targetDate.getFullYear() &&
        itemDate.getMonth() === targetDate.getMonth() &&
        itemDate.getDate() === targetDate.getDate();
    });

    // Sum up volume and sets for all sessions on this day
    const dayVolume = sessionsOnDay.reduce((sum, s) => sum + s.volume, 0);
    const daySets = sessionsOnDay.reduce((sum, s) => sum + s.sets, 0);

    organizedVolumeData.push({
      day: dayName,
      volume: dayVolume,
      sets: daySets,
      date: targetDate.toISOString()
    });
  }

  console.log('📅 Organized volume data (last 28 days):', organizedVolumeData.map(d => ({
    date: new Date(d.date).toLocaleDateString(),
    day: d.day,
    volume: d.volume
  })));

  const sessionCount = sessions.length;
  const avgWeight = totalSets > 0 ? totalWeight / totalSets : 0;

  // Calculate changes from last session
  const lastSessionData = sessions[sessions.length - 1];
  const prevSessionData = sessions[sessions.length - 2];

  let lastVolume = 0, prevVolume = 0;
  let lastAvgWeight = 0, prevAvgWeight = 0;

  if (lastSessionData?.exercises_completed) {
    const { volume, avgWeight: lastAvg } = calculateSessionStats(lastSessionData.exercises_completed);
    lastVolume = volume;
    lastAvgWeight = lastAvg;
  }

  if (prevSessionData?.exercises_completed) {
    const { volume, avgWeight: prevAvg } = calculateSessionStats(prevSessionData.exercises_completed);
    prevVolume = volume;
    prevAvgWeight = prevAvg;
  }

  const volumeChange = prevVolume > 0 ? ((lastVolume - prevVolume) / prevVolume) * 100 : 0;
  const weightChange = prevAvgWeight > 0 ? ((lastAvgWeight - prevAvgWeight) / prevAvgWeight) * 100 : 0;

  // FIX #4: Calculate actual duration for changes
  const calculateActualDuration = (session: any) => {
    if (!session?.started_at || !session?.completed_at) return 0;
    const start = new Date(session.started_at);
    const end = new Date(session.completed_at);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const lastDuration = calculateActualDuration(lastSessionData);
  const prevDuration = calculateActualDuration(prevSessionData);
  const durationChange = prevDuration > 0 ? ((lastDuration - prevDuration) / prevDuration) * 100 : 0;

  // Process muscle groups for pie chart
  const totalWorkouts = sessions.length;
  const muscleGroups: MuscleGroupData[] = totalWorkouts > 0
    ? Object.entries(muscleGroupCounts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / totalWorkouts) * 100)
      }))
      .filter(mg => mg.percentage > 0) // Only show muscle groups that were trained
    : [];

  console.log('🎯 Muscle Groups Summary:', {
    totalWorkouts,
    muscleGroupCounts,
    calculatedPercentages: muscleGroups
  });

  // Calculate volume by muscle group
  const volumeByMuscle = Object.entries(muscleGroupVolumes)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  // Convert exercise PRs to personal records array
  const personalRecords: PersonalRecord[] = Object.entries(exercisePRs)
    .map(([exercise, data]) => ({
      exercise,
      weight: data.weight,
      date: new Date(data.date).toISOString().split('T')[0],
      change: 0,
      previousWeight: 0,
      exerciseId: data.exerciseId,
      reps: data.reps,
      volume: data.volume,
      duration: data.duration,
      sessionId: data.sessionId
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  // Exercise breakdowns
  const exerciseVolumeBreakdown: ExerciseBreakdown[] = Object.entries(exerciseVolumes)
    .map(([exercise, data]) => ({
      exercise,
      value: Math.round(data.total),
      exerciseId: data.id
    }))
    .sort((a, b) => b.value - a.value);

  const exerciseAvgWeightBreakdown: ExerciseBreakdown[] = Object.entries(exerciseWeights)
    .map(([exercise, data]) => ({
      exercise,
      value: Math.round(data.total / data.count),
      exerciseId: data.id
    }))
    .sort((a, b) => b.value - a.value);

  const exerciseDurationBreakdown: ExerciseBreakdown[] = Object.entries(exerciseDurations)
    .map(([exercise, data]) => ({
      exercise,
      value: Math.round(data.total / data.count),
      exerciseId: data.id
    }))
    .sort((a, b) => b.value - a.value);

  const stats: WorkoutStatsData = {
    totalVolume: Math.round(totalVolume),
    avgWeightPerSet: Math.round(avgWeight),
    duration: Math.round(totalDuration),  // TOTAL duration, not average
    volumeChange: Math.round(volumeChange * 10) / 10,
    weightChange: Math.round(weightChange * 10) / 10,
    durationChange: Math.round(durationChange * 10) / 10,
    lastSessionVolume: Math.round(lastVolume),
    lastSessionWeight: Math.round(lastAvgWeight),
    lastSessionDuration: lastDuration,
    totalSets: totalSets,
    recovery: muscleRecovery,
    consistency: {
      currentStreak,
      thisMonthCount,
      weeklyConsistency: [] // We use volumeProgress for detailed view
    },
    trends: {
      volume: volumeChange,
      weight: weightChange,
      duration: durationChange
    }
  };

  // Calculate session metrics for last workout
  const lastSessionExercises = lastSessionData?.exercises_completed || [];
  const prevSessionExercises = prevSessionData?.exercises_completed || [];

  const lastSessionStats = calculateSessionStats(lastSessionExercises);
  const prevSessionStats = prevSessionData ? calculateSessionStats(prevSessionExercises) : { volume: 0, avgWeight: 0 };

  // Check if last session was a volume PR by comparing to ALL previous sessions
  const allPreviousVolumes = sessions.slice(0, -1).map(s => {
    if (s.exercises_completed && Array.isArray(s.exercises_completed)) {
      return calculateSessionStats(s.exercises_completed).volume;
    }
    return 0;
  });
  const maxPreviousVolume = allPreviousVolumes.length > 0 ? Math.max(...allPreviousVolumes) : 0;
  const isVolumePR = lastSessionStats.volume > maxPreviousVolume && maxPreviousVolume > 0;

  const sessionMetrics: SessionMetrics = {
    totalSets: calculateTotalSets(lastSessionExercises),
    totalReps: calculateTotalReps(lastSessionExercises),
    exercises: lastSessionExercises.filter((ex: any) => ex.completed).length,
    volumePR: isVolumePR,
    setsChange: calculateTotalSets(lastSessionExercises) - calculateTotalSets(prevSessionExercises),
    repsChange: calculateTotalReps(lastSessionExercises) - calculateTotalReps(prevSessionExercises)
  };

  return {
    stats,
    volumeProgress: organizedVolumeData,  // Use organized data with proper 28-day structure
    personalRecords,
    muscleGroups,
    volumeByMuscle,
    sessionMetrics,
    exerciseVolumeBreakdown,
    exerciseAvgWeightBreakdown,
    exerciseDurationBreakdown
  };
};

/**
 * Calculate stats for a single session
 */
const calculateSessionStats = (exercisesCompleted: any[]) => {
  let volume = 0;
  let totalWeight = 0;
  let weightCount = 0;

  exercisesCompleted.forEach(exercise => {
    const weights = exercise.weights || [];
    const repsArray = exercise.reps ? exercise.reps.split(',').map((r: string) => parseInt(r.trim())) : [];
    const completedSets = exercise.completedSets || [];

    completedSets.forEach((isCompleted: boolean, setIndex: number) => {
      if (isCompleted && setIndex < weights.length && setIndex < repsArray.length) {
        const weight = parseFloat(weights[setIndex]) || 0;
        const reps = repsArray[setIndex] || 0;
        volume += weight * reps;

        if (weight > 0) {
          totalWeight += weight;
          weightCount += 1;
        }
      }
    });
  });

  return {
    volume,
    avgWeight: weightCount > 0 ? totalWeight / weightCount : 0
  };
};

/**
 * Calculate total completed sets
 */
const calculateTotalSets = (exercisesCompleted: any[]) => {
  return exercisesCompleted.reduce((total, exercise) => {
    const completedSets = exercise.completedSets || [];
    return total + completedSets.filter((completed: boolean) => completed).length;
  }, 0);
};

/**
 * Calculate total completed reps
 */
const calculateTotalReps = (exercisesCompleted: any[]) => {
  return exercisesCompleted.reduce((total, exercise) => {
    const repsArray = exercise.reps ? exercise.reps.split(',').map((r: string) => parseInt(r.trim())) : [];
    const completedSets = exercise.completedSets || [];

    return total + completedSets.reduce((repsTotal: number, isCompleted: boolean, index: number) => {
      return repsTotal + (isCompleted && index < repsArray.length ? repsArray[index] : 0);
    }, 0);
  }, 0);
};

/**
 * Get empty stats structure
 */
const getEmptyStats = () => ({
  stats: {
    totalVolume: 0,
    avgWeightPerSet: 0,
    duration: 0,
    volumeChange: 0,
    weightChange: 0,
    durationChange: 0,
    lastSessionVolume: 0,
    lastSessionWeight: 0,
    lastSessionDuration: 0,
    totalSets: 0,
    recovery: {},
    consistency: {
      currentStreak: 0,
      thisMonthCount: 0,
      weeklyConsistency: []
    },
    trends: {
      volume: 0,
      weight: 0,
      duration: 0
    },
    lastSessionName: 'None'
  },
  volumeProgress: [],
  personalRecords: [],
  muscleGroups: [],
  volumeByMuscle: [],
  sessionMetrics: {
    totalSets: 0,
    totalReps: 0,
    exercises: 0,
    volumePR: false,
    setsChange: 0,
    repsChange: 0
  },
  exerciseVolumeBreakdown: [],
  exerciseAvgWeightBreakdown: [],
  exerciseDurationBreakdown: []
});

/**
 * Fetch personal records for specific exercises
 */
export const fetchExerciseHistory = async (
  userId: string,
  exerciseId: string
) => {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, started_at, exercises_completed')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const exerciseHistory: any[] = [];

    data?.forEach(session => {
      if (session.exercises_completed && Array.isArray(session.exercises_completed)) {
        session.exercises_completed.forEach((exercise: any) => {
          if (exercise.id === exerciseId) {
            const weights = exercise.weights || [];
            const repsArray = exercise.reps ? exercise.reps.split(',').map((r: string) => parseInt(r.trim())) : [];
            const maxWeight = Math.max(...weights.map((w: any) => parseFloat(w) || 0));
            const totalReps = repsArray.reduce((sum: number, r: number) => sum + r, 0);

            exerciseHistory.push({
              date: session.started_at,
              weight: maxWeight,
              reps: totalReps,
              sets: parseInt(exercise.sets) || 0
            });
          }
        });
      }
    });

    return exerciseHistory;
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    throw error;
  }
};

/**
 * Fetch lifetime personal records for a user
 * Scans ALL complete sessions to find the absolute best max weight for each exercise.
 */
export const fetchLifetimePRs = async (userId: string) => {
  try {
    console.log('🏆 Fetching LIFETIME PRs for user:', userId);

    // Fetch ALL COMPLETED sessions for the user to determine true PRs
    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select('started_at, exercises_completed, id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: true }); // Process chronologically

    if (error) {
      console.error('Error fetching lifetime PRs:', error);
      throw error;
    }

    if (!sessions || sessions.length === 0) return [];

    const exercisePRs: Record<string, PersonalRecord> = {};

    sessions.forEach(session => {
      if (session.exercises_completed && Array.isArray(session.exercises_completed)) {
        session.exercises_completed.forEach((exercise: any) => {
          if (!exercise.name) return;

          const weights = exercise.weights || [];
          // Find max weight in this specific session's exercise
          const maxWeightInSession = Math.max(...weights.map((w: any) => parseFloat(w) || 0));

          if (maxWeightInSession > 0) {
            // If this is higher than current known PR, update it
            if (!exercisePRs[exercise.name] || maxWeightInSession > exercisePRs[exercise.name].weight) {
              exercisePRs[exercise.name] = {
                exercise: exercise.name,
                weight: maxWeightInSession,
                date: new Date(session.started_at).toISOString().split('T')[0],
                change: 0,
                previousWeight: exercisePRs[exercise.name]?.weight || 0,
                exerciseId: exercise.id,
                reps: 0, // Mock or calculate if needed
                volume: 0, // Mock
                duration: 0, // Mock
                sessionId: session.id
              };
            }
          }
        });
      }
    });

    // Convert map to array and sort by weight
    const prList = Object.values(exercisePRs).sort((a, b) => b.weight - a.weight);

    console.log(`✅ Found ${prList.length} lifetime PRs`);
    return prList;

  } catch (error) {
    console.error('❌ Error in fetchLifetimePRs:', error);
    return [];
  }
};