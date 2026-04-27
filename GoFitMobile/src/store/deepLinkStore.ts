import { create } from 'zustand';

export interface PendingDeepLink {
  type: 'coach';
  coachId: string;
}

interface DeepLinkState {
  pending: PendingDeepLink | null;
  setPending: (link: PendingDeepLink | null) => void;
  consumePending: () => PendingDeepLink | null;
}

export const useDeepLinkStore = create<DeepLinkState>((set, get) => ({
  pending: null,
  setPending: (link) => set({ pending: link }),
  consumePending: () => {
    const state = get();
    set({ pending: null });
    return state.pending;
  },
}));

export function parseGoFitUrl(url: string): PendingDeepLink | null {
  try {
    const match = url.match(/gofit:\/\/coach\/([a-f0-9-]+)/i);
    if (match) {
      return { type: 'coach', coachId: match[1] };
    }
  } catch {}
  return null;
}
