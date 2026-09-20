import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { bookingAPI, shopAPI } from '../../services/api';

const OwnerBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [shopId, setShopId]     = useState(null);
  const [filter, setFilter]     = useState('pending');

  useFocusEffect(
    useCallback(() => {
      fetchShopAndBookings();
    }, [])
  );

  const fetchShopAndBookings = async () => {
    try {
      const shopRes = await shopAPI.getMyShop();
      const id = shopRes.data.data.shop._id;
      setShopId(id);
      const res = await bookingAPI.getShopBookings(id);
      setBookings(res.data.data);
    } catch (err) {
      console.log('error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, status) => {
    const action = status === 'confirmed' ? 'Confirm' : status === 'completed' ? 'Complete' : status === 'no_show' ? 'Mark as No-Show' : 'Cancel';
    
    Alert.alert(`${action} Booking`, `Are you sure?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', onPress: async () => {
          try {
            if (status === 'cancelled') {
              await bookingAPI.cancel(bookingId, 'Cancelled by owner');
            } else {
              await bookingAPI.updateStatus(bookingId, status);
            }
            fetchShopAndBookings();
          } catch (err) {
            Alert.alert('Error', 'Failed to update booking');
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
    const isToday = item.slotDate === new Date().toISOString().split('T')[0];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.userId?.name || 'C').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName} numberOfLines={1}>{item.userId?.name || 'Customer'}</Text>
              <View style={styles.iconTextRow}>
                <Ionicons name="call-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.customerPhone}>{item.userId?.phone}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.timeBox, isToday && styles.timeBoxToday]}>
            {isToday && <Text style={styles.todayTag}>TODAY</Text>}
            <Text style={styles.timeText}>{item.slotTime}</Text>
            <Text style={styles.dateText}>{item.slotDate}</Text>
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
            <TouchableOpacity style={styles.primaryBtn} onPress={() => updateStatus(item._id, 'confirmed')} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>Accept Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineLink} onPress={() => updateStatus(item._id, 'cancelled')}>
              <Text style={styles.declineLinkText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'confirmed' && (
          <View style={styles.actionsWrap}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.success }]} onPress={() => updateStatus(item._id, 'completed')} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>Mark Complete</Text>
            </TouchableOpacity>
            <View style={styles.secondaryRow}>
              <TouchableOpacity style={styles.iconTextRow} onPress={() => updateStatus(item._id, 'no_show')}>
                <Ionicons name="warning-outline" size={13} color={COLORS.warning} />
                <Text style={styles.secondaryLinkWarn}>No-Show</Text>
              </TouchableOpacity>
              <Text style={styles.secondaryDot}>•</Text>
              <TouchableOpacity style={styles.iconTextRow} onPress={() => updateStatus(item._id, 'cancelled')}>
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
        {['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map(f => (
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} />
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
          renderItem={({ item }) => <BookingCard item={item} />}
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
  filterGrid:            { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md, gap: SPACING.sm },
  filterTile:            { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
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

  actions:        { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionBtn:      { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center' },
  actionBtnText:  { fontWeight: '700', fontSize: FONTS.sizes.sm },
  finalStatus:    { fontSize: FONTS.sizes.sm, fontWeight: '700', marginTop: SPACING.xs },

  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
});

export default OwnerBookingsScreen;