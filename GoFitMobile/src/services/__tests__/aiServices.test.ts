jest.mock('@/config/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
}));

import { supabase } from '@/config/supabase';
import { aiSessionNotesService } from '@/services/aiSessionNotes';
import { workoutRecommendationService } from '@/services/workoutRecommendations';

const mockedInvoke = supabase.functions.invoke as jest.Mock;

describe('AI service wrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requests an AI workout recommendation and returns usable data', async () => {
    const recommendation = {
      name: 'Push Day',
      difficulty: 'Custom',
      focus: 'Chest',
      reason: 'Readiness supports moderate volume.',
      exercises: [{ id: 'exercise-1', name: 'Bench Press', sets: '3', reps: '8' }],
    };
    mockedInvoke.mockResolvedValue({ data: recommendation, error: null });

    await expect(workoutRecommendationService.generateAIWorkout()).resolves.toBe(recommendation);

    expect(mockedInvoke).toHaveBeenCalledWith('ai-workout-recommendation');
  });

  test('rejects an AI workout response without exercises', async () => {
    mockedInvoke.mockResolvedValue({ data: { name: 'Empty' }, error: null });

    await expect(workoutRecommendationService.generateAIWorkout()).rejects.toThrow(
      'AI did not return a usable workout',
    );
  });

  test('surfaces AI workout function errors', async () => {
    mockedInvoke.mockResolvedValue({ data: null, error: { message: 'Groq unavailable' } });

    await expect(workoutRecommendationService.generateAIWorkout()).rejects.toThrow('Groq unavailable');
  });

  test('requests AI session notes with client id and force flag', async () => {
    const briefing = {
      id: 'note-1',
      summary: 'Client has a lower-body session today.',
      context: {},
      generated_by: 'ai',
      created_at: '2026-07-07T10:00:00.000Z',
      expires_at: '2026-07-08T10:00:00.000Z',
      cached: false,
    };
    mockedInvoke.mockResolvedValue({ data: briefing, error: null });

    await expect(aiSessionNotesService.generateBriefing('client-1', true)).resolves.toBe(briefing);

    expect(mockedInvoke).toHaveBeenCalledWith('ai-session-notes', {
      body: { client_id: 'client-1', force: true },
    });
  });

  test('rejects an AI session note response without a summary', async () => {
    mockedInvoke.mockResolvedValue({ data: { id: 'note-1' }, error: null });

    await expect(aiSessionNotesService.generateBriefing('client-1')).rejects.toThrow(
      'AI did not return a usable briefing',
    );
  });
});
