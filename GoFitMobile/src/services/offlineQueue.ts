import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { workoutService } from './workouts';
import { logger } from '@/utils/logger';

const QUEUE_KEY = '@gofit_offline_queue';

export interface QueuedWorkout {
  id: string;
  sessionId: string;
  userId: string;
  updates: {
    completed_at?: string;
    duration_minutes?: number;
    exercises_completed?: any[];
    notes?: string;
  };
  queuedAt: string;
}

export const offlineQueueService = {
  /** Save a workout completion payload to the local queue */
  async enqueue(item: Omit<QueuedWorkout, 'id' | 'queuedAt'>): Promise<void> {
    const queue = await this.getQueue();
    const entry: QueuedWorkout = {
      ...item,
      id: `${item.sessionId}_${Date.now()}`,
      queuedAt: new Date().toISOString(),
    };
    queue.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    logger.info('[OfflineQueue] Enqueued workout', { sessionId: item.sessionId });
  },

  /** Get all queued items */
  async getQueue(): Promise<QueuedWorkout[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Remove a single item from the queue by id */
  async dequeue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  /** Attempt to sync all queued workouts to the server. Returns count of synced items. */
  async syncAll(): Promise<number> {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      logger.info('[OfflineQueue] No connection, skipping sync');
      return 0;
    }

    const queue = await this.getQueue();
    if (queue.length === 0) return 0;

    logger.info(`[OfflineQueue] Syncing ${queue.length} queued workout(s)...`);
    let synced = 0;

    for (const item of queue) {
      try {
        await workoutService.updateWorkoutSession(item.sessionId, item.userId, item.updates);
        await this.dequeue(item.id);
        synced++;
        logger.info(`[OfflineQueue] Synced session ${item.sessionId}`);
      } catch (error) {
        logger.error(`[OfflineQueue] Failed to sync session ${item.sessionId}:`, error);
        // Leave in queue for next attempt
      }
    }

    return synced;
  },

  /** Check if there are any pending items */
  async hasPending(): Promise<boolean> {
    const queue = await this.getQueue();
    return queue.length > 0;
  },

  /** Get count of pending items */
  async pendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  },
};
