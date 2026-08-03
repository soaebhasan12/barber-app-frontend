import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
    const action = status === 'confirmed' ? 'Confirm' : status === 'completed' ? 'Complete' : 'Cancel';
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

  const ActionBtn = ({ label, color, onPress }) => (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color }]}
      onPress={onPress}
    >
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  const BookingCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.customerName}>{item.userId?.name || 'Customer'}</Text>
          <Text style={styles.customerPhone}>📱 {item.userId?.phone}</Text>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.timeText}>{item.slotTime}</Text>
          <Text style={styles.dateText}>{item.slotDate}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.serviceRow}>
        <Text style={styles.serviceText}>✂️  {item.services?.map(s => s.name).join(' + ') || 'Service'}</Text>
        <Text style={styles.priceText}>₹{item.amount}</Text>
      </View>

      {item.paymentStatus === 'paid' && (
        <View style={styles.paidBadge}>
          <Text style={styles.paidBadgeText}>✓ Paid Online</Text>
        </View>
      )}

      {item.staffId && (
        <Text style={styles.staffText}>👤  {item.staffId?.name}</Text>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {item.status === 'pending' && (
          <>
            <ActionBtn label="✓ Confirm"  color={COLORS.success} onPress={() => updateStatus(item._id, 'confirmed')} />
            <ActionBtn label="✕ Reject"   color={COLORS.error}   onPress={() => updateStatus(item._id, 'cancelled')} />
          </>
        )}
        {item.status === 'confirmed' && (
          <>
            <ActionBtn label="✓ Complete" color={COLORS.accent}  onPress={() => updateStatus(item._id, 'completed')} />
            <ActionBtn label="✕ Cancel"   color={COLORS.error}   onPress={() => updateStatus(item._id, 'cancelled')} />
          </>
        )}
        {(item.status === 'completed' || item.status === 'cancelled') && (
          <Text style={[styles.finalStatus, { color: item.status === 'completed' ? COLORS.accent : COLORS.error }]}>
            {item.status === 'completed' ? '✓ Completed' : '✕ Cancelled'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📅</Text>
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
  title:     { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },

  filterRow:       { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.xs, marginBottom: SPACING.md },
  filterBtn:       { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText:      { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  filterTextActive:{ color: COLORS.white },

  list: { padding: SPACING.lg, paddingBottom: 100 },

  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
  customerPhone:{ color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  timeBox:      { backgroundColor: COLORS.accent + '20', borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  timeText:     { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.md },
  dateText:     { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  divider:      { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  serviceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  priceText:    { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.md },
  staffText:    { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 4 },
  paidBadge:     { alignSelf: 'flex-start', backgroundColor: COLORS.success + '20', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, marginTop: 4 },
  paidBadgeText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  actions:        { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionBtn:      { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center' },
  actionBtnText:  { fontWeight: '700', fontSize: FONTS.sizes.sm },
  finalStatus:    { fontSize: FONTS.sizes.sm, fontWeight: '700', marginTop: SPACING.xs },

  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
});

export default OwnerBookingsScreen;