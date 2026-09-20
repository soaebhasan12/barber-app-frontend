import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { bookingAPI, shopAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const OwnerDashboardScreen = () => {
  const { user } = useAuth();
  const [shop, setShop]         = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);
  const today = new Date().toISOString().split('T')[0];

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
      const bookingRes = await bookingAPI.getShopBookings(shopData._id, today);
      setBookings(bookingRes.data.data);
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

  const pending   = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const completed = bookings.filter(b => b.status === 'completed').length;
  const revenue   = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.amount, 0);

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
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}</Text>
            <Ionicons name="sunny-outline" size={14} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.shopName}>{shop?.name || 'Your Shop'}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: shop?.acceptingBookings ? COLORS.success : COLORS.error }]} />
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: COLORS.warning + '60' }]}>
            <Text style={styles.statVal}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { borderColor: COLORS.success + '60' }]}>
            <Text style={[styles.statVal, { color: COLORS.success }]}>{confirmed}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: COLORS.accent + '60' }]}>
            <Text style={[styles.statVal, { color: COLORS.accent }]}>₹{revenue}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={[styles.statCard, { borderColor: COLORS.categoryMen + '60' }]}>
            <Text style={[styles.statVal, { color: COLORS.categoryMen }]}>{completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
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
          bookings.slice(0, 5).map(b => (
            <View key={b._id} style={styles.bookingRow}>
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{b.slotTime}</Text>
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
                  {b.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
  statusDot: { width: 12, height: 12, borderRadius: 6 },

  statsGrid: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.lg },
  statsRow:  { flexDirection: 'row', gap: SPACING.sm },
  statCard:  { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, ...SHADOWS.small },
  statVal:   { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  section:      { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },

  emptyCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },

  bookingRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  timeBox:      { backgroundColor: COLORS.accent + '20', borderRadius: RADIUS.sm, padding: SPACING.sm, minWidth: 52, alignItems: 'center' },
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