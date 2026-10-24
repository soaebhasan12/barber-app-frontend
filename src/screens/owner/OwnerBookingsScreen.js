import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { bookingAPI, shopAPI, getApiError } from '../../services/api';
import { formatTime12h, formatSlotDate, toLocalYMD } from '../../utils/time';

const OwnerBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [shopId, setShopId]     = useState(null);
  const [filter, setFilter]     = useState('pending');
  const [error, setError]       = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchShopAndBookings();
    }, [])
  );

  const fetchShopAndBookings = async () => {
    setError(null);
    try {
      const shopRes = await shopAPI.getMyShop();
      const id = shopRes.data.data.shop._id;
      setShopId(id);
      const res = await bookingAPI.getShopBookings(id);
      setBookings(res.data.data);
    } catch (err) {
      console.log('error:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (bookingId, status) => {
    const b = bookings.find(x => x._id === bookingId);
    const action = status === 'confirmed' ? 'Confirm' : status === 'completed' ? 'Complete' : status === 'no_show' ? 'Mark as No-Show' : 'Cancel';
    let msg = 'Are you sure?';
    if (status === 'no_show') msg = 'The customer will be marked as a no-show. After 2 no-shows, Pay at Shop is disabled for them.';
    if (status === 'cancelled' && b?.paymentStatus === 'paid') msg = 'This booking is paid. The customer will get a full automatic refund.';

    Alert.alert(`${action} Booking`, msg, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', onPress: async () => {
          setUpdatingId(bookingId);
          try {
            if (status === 'cancelled') {
              const res = await bookingAPI.cancel(bookingId, 'Cancelled by owner');
              if (res.data?.data?.refund === 'failed') {
                Alert.alert('Refund pending', 'The automatic refund failed. Please refund this payment manually from the Razorpay dashboard.');
              }
            } else {
              await bookingAPI.updateStatus(bookingId, status);
            }
            await fetchShopAndBookings();
          } catch (err) {
            console.log('updateStatus error:', err);
            const e = getApiError(err, 'Failed to update booking');
            Alert.alert('Error', e.message);
            if (e.status === 409 || e.status === 400) fetchShopAndBookings(); // booking pehle hi badal chuki hai
          } finally {
            setUpdatingId(null);
          }
        }
      }
    ]);
  };

  const filtered = bookings.filter(b => b.status === filter);

  const counts = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].reduce((acc, f) => {
    acc[f] = bookings.filter(b => b.status === f).length;
    return acc;
  }, {});

  const BookingCard = ({ item }) => {
    const isToday = item.slotDate === toLocalYMD();
    const [sy, sm, sd] = (item.slotDate || '').split('-').map(Number);
    const [sh, smin] = (item.slotTime || '').split(':').map(Number);
    const slotStartMs = new Date(sy, sm - 1, sd, sh, smin).getTime();
    const graceEndMs = item.graceEndsAt ? new Date(item.graceEndsAt).getTime() : slotStartMs + 15 * 60000;
    const graceOver = now >= graceEndMs;
    const awaitingArrival = item.status === 'confirmed' && now >= slotStartMs && !graceOver;
    const graceMinsLeft = Math.max(1, Math.ceil((graceEndMs - now) / 60000));
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.userId?.name || 'C').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.iconTextRow}>
                <Text style={[styles.customerName, { flexShrink: 1 }]} numberOfLines={1}>{item.userId?.name || 'Customer'}</Text>
                {item.userId?.noShowCount > 0 && (
                  <View style={styles.noShowBadge}>
                    <Text style={styles.noShowBadgeText}>{item.userId.noShowCount} no-show{item.userId.noShowCount > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
              <View style={styles.iconTextRow}>
                <Ionicons name="call-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.customerPhone}>{item.userId?.phone}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.timeBox, isToday && styles.timeBoxToday]}>
            {isToday && <Text style={styles.todayTag}>TODAY</Text>}
            <Text style={styles.timeText}>{formatTime12h(item.slotTime)}</Text>
            <Text style={styles.dateText}>{formatSlotDate(item.slotDate)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.serviceRow}>
          <View style={[styles.iconTextRow, { flex: 1 }]}>
            <Ionicons name="cut-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.serviceText} numberOfLines={1}>
              {item.services?.map(s => s.name).join(' + ') || 'Service'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {item.paymentStatus === 'paid' && (
              <View style={styles.paidBadge}>
                <Ionicons name="checkmark" size={11} color={COLORS.success} />
                <Text style={styles.paidBadgeText}>Paid</Text>
              </View>
            )}
            <Text style={styles.priceText}>₹{item.amount}</Text>
          </View>
        </View>

        {item.staffId && (
          <View style={styles.iconTextRow}>
            <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.staffText}>{item.staffId?.name}</Text>
          </View>
        )}

        {item.status === 'pending' && (
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              style={[styles.primaryBtn, updatingId === item._id && styles.btnDisabled]}
              onPress={() => updateStatus(item._id, 'confirmed')}
              activeOpacity={0.85}
              disabled={updatingId === item._id}
            >
              {updatingId === item._id
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                    <Text style={styles.primaryBtnText}>Accept Booking</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineLink} onPress={() => updateStatus(item._id, 'cancelled')} disabled={updatingId === item._id}>
              <Text style={styles.declineLinkText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'confirmed' && (
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: COLORS.success }, updatingId === item._id && styles.btnDisabled]}
              onPress={() => updateStatus(item._id, 'completed')}
              activeOpacity={0.85}
              disabled={updatingId === item._id}
            >
              {updatingId === item._id
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                    <Text style={styles.primaryBtnText}>Mark Complete</Text>
                  </>
              }
            </TouchableOpacity>

            {now >= slotStartMs && (
              <Text style={styles.awaitingText}>
                {awaitingArrival ? `Awaiting arrival · No-Show available in ${graceMinsLeft} min` : 'Grace period over · you can mark No-Show'}
              </Text>
            )}

            <View style={styles.secondaryRow}>
              <TouchableOpacity style={[styles.iconTextRow, !graceOver && styles.btnDisabled]} onPress={() => updateStatus(item._id, 'no_show')} disabled={updatingId === item._id || !graceOver}>
                <Ionicons name="warning-outline" size={13} color={COLORS.warning} />
                <Text style={styles.secondaryLinkWarn}>No-Show</Text>
              </TouchableOpacity>
              <Text style={styles.secondaryDot}>•</Text>
              <TouchableOpacity style={styles.iconTextRow} onPress={() => updateStatus(item._id, 'cancelled')} disabled={updatingId === item._id}>
                <Ionicons name="close-circle-outline" size={13} color={COLORS.error} />
                <Text style={styles.secondaryLinkError}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(item.status === 'completed' || item.status === 'cancelled' || item.status === 'no_show') && (
          <View style={styles.iconTextRow}>
            <Ionicons
              name={item.status === 'completed' ? 'checkmark-circle' : item.status === 'no_show' ? 'warning' : 'close-circle'}
              size={14}
              color={item.status === 'completed' ? COLORS.success : item.status === 'no_show' ? COLORS.warning : COLORS.error}
            />
            <Text style={[styles.finalStatus, { color: item.status === 'completed' ? COLORS.success : item.status === 'no_show' ? COLORS.warning : COLORS.error }]}>
              {item.status === 'completed' ? 'Completed' : item.status === 'no_show' ? 'No-Show' : 'Cancelled'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterGrid}>
        {[['pending', 'confirmed'], ['completed', 'cancelled'], ['no_show']].map((row, i) => (
          <View style={styles.filterRow} key={i}>
            {row.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTile, filter === f && styles.filterTileActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterTileText, filter === f && styles.filterTileTextActive]}>
                  {f === 'no_show' ? 'No-Show' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
                {counts[f] > 0 && (
                  <View style={[styles.filterTileCount, filter === f && styles.filterTileCountActive]}>
                    <Text style={[styles.filterTileCountText, filter === f && styles.filterTileCountTextActive]}>{counts[f]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchShopAndBookings} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No {filter} bookings</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => BookingCard({ item })}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  title:     { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.textPrimary },
  filterGrid:            { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  filterRow:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  filterTile:            { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  filterTileActive:      { backgroundColor: COLORS.accent + '20', borderColor: COLORS.accent },
  filterTileText:        { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600',  },
  filterTileTextActive:  { color: COLORS.accent },
  filterTileCount:       { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterTileCountActive: { backgroundColor: COLORS.accent },
  filterTileCountText:       { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  filterTileCountTextActive: { color: COLORS.white },

  list: { padding: SPACING.lg, paddingBottom: 100 },

  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1, marginRight: SPACING.sm },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent + '25', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.md },

  timeBoxToday: { borderWidth: 1, borderColor: COLORS.accent },
  todayTag:     { color: COLORS.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 1 },

  customerName: { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.sizes.md },  customerPhone:{ color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  timeBox:      { backgroundColor: COLORS.accent + '20', borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  timeText:     { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.md },
  dateText:     { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  divider:      { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  serviceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  priceText:    { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.md },
  staffText:    { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 4 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.success + '20', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.success + '40' },
  paidBadgeText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  actionsWrap:  { marginTop: SPACING.sm, gap: SPACING.xs },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.sm },
  primaryBtnText:{ color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
  declineLink:      { alignItems: 'center', paddingVertical: 4 },
  declineLinkText:  { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  secondaryRow:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  secondaryLinkWarn:  { color: COLORS.warning, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  secondaryLinkError: { color: COLORS.error, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  secondaryDot:       { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },

  finalStatus:    { fontSize: FONTS.sizes.sm, fontWeight: '700', marginTop: SPACING.xs },

  emptyText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  retryBtn:      { marginTop: SPACING.lg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.accent },
  retryBtnText:  { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.sm },
  btnDisabled:   { opacity: 0.5 },

  noShowBadge:     { backgroundColor: COLORS.warning + '25', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1 },
  noShowBadgeText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '700' },
  awaitingText:    { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, textAlign: 'center', marginTop: 2 },
});

export default OwnerBookingsScreen;