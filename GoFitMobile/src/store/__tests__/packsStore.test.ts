jest.mock('@/services/sessionPacks', () => ({
  sessionPacksService: {
    getPacksByCoach: jest.fn(),
    getActivePacksByCoach: jest.fn(),
    getPurchasedPacks: jest.fn(),
    createPack: jest.fn(),
    updatePack: jest.fn(),
    deletePack: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import {
  sessionPacksService,
  type CreatePackInput,
  type SessionPack,
} from '@/services/sessionPacks';
import { usePacksStore } from '../packsStore';

const mockedSessionPacksService = sessionPacksService as jest.Mocked<typeof sessionPacksService>;

const makePack = (id: string, name = 'Starter Pack'): SessionPack => ({
  id,
  coach_id: 'coach-1',
  name,
  session_count: 5,
  price: 100,
  currency: 'EUR',
  description: null,
  is_active: true,
  created_at: '2026-06-12T10:00:00.000Z',
  updated_at: '2026-06-12T10:00:00.000Z',
});

describe('packs store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePacksStore.setState({
      myPacks: [],
      coachPacks: [],
      purchasedPacks: [],
      loading: false,
      loadingCoachPacks: false,
    });
  });

  test('loads only active coach packs into the marketplace state', async () => {
    const packs = [makePack('pack-1')];
    mockedSessionPacksService.getActivePacksByCoach.mockResolvedValue(packs);

    const promise = usePacksStore.getState().loadCoachPacks('coach-1');
    expect(usePacksStore.getState().loadingCoachPacks).toBe(true);

    await promise;

    expect(mockedSessionPacksService.getActivePacksByCoach).toHaveBeenCalledWith('coach-1');
    expect(usePacksStore.getState()).toMatchObject({
      coachPacks: packs,
      loadingCoachPacks: false,
    });
  });

  test('prepends a created pack to the coach inventory', async () => {
    const existing = makePack('existing');
    const created = makePack('created', 'Ten Sessions');
    const input: CreatePackInput = {
      coach_id: 'coach-1',
      name: created.name,
      session_count: 10,
      price: 180,
    };
    usePacksStore.setState({ myPacks: [existing] });
    mockedSessionPacksService.createPack.mockResolvedValue(created);

    await expect(usePacksStore.getState().createPack(input)).resolves.toBe(created);
    expect(usePacksStore.getState().myPacks).toEqual([created, existing]);
  });

  test('replaces only the pack returned by an update', async () => {
    const target = makePack('target');
    const other = makePack('other');
    const updated = { ...target, name: 'Updated Pack', price: 120 };
    usePacksStore.setState({ myPacks: [target, other] });
    mockedSessionPacksService.updatePack.mockResolvedValue(updated);

    await usePacksStore.getState().updatePack('target', { name: updated.name, price: 120 });

    expect(usePacksStore.getState().myPacks).toEqual([updated, other]);
  });

  test('removes a deleted pack and preserves state when deletion fails', async () => {
    const target = makePack('target');
    const other = makePack('other');
    usePacksStore.setState({ myPacks: [target, other] });
    mockedSessionPacksService.deletePack.mockResolvedValueOnce();

    await usePacksStore.getState().deletePack('target', 'coach-1');
    expect(usePacksStore.getState().myPacks).toEqual([other]);

    mockedSessionPacksService.deletePack.mockRejectedValueOnce(new Error('delete failed'));
    await expect(
      usePacksStore.getState().deletePack('other', 'coach-1'),
    ).rejects.toThrow('delete failed');
    expect(usePacksStore.getState().myPacks).toEqual([other]);
  });
});
