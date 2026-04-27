import { Platform } from 'react-native';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export type HealthSyncStatus = 'unsupported' | 'disconnected' | 'connected' | 'syncing' | 'error';

export type HealthDataRow = {
  id?: string;
  user_id: string;
  date: string;
  steps: number;
  active_calories: number;
  source: 'health_connect' | 'manual';
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
};

type HealthPermissionResult = {
  status: HealthSyncStatus;
  message?: string;
};

const HEALTH_CONNECT_SOURCE = 'health_connect' as const;
const HEALTH_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
] as const;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function dateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function hasRequiredPermissions(granted: Array<{ accessType?: string; recordType?: string }>) {
  return HEALTH_PERMISSIONS.every((permission) =>
    granted.some((item) => item.accessType === permission.accessType && item.recordType === permission.recordType)
  );
}

async function getHealthConnect() {
  if (Platform.OS !== 'android') return null;
  return import('react-native-health-connect');
}

export async function requestHealthPermissions(): Promise<HealthPermissionResult> {
  const healthConnect = await getHealthConnect();
  if (!healthConnect) {
    return { status: 'unsupported', message: 'Health Connect is only available on Android in v1.' };
  }

  try {
    const sdkStatus = await healthConnect.getSdkStatus();
    if (sdkStatus !== healthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { status: 'unsupported', message: 'Health Connect is not available on this device.' };
    }

    const initialized = await healthConnect.initialize();
    if (!initialized) {
      return { status: 'unsupported', message: 'Health Connect could not be initialized.' };
    }

    const granted = await healthConnect.requestPermission([...HEALTH_PERMISSIONS]);
    return hasRequiredPermissions(granted)
      ? { status: 'connected' }
      : { status: 'disconnected', message: 'Steps and active calories permissions are required.' };
  } catch (error) {
    logger.error('Health Connect permission request failed', error);
    return { status: 'error', message: 'Could not connect to Health Connect.' };
  }
}

export async function checkHealthPermissions(): Promise<HealthPermissionResult> {
  const healthConnect = await getHealthConnect();
  if (!healthConnect) {
    return { status: 'unsupported', message: 'Health Connect is only available on Android in v1.' };
  }

  try {
    const sdkStatus = await healthConnect.getSdkStatus();
    if (sdkStatus !== healthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { status: 'unsupported', message: 'Health Connect is not available on this device.' };
    }

    const initialized = await healthConnect.initialize();
    if (!initialized) {
      return { status: 'unsupported', message: 'Health Connect could not be initialized.' };
    }

    const granted = await healthConnect.getGrantedPermissions();
    return hasRequiredPermissions(granted)
      ? { status: 'connected' }
      : { status: 'disconnected' };
  } catch (error) {
    logger.error('Health Connect permission check failed', error);
    return { status: 'error', message: 'Could not check Health Connect permissions.' };
  }
}

async function readDailyHealthConnectTotals(date: Date) {
  const healthConnect = await getHealthConnect();
  if (!healthConnect) {
    return { steps: 0, active_calories: 0 };
  }

  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: startOfLocalDay(date).toISOString(),
    endTime: endOfLocalDay(date).toISOString(),
  };

  const [stepsResult, caloriesResult] = await Promise.all([
    healthConnect.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter,
    }),
    healthConnect.aggregateRecord({
      recordType: 'ActiveCaloriesBurned',
      timeRangeFilter,
    }),
  ]);

  return {
    steps: Math.max(0, Math.round((stepsResult as any).COUNT_TOTAL || 0)),
    active_calories: Math.max(0, Math.round((caloriesResult as any).ACTIVE_CALORIES_TOTAL?.inKilocalories || 0)),
  };
}

export async function syncHealthData(userId: string): Promise<HealthDataRow[]> {
  const permission = await checkHealthPermissions();
  if (permission.status !== 'connected') {
    throw new Error(permission.message || 'Health Connect is not connected.');
  }

  const rows: HealthDataRow[] = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const date = dateDaysAgo(daysAgo);
    const totals = await readDailyHealthConnectTotals(date);
    rows.push({
      user_id: userId,
      date: toDateKey(date),
      steps: totals.steps,
      active_calories: totals.active_calories,
      source: HEALTH_CONNECT_SOURCE,
      synced_at: new Date().toISOString(),
    });
  }

  const { data, error } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,date,source' })
    .select('id,user_id,date,steps,active_calories,source,synced_at,created_at,updated_at')
    .order('date', { ascending: false });

  if (error) {
    logger.error('Failed to upsert Health Connect data', error);
    throw error;
  }

  return (data || []) as HealthDataRow[];
}

export async function getHealthHistory(userId: string, days = 7): Promise<HealthDataRow[]> {
  const from = toDateKey(dateDaysAgo(days - 1));
  const { data, error } = await supabase
    .from('health_data')
    .select('id,user_id,date,steps,active_calories,source,synced_at,created_at,updated_at')
    .eq('user_id', userId)
    .eq('source', HEALTH_CONNECT_SOURCE)
    .gte('date', from)
    .order('date', { ascending: false });

  if (error) {
    logger.error('Failed to load health history', error);
    throw error;
  }

  return (data || []) as HealthDataRow[];
}

export function openHealthConnectSettings() {
  void getHealthConnect().then((healthConnect) => {
    healthConnect?.openHealthConnectSettings();
  });
}
