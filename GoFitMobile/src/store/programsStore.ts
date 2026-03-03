import { create } from 'zustand';
import {
  programsService,
  type CustomProgram,
  type CreateProgramInput,
} from '@/services/programs';
import { logger } from '@/utils/logger';

interface ProgramsStore {
  coachPrograms: CustomProgram[];
  clientPrograms: CustomProgram[];
  selectedProgram: CustomProgram | null;
  loading: boolean;

  loadCoachPrograms: (coachId: string) => Promise<void>;
  loadClientPrograms: (clientId: string) => Promise<void>;
  loadProgram: (programId: string) => Promise<void>;
  createProgram: (input: CreateProgramInput) => Promise<CustomProgram | null>;
  updateProgram: (programId: string, updates: Partial<Pick<CustomProgram, 'title' | 'description' | 'program_data' | 'status'>>) => Promise<void>;
  clearSelected: () => void;
}

export const useProgramsStore = create<ProgramsStore>((set, get) => ({
  coachPrograms: [],
  clientPrograms: [],
  selectedProgram: null,
  loading: false,

  loadCoachPrograms: async (coachId: string) => {
    set({ loading: true });
    try {
      const programs = await programsService.getByCoach(coachId);
      set({ coachPrograms: programs, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load coach programs:', error);
    }
  },

  loadClientPrograms: async (clientId: string) => {
    set({ loading: true });
    try {
      const programs = await programsService.getByClient(clientId);
      set({ clientPrograms: programs, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load client programs:', error);
    }
  },

  loadProgram: async (programId: string) => {
    set({ loading: true });
    try {
      const program = await programsService.getById(programId);
      set({ selectedProgram: program, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load program:', error);
    }
  },

  createProgram: async (input: CreateProgramInput) => {
    try {
      const program = await programsService.create(input);
      if (program) {
        set({ coachPrograms: [program, ...get().coachPrograms] });
      }
      return program;
    } catch (error) {
      logger.error('Failed to create program:', error);
      throw error;
    }
  },

  updateProgram: async (programId, updates) => {
    try {
      const updated = await programsService.update(programId, updates);
      if (updated) {
        set({
          coachPrograms: get().coachPrograms.map((p) => (p.id === programId ? updated : p)),
          clientPrograms: get().clientPrograms.map((p) => (p.id === programId ? updated : p)),
          selectedProgram: get().selectedProgram?.id === programId ? updated : get().selectedProgram,
        });
      }
    } catch (error) {
      logger.error('Failed to update program:', error);
      throw error;
    }
  },

  clearSelected: () => set({ selectedProgram: null }),
}));
