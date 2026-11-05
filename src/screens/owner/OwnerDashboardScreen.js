import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { bookingAPI, shopAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toLocalYMD, formatTime12h, formatSlotDate } from '../../utils/time';
import OwnerSlotGrid from '../../components/OwnerSlotGrid';

const OwnerDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [shop, setShop]         = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);
  const [tick, setTick] = useState(0);
  const [upcomingPending, setUpcomingPending] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    setError(null);
    try {
      const shopRes = await shopAPI.getMyShop();
      const shopData = shopRes.data.data.shop;
      setShop(shopData);
      const [bookingRes, summaryRes] = await Promise.all([
        bookingAPI.getShopBookings(shopData._id, toLocalYMD()),
        bookingAPI.getShopSummary(shopData._id).catch(e => { console.log('summary error:', e.message); return null; }),
      ]);
      setBookings(bookingRes.data.data);
      setUpcomingPending((summaryRes?.data?.data || []).reduce((n, r) => n + (r.pending || 0), 0));
      setTick(t => t + 1);
    } catch (err) {
      console.log('fetchData error:', err);
      setError('Failed to load dashboard. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!loading && shop && shop.verificationStatus !== 'approved') {
    return (
      <View style={styles.center}>
        <Ionicons
          name={shop.verificationStatus === 'rejected' ? 'close-circle-outline' : 'time-outline'}
          size={48}
          color={shop.verificationStatus === 'rejected' ? COLORS.error : COLORS.warning}
        />
        <Text style={styles.reviewTitle}>
          {shop.verificationStatus === 'rejected' ? 'Shop Rejected' : 'Shop Under Review'}
        </Text>
        <Text style={styles.reviewSubtext}>
          {shop.verificationStatus === 'rejected'
            ? (shop.rejectionReason || 'Your shop was not approved. Please contact support.')
            : 'Your shop is being reviewed by our team. This usually takes 24-48 hours.'}
        </Text>
      </View>
    );
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
    </View>
  );

  if (error && !shop) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
      <Text style={styles.reviewTitle}>Something went wrong</Text>
      <Text style={styles.reviewSubtext}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const live       = bookings.filter(b => !['cancelled', 'no_show'].includes(b.status));
  const confirmed  = bookings.filter(b => b.status === 'confirmed').length;
  const onlinePaid = bookings.filter(b => b.paymentStatus === 'paid' && b.status !== 'cancelled').reduce((s, b) => s + (b.amount || 0), 0);
  const nextUp     = bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).sort((a, b) => a.slotTime.localeCompare(b.slotTime))[0];
  const isActive  = (s) => ['pending', 'confirmed'].includes(s);
  const todayList = [...bookings].sort((a, b) => (isActive(a.status) ? 0 : 1) - (isActive(b.status) ? 0 : 1) || a.slotTime.localeCompare(b.slotTime));
  const hr         = new Date().getHours();
  const greet      = hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening';
  const firstName  = (user?.name || '').split(' ')[0];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.accent]} tintColor={COLORS.accent} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Good {greet}{firstName ? `, ${firstName}` : ''}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 }}>
            <Text style={[styles.shopName, { marginTop: 0, flexShrink: 1 }]} numberOfLines={1}>{shop?.name || 'Your Shop'}</Text>
            <View style={[styles.openPill, { backgroundColor: (shop?.acceptingBookings ? COLORS.success : COLORS.error) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: shop?.acceptingBookings ? COLORS.success : COLORS.error }]} />
              <Text style={[styles.openText, { color: shop?.acceptingBookings ? COLORS.success : COLORS.error }]}>{shop?.acceptingBookings ? 'Open' : 'Closed'}</Text>
            </View>
          </View>
        </View>
      </View>

      {upcomingPending > 0 && (
        <TouchableOpacity style={styles.banner} onPress={() => navigation.navigate('OwnerBookings')} activeOpacity={0.85}>
          <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
          <Text style={styles.bannerText}>{upcomingPending} request{upcomingPending > 1 ? 's' : ''} need your attention</Text>
          <Text style={styles.bannerCta}>Review ›</Text>
        </TouchableOpacity>
      )}

      {nextUp && (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Next up</Text>
          <View style={styles.nextCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(nextUp.userId?.name || 'C').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextTime}>{formatTime12h(nextUp.slotTime)}</Text>
              <Text style={styles.customerName} numberOfLines={1}>{nextUp.userId?.name || 'Customer'}</Text>
              <Text style={styles.serviceName} numberOfLines={1}>
                {nextUp.services?.map(s => s.name).join(' + ') || 'Service'}{nextUp.staffId?.name ? ` · ${nextUp.staffId.name}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.navigate('OwnerBookings')} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>View ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Today · {formatSlotDate(toLocalYMD())}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{live.length}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={[styles.statCard, { borderColor: COLORS.success + '60' }]}>
            <Text style={[styles.statVal, { color: COLORS.success }]}>{confirmed}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={[styles.statCard, { borderColor: COLORS.accent + '60' }]}>
            <Text style={[styles.statVal, { color: COLORS.accent }]} numberOfLines={1} adjustsFontSizeToFit>₹{onlinePaid}</Text>
            <Text style={styles.statLabel}>Online paid</Text>
          </View>
        </View>
      </View>

      {/* Today's Bookings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Bookings</Text>
        {error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No bookings today</Text>
          </View>
        ) : (
          todayList.slice(0, 3).map(b => (
            <View key={b._id} style={styles.bookingRow}>
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{formatTime12h(b.slotTime)}</Text>
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.customerName}>{b.userId?.name || 'Customer'}</Text>
                <Text style={styles.serviceName}>{b.services?.map(s => s.name).join(' + ') || 'Service'} · ₹{b.amount}</Text>
                {b.staffId && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <Ionicons name="person-outline" size={11} color={COLORS.textMuted} />
                    <Text style={styles.staffName}>{b.staffId?.name}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(b.status) + '25' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(b.status) }]}>
                  {(b.status || '').replace('_', ' ')}
                </Text>
              </View>
            </View>
          ))
        )}
        {todayList.length > 3 && (
          <TouchableOpacity style={styles.viewAll} onPress={() => navigation.navigate('OwnerBookings')} activeOpacity={0.85}>
            <Text style={styles.viewAllText}>+{todayList.length - 3} more · View all ›</Text>
          </TouchableOpacity>
        )}
      </View>
      <OwnerSlotGrid shopId={shop?._id} refreshKey={tick} />
    </ScrollView>
  );
};

const getStatusColor = (s) => {
  if (s === 'confirmed') return COLORS.success;
  if (s === 'completed') return COLORS.accent;
  if (s === 'cancelled') return COLORS.error;
  return COLORS.warning;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },

  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  greeting:  { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  shopName:  { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  openPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  openText:  { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  banner:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.error + '12', borderWidth: 1, borderColor: COLORS.error + '50' },
  bannerText: { flex: 1, color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  bannerCta:  { color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  block:      { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  nextCard:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  avatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.lg },
  nextTime:   { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.sizes.lg },
  nextBtn:    { backgroundColor: COLORS.accent, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  nextBtnText:{ color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },

  statsGrid: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.lg },
  statsRow:  { flexDirection: 'row', gap: SPACING.sm },
  statCard:  { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, ...SHADOWS.small },
  statVal:   { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  section:      { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },

  emptyCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  viewAll:     { alignItems: 'center', paddingVertical: SPACING.sm },
  viewAllText: { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.sm },

  bookingRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  timeBox:      { backgroundColor: COLORS.accent + '20', borderRadius: RADIUS.sm, padding: SPACING.sm, minWidth: 76, alignItems: 'center' },
  timeText:     { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.sm },
  bookingInfo:  { flex: 1 },
  customerName: { color: COLORS.textPrimary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  serviceName:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  staffName:    { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  badge:        { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  reviewTitle:   { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md, textAlign: 'center' },
  reviewSubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center', paddingHorizontal: SPACING.xl },
  retryBtn:      { marginTop: SPACING.lg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.accent },
  retryBtnText:  { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.sm },
});

export default OwnerDashboardScreen;