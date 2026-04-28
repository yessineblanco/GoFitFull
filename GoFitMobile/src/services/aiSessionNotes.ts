import { supabase } from '@/config/supabase';

export interface AISessionNote {
  id: string;
  summary: string;
  context: Record<string, unknown>;
  generated_by: string;
  created_at: string;
  expires_at: string;
  cached: boolean;
}

export const aiSessionNotesService = {
  async generateBriefing(clientId: string, force = false): Promise<AISessionNote> {
    const { data, error } = await supabase.functions.invoke('ai-session-notes', {
      body: { client_id: clientId, force },
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate briefing');
    }

    if (!data?.summary) {
      throw new Error('AI did not return a usable briefing');
    }

    return data as AISessionNote;
  },
};
