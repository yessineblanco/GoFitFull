import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export const getCalendarPermission = async () => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    alert('Permission refusée pour accéder au calendrier');
    return false;
  }
  return true;
};

export const createAppCalendar = async (): Promise<string | null> => {
  const hasPermission = await getCalendarPermission();
  if (!hasPermission) return null;

  // Récupération du "source" pour créer le calendrier
  let defaultCalendarSource;
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    defaultCalendarSource = defaultCalendar;
  } else {
    // Pour Android, on crée un source local
    defaultCalendarSource = {
      isLocalAccount: true,
      name: 'Expo Calendar',
      type: Calendar.CalendarType.LOCAL, // Obligatoire pour TypeScript
    };
  }

  const calendarId = await Calendar.createCalendarAsync({
    title: 'GoFit Workouts',
    color: '#22c55e',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: (defaultCalendarSource as any).id || undefined, // TS safe cast
    source: defaultCalendarSource as any,
    name: 'GoFit Workouts',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return calendarId;
};

export const addWorkoutToNativeCalendar = async (workout: {
  name?: string;
  notes?: string;
  workout_date?: string;
  created_at: string;
  duration?: number;
}) => {
  const hasPermission = await getCalendarPermission();
  if (!hasPermission) return;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarId = calendars[0]?.id || (await createAppCalendar());
  if (!calendarId) return;

  const startDate = new Date(workout.workout_date || workout.created_at);
  const endDate = new Date(startDate.getTime() + (workout.duration || 60) * 60000);

  await Calendar.createEventAsync(calendarId, {
    title: workout.name || 'Workout',
    startDate,
    endDate,
    timeZone: 'GMT+1',
    location: '',
    notes: workout.notes || '',
  });

  alert('Workout ajouté au calendrier natif ✅');
};
