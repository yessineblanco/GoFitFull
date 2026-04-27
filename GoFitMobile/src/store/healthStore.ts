import { AppState } from 'react-native';
import { create } from 'zustand';
import {
  checkHealthPermissions,
  getHealthHistory,
  HealthDataRow,
  HealthSyncStatus,
  requestHealthPermissions,
  syncHealthData,
} from '@/services/healthSync';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';

const SYNC_COOLDOWN_MS = 15 * 60 * 1000;

type HealthState = {
  status: HealthSyncStatus;
  localDisabled: boolean;
  history: HealthDataRow[];
  today: HealthDataRow | null;
  lastSyncedAt: string | null;
  error: string | null;
  loadHistory: () => Promise<void>;
  checkConnection: () => Promise<void>;
  connect: () => Promise<void>;
  sync: (force?: boolean) => Promise<void>;
  disconnectLocal: () => void;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function deriveToday(history: HealthDataRow[]) {
  return history.find((row) => row.date === todayKey()) || null;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  status: 'disconnected',
  localDisabled: false,
  history: [],
  today: null,
  lastSyncedAt: null,
  error: null,

  loadHistory: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) return;

    try {
      const history = await getHealthHistory(user.id, 7);
      set({ history, today: deriveToday(history), error: null });
    } catch (error: any) {
      logger.error('health loadHistory', error);
      set({ error: error?.message || 'Could not load health data.' });
    }
  },

  checkConnection: async () => {
    if (get().localDisabled) {
      set({ status: 'disconnected', error: null });
      return;
    }
    const result = await checkHealthPermissions();
    set({ status: result.status, error: result.message || null });
  },

  connect: async () => {
    set({ status: 'syncing', localDisabled: false, error: null });
    const result = await requestHealthPermissions();
    set({ status: result.status, error: result.message || null });
    if (result.status === 'connected') {
      await get().sync(true);
    }
  },

  sync: async (force = false) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) return;

    const { lastSyncedAt, status } = get();
    if (!force && status === 'connected' && lastSyncedAt) {
      const elapsed = Date.now() - new Date(lastSyncedAt).getTime();
      if (elapsed < SYNC_COOLDOWN_MS) return;
    }

    set({ status: 'syncing', error: null });
    try {
      const rows = await syncHealthData(user.id);
      const now = new Date().toISOString();
      set({
        status: 'connected',
        history: rows,
        today: deriveToday(rows),
        lastSyncedAt: now,
        error: null,
      });
    } catch (error: any) {
      logger.error('health sync', error);
      const message = error?.message || 'Could not sync Health Connect.';
      set({ status: message.includes('not connected') ? 'disconnected' : 'error', error: message });
      await get().loadHistory();
    }
  },

  disconnectLocal: () => {
    set({
      status: 'disconnected',
      localDisabled: true,
      error: null,
      lastSyncedAt: null,
    });
  },
}));

export function attachHealthForegroundSync() {
  return AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      const state = useHealthStore.getState();
      if (state.status === 'connected') {
        void state.sync(false);
      }
    }
  });
}
