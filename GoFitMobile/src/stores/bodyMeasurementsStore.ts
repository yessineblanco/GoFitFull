import { create } from 'zustand';
import {
  bodyMeasurementsService,
  type AnalyzePhotoOptions,
  type BodyMeasurement,
  type MeasurementInput,
} from '@/services/bodyMeasurements';
import { logger } from '@/utils/logger';

interface BodyMeasurementsState {
  history: BodyMeasurement[];
  latest: BodyMeasurement | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;

  loadHistory: () => Promise<void>;
  loadLatest: () => Promise<void>;
  analyzePhoto: (imageBase64: string, options?: AnalyzePhotoOptions) => Promise<BodyMeasurement | null>;
  saveManual: (input: MeasurementInput) => Promise<BodyMeasurement | null>;
  deleteMeasurement: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useBodyMeasurementsStore = create<BodyMeasurementsState>((set, get) => ({
  history: [],
  latest: null,
  isLoading: false,
  isAnalyzing: false,
  error: null,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const history = await bodyMeasurementsService.getHistory();
      set({ history, isLoading: false });
    } catch (error) {
      logger.error('Failed to load measurement history', error);
      set({ isLoading: false });
    }
  },

  loadLatest: async () => {
    try {
      const latest = await bodyMeasurementsService.getLatest();
      set({ latest });
    } catch (error) {
      logger.error('Failed to load latest measurement', error);
    }
  },

  analyzePhoto: async (imageBase64: string, options: AnalyzePhotoOptions = {}) => {
    set({ isAnalyzing: true, error: null });
    try {
      const result = await bodyMeasurementsService.analyzePhoto(imageBase64, options);
      set((state) => ({
        isAnalyzing: false,
        latest: result.record,
        history: [result.record, ...state.history],
      }));
      return result.record;
    } catch (error: any) {
      const msg = error?.message || 'Failed to analyze photo';
      logger.error('Photo analysis failed', error);
      set({ isAnalyzing: false, error: msg });
      return null;
    }
  },

  saveManual: async (input: MeasurementInput) => {
    set({ isLoading: true, error: null });
    try {
      const record = await bodyMeasurementsService.saveManual(input);
      set((state) => ({
        isLoading: false,
        latest: record,
        history: [record, ...state.history],
      }));
      return record;
    } catch (error: any) {
      logger.error('Failed to save manual measurement', error);
      set({ isLoading: false, error: error?.message });
      return null;
    }
  },

  deleteMeasurement: async (id: string) => {
    try {
      await bodyMeasurementsService.deleteMeasurement(id);
      const [history, latest] = await Promise.all([
        bodyMeasurementsService.getHistory(),
        bodyMeasurementsService.getLatest(),
      ]);
      set({ history, latest });
    } catch (error) {
      logger.error('Failed to delete measurement', error);
    }
  },

  refresh: async () => {
    set({ isLoading: true });
    try {
      const [history, latest] = await Promise.all([
        bodyMeasurementsService.getHistory(),
        bodyMeasurementsService.getLatest(),
      ]);
      set({ history, latest, isLoading: false });
    } catch (error) {
      logger.error('Failed to refresh measurements', error);
      set({ isLoading: false });
    }
  },
}));
