import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export type Wallet = {
  id: string;
  coach_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  description: string | null;
  booking_id: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
};

export type EarningsSummary = {
  thisWeek: number;
  thisMonth: number;
  allTime: number;
};

function mapWallet(row: Record<string, unknown>): Wallet {
  return {
    id: String(row.id),
    coach_id: String(row.coach_id),
    balance: Number(row.balance),
    currency: String(row.currency),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    wallet_id: String(row.wallet_id),
    type: String(row.type),
    amount: Number(row.amount),
    description: row.description != null ? String(row.description) : null,
    booking_id: row.booking_id != null ? String(row.booking_id) : null,
    stripe_transfer_id: row.stripe_transfer_id != null ? String(row.stripe_transfer_id) : null,
    created_at: String(row.created_at),
  };
}

function startOfWeekMondayLocal(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonthLocal(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

async function getWalletRowForCurrentUser(): Promise<Wallet | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.id) return null;

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('coach_id', profile.id)
      .maybeSingle();

    if (walletError) throw walletError;
    if (!wallet) return null;

    return mapWallet(wallet as Record<string, unknown>);
  } catch (error) {
    logger.error('Failed to resolve wallet for current user:', error);
    return null;
  }
}

async function sumEarningAmounts(walletId: string, fromIso: string | null): Promise<number> {
  const pageSize = 1000;
  let offset = 0;
  let total = 0;

  for (;;) {
    let q = supabase
      .from('transactions')
      .select('amount')
      .eq('wallet_id', walletId)
      .eq('type', 'earning')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (fromIso) {
      q = q.gte('created_at', fromIso);
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = data ?? [];
    for (const row of rows) {
      total += Number((row as { amount: unknown }).amount);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return total;
}

export const walletService = {
  async getWallet(): Promise<Wallet | null> {
    return getWalletRowForCurrentUser();
  },

  async getTransactions(limit: number, offset: number): Promise<Transaction[]> {
    try {
      if (limit <= 0) return [];

      const wallet = await getWalletRowForCurrentUser();
      if (!wallet) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data ?? []).map((row) => mapTransaction(row as Record<string, unknown>));
    } catch (error) {
      logger.error('Failed to fetch wallet transactions:', error);
      return [];
    }
  },

  async getEarningsSummary(): Promise<EarningsSummary> {
    const empty: EarningsSummary = { thisWeek: 0, thisMonth: 0, allTime: 0 };
    try {
      const wallet = await getWalletRowForCurrentUser();
      if (!wallet) return empty;

      const weekStart = startOfWeekMondayLocal().toISOString();
      const monthStart = startOfMonthLocal().toISOString();

      const [thisWeek, thisMonth, allTime] = await Promise.all([
        sumEarningAmounts(wallet.id, weekStart),
        sumEarningAmounts(wallet.id, monthStart),
        sumEarningAmounts(wallet.id, null),
      ]);

      return { thisWeek, thisMonth, allTime };
    } catch (error) {
      logger.error('Failed to compute earnings summary:', error);
      return empty;
    }
  },
};
