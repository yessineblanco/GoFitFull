import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  DollarSign,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getResponsiveFontSize } from '@/utils/responsive';
import { type Transaction } from '@/services/wallet';
import { useWalletStore } from '@/stores/walletStore';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const BG = '#030303';
const BRAND = '#B4F04E';
const GLASS_BG = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.06)';
const POSITIVE = '#B4F04E';
const NEGATIVE = '#FF5252';

const formatMoney = (currency: string, value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const CoachWalletScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();

  const wallet = useWalletStore((s) => s.wallet);
  const transactions = useWalletStore((s) => s.transactions);
  const earningsSummary = useWalletStore((s) => s.earningsSummary);
  const isLoading = useWalletStore((s) => s.isLoading);
  const isLoadingMore = useWalletStore((s) => s.isLoadingMore);
  const hasMore = useWalletStore((s) => s.hasMore);
  const loadWallet = useWalletStore((s) => s.loadWallet);
  const loadTransactions = useWalletStore((s) => s.loadTransactions);
  const loadEarningsSummary = useWalletStore((s) => s.loadEarningsSummary);
  const loadMoreTransactions = useWalletStore((s) => s.loadMoreTransactions);
  const refresh = useWalletStore((s) => s.refresh);

  const skipFirstFocusRefresh = useRef(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.all([loadWallet(), loadTransactions(), loadEarningsSummary()]);
      if (active) setInitializing(false);
    })();
    return () => {
      active = false;
    };
  }, [loadWallet, loadTransactions, loadEarningsSummary]);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocusRefresh.current) {
        skipFirstFocusRefresh.current = false;
        return;
      }
      void refresh();
    }, [refresh]),
  );

  const currency = wallet?.currency ?? 'USD';
  const balance = wallet?.balance ?? 0;
  const week = earningsSummary?.thisWeek ?? 0;
  const month = earningsSummary?.thisMonth ?? 0;
  const allTime = earningsSummary?.allTime ?? 0;

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const txBorderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const calendarIconColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => {
      const positive = item.amount >= 0;
      const Icon = positive ? ArrowDownLeft : ArrowUpRight;
      const amountColor = positive ? POSITIVE : NEGATIVE;
      const amountPrefix = positive ? '+' : '';
      return (
        <View style={[styles.txRow, { borderBottomColor: txBorderColor }]}>
          <View style={[styles.txIconWrap, { backgroundColor: positive ? 'rgba(180,240,78,0.12)' : 'rgba(255,82,82,0.12)' }]}>
            <Icon size={20} color={positive ? POSITIVE : NEGATIVE} />
          </View>
          <View style={styles.txMid}>
            <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={2}>
              {item.description ?? '—'}
            </Text>
            <View style={styles.txMeta}>
              <Calendar size={12} color={calendarIconColor} />
              <Text style={[styles.txDate, { color: colors.textLight }]}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
          <Text style={[styles.txAmount, { color: amountColor }]}>
            {amountPrefix}
            {formatMoney(currency, Math.abs(item.amount))}
          </Text>
        </View>
      );
    },
    [currency, colors.text, colors.textLight, txBorderColor, calendarIconColor],
  );

  const listHeader = (
    <>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            borderColor: getGlassBorder(isDark),
          }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('wallet.title', { defaultValue: 'Wallet' })}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <LinearGradient
        colors={isDark
          ? ['rgba(180,240,78,0.28)', 'rgba(180,240,78,0.08)', 'rgba(3,10,6,0.95)']
          : ['rgba(132,196,65,0.22)', 'rgba(132,196,65,0.06)', 'rgba(250,251,252,0.95)']
        }
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.balanceCard, { borderColor: isDark ? 'rgba(180,240,78,0.25)' : 'rgba(132,196,65,0.3)' }]}
      >
        <LinearGradient
          colors={isDark
            ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
            : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']
          }
          style={styles.balanceCardShine}
          pointerEvents="none"
        />
        <View style={styles.balanceInner}>
          <View style={styles.balanceTopRow}>
            <View style={[styles.balancePill, {
              backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
              <Wallet size={16} color={BRAND} />
              <Text style={[styles.balancePillText, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.text }]}>{currency}</Text>
            </View>
            <TrendingUp size={22} color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'} />
          </View>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>{formatMoney(currency, balance)}</Text>
          <Text style={[styles.balanceSubtitle, { color: colors.textSecondary }]}>Available Balance</Text>
        </View>
      </LinearGradient>

      <View style={styles.summaryRow}>
        {[
          { label: 'This Week', value: week },
          { label: 'This Month', value: month },
          { label: 'All Time', value: allTime },
        ].map((cell) => (
          <View key={cell.label} style={[styles.summaryCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]} numberOfLines={1}>
              {cell.label}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>
              {formatMoney(currency, cell.value)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <DollarSign size={18} color={BRAND} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
      </View>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient
        colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />
        }
        onEndReachedThreshold={0.35}
        onEndReached={() => {
          void loadMoreTransactions();
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {initializing || isLoading ? (
              <ActivityIndicator color={BRAND} />
            ) : (
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No transactions yet</Text>
            )}
          </View>
        }
        ListFooterComponent={
          hasMore && isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={BRAND} size="small" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  listContent: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: { width: 44, height: 44 },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(20),
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  balanceCard: {
    borderRadius: 20,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(180,240,78,0.25)',
  },
  balanceCardShine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  balanceInner: {
    padding: 22,
    zIndex: 1,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  balancePillText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(36),
    color: '#FFFFFF',
    marginBottom: 6,
  },
  balanceSubtitle: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.55)',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  summaryLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
  },
  summaryValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    color: '#FFFFFF',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txMid: { flex: 1, minWidth: 0 },
  txTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 4,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txDate: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.38)',
  },
  txAmount: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(15),
    marginLeft: 8,
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.45)',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
