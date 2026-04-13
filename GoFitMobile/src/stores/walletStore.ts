import { create } from 'zustand';
import {
  walletService,
  type EarningsSummary,
  type Transaction,
  type Wallet,
} from '@/services/wallet';
import { logger } from '@/utils/logger';

const TRANSACTION_PAGE_SIZE = 20;

interface WalletStore {
  wallet: Wallet | null;
  transactions: Transaction[];
  earningsSummary: EarningsSummary | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;

  loadWallet: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  loadEarningsSummary: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallet: null,
  transactions: [],
  earningsSummary: null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,

  loadWallet: async () => {
    set({ isLoading: true });
    try {
      const wallet = await walletService.getWallet();
      set({ wallet, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      logger.error('Failed to load wallet:', error);
    }
  },

  loadTransactions: async () => {
    set({ isLoading: true });
    try {
      const pageSize = TRANSACTION_PAGE_SIZE;
      const transactions = await walletService.getTransactions(pageSize, 0);
      set({
        transactions,
        hasMore: transactions.length === pageSize,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      logger.error('Failed to load wallet transactions:', error);
    }
  },

  loadMoreTransactions: async () => {
    const { hasMore, isLoadingMore, transactions } = get();
    if (!hasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const pageSize = TRANSACTION_PAGE_SIZE;
      const next = await walletService.getTransactions(pageSize, transactions.length);
      set({
        transactions: [...transactions, ...next],
        hasMore: next.length === pageSize,
        isLoadingMore: false,
      });
    } catch (error) {
      set({ isLoadingMore: false });
      logger.error('Failed to load more wallet transactions:', error);
    }
  },

  loadEarningsSummary: async () => {
    set({ isLoading: true });
    try {
      const earningsSummary = await walletService.getEarningsSummary();
      set({ earningsSummary, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      logger.error('Failed to load earnings summary:', error);
    }
  },

  refresh: async () => {
    set({ isLoading: true, isLoadingMore: false });
    try {
      const pageSize = TRANSACTION_PAGE_SIZE;
      const [wallet, transactions, earningsSummary] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(pageSize, 0),
        walletService.getEarningsSummary(),
      ]);
      set({
        wallet,
        transactions,
        earningsSummary,
        hasMore: transactions.length === pageSize,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      logger.error('Failed to refresh wallet:', error);
    }
  },
}));
