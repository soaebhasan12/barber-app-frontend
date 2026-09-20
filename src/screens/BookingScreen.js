import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { bookingAPI, reviewAPI } from '../services/api';

const MAX_COMMENT_LENGTH = 500;

const BookingScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [reviewModal, setReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const fetchBookings = async () => {
    try {
      const res = await bookingAPI.getMyBookings();
      const data = res.data.data;
      setBookings(data);
      // Backend se aaye isReviewed flag se local state initialize karo
      const reviewed = data.filter(b => b.isReviewed).map(b => b._id);
      setReviewedIds(new Set(reviewed));
    } catch (err) {
      console.log('fetchBookings error:', err);
    } finally {
      setLoading(false);
    }
  };


  const submitReview = async () => {
    setSubmitting(true);
    try {
      await reviewAPI.add({
        bookingId: selectedBooking._id,
        rating,
        comment,
      });
      setReviewedIds(prev => new Set(prev).add(selectedBooking._id)); // 👈 naya
      Alert.alert('Success', 'Review submitted!');
      setReviewModal(false);
      setComment('');
      setRating(5);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit review';
      if (msg.toLowerCase().includes('already reviewed')) {
        setReviewedIds(prev => new Set(prev).add(selectedBooking._id)); // 👈 naya
        setReviewModal(false);
      }
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getDates = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().split('T')[0], day: days[d.getDay()], num: d.getDate() };
    });
  };

  const openReschedule = (booking) => {
    setRescheduleBooking(booking);
    const today = new Date().toISOString().split('T')[0];
    setNewDate(today);
    setNewSlot(null);
    setRescheduleModal(true);
  };

  const fetchSlotsForReschedule = async (date) => {
    setSlotsLoading(true);
    try {
      const res = await bookingAPI.getSlots(rescheduleBooking.shopId._id, date, rescheduleBooking.staffId?._id);
      setSlots(res.data.data);
    } catch (err) {
      console.log('fetchSlots error:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (rescheduleModal && newDate) fetchSlotsForReschedule(newDate);
  }, [rescheduleModal, newDate]);

  const confirmReschedule = async () => {
    if (!newSlot) return;
    setRescheduling(true);
    try {
      await bookingAPI.reschedule(rescheduleBooking._id, newDate, newSlot);
      Alert.alert('Success', 'Booking rescheduled! Waiting for owner confirmation.');
      setRescheduleModal(false);
      fetchBookings();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancel = (booking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your booking at ${booking.shopId?.name || 'this shop'}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingAPI.cancel(booking._id, 'Cancelled by customer');
              setBookings(prev => prev.map(b =>
                b._id === booking._id ? { ...b, status: 'cancelled' } : b
              ));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    if (status === 'confirmed')  return COLORS.success;
    if (status === 'cancelled')  return COLORS.error;
    if (status === 'completed')  return COLORS.accent;
    return COLORS.warning;
  };

  const BookingCard = ({ item }) => {
    return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.shopName}>{item.shopId?.name || 'Shop'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '25' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="cut-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              {item.services?.map(s => s.name).join(' + ') || 'Service'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.paymentStatus === 'paid' && (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>✓ Paid</Text>
                </View>
              )}
              <Text style={styles.infoPrice}>₹{item.amount}</Text>
            </View>
          </View>

          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            gap: 12,
            marginTop: 8
          }}>
            
            {/* Date Container */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.sizes.sm }} numberOfLines={1}>
                {item.slotDate ? item.slotDate : 'N/A'}
              </Text>
            </View>

            {/* Time Container */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.sizes.sm }} numberOfLines={1}>
                {item.slotTime ? item.slotTime : 'N/A'}
              </Text>
            </View>
          </View>

          {item.staffId && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{item.staffId?.name}</Text>
            </View>
          )}

          {(item.status === 'pending' || item.status === 'confirmed') && (
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleCancel(item)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rescheduleBtn, { flex: 1 }]} onPress={() => openReschedule(item)}>
                <Text style={styles.rescheduleBtnText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'completed' && (
            reviewedIds.has(item._id) ? (
              <View style={[styles.reviewBtn, { borderColor: COLORS.success }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark" size={14} color={COLORS.success} />
                  <Text style={[styles.reviewBtnText, { color: COLORS.success }]}>Reviewed</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => { setSelectedBooking(item); setReviewModal(true); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star-outline" size={14} color={COLORS.warning} />
                  <Text style={styles.reviewBtnText}>Write Review</Text>
                </View>
              </TouchableOpacity>
            )
          )}
        </View>
      );
    };


  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No bookings yet</Text>
          <Text style={styles.emptySubtext}>Book a service to get started</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <BookingCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={reviewModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate your experience</Text>
            <Text style={styles.modalShop}>{selectedBooking?.shopId?.name}</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  accessibilityState={{ selected: star === rating }}
                >
                  <Text style={[styles.star, { color: star <= rating ? COLORS.warning : COLORS.border }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience..."
              placeholderTextColor={COLORS.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              maxLength={MAX_COMMENT_LENGTH}
              accessibilityLabel="Review comment"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: COLORS.border }]} onPress={() => setReviewModal(false)} disabled={submitting}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.accent }]} onPress={submitReview} disabled={submitting}>
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>{submitting ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={rescheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule Booking</Text>
            <Text style={styles.modalShop}>{rescheduleBooking?.shopId?.name}</Text>

            <Text style={styles.sectionLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {getDates().map(({ date, day, num }) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateCard, newDate === date && styles.dateCardActive]}
                  onPress={() => { setNewDate(date); setNewSlot(null); }}
                >
                  <Text style={[styles.dateDay, newDate === date && styles.dateDayActive]}>{day}</Text>
                  <Text style={[styles.dateNum, newDate === date && styles.dateNumActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Select Time</Text>
            {slotsLoading ? (
              <ActivityIndicator color={COLORS.accent} style={{ marginVertical: SPACING.lg }} />
            ) : slots.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, marginBottom: SPACING.lg }}>No slots available on this day</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map(slot => (
                  <TouchableOpacity
                    key={slot.time}
                    style={[styles.slotChip, !slot.available && styles.slotChipTaken, newSlot === slot.time && styles.slotChipSelected]}
                    onPress={() => slot.available && setNewSlot(slot.time)}
                    disabled={!slot.available}
                  >
                    <Text style={[styles.slotText, newSlot === slot.time && styles.slotTextSelected]}>{slot.time}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.modalBtns, { marginTop: SPACING.lg }]}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: COLORS.border }]} onPress={() => setRescheduleModal(false)} disabled={rescheduling}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.accent }]} onPress={confirmReschedule} disabled={!newSlot || rescheduling}>
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>{rescheduling ? 'Saving...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  title:       { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.textPrimary },
  list:        { padding: SPACING.lg, paddingBottom: 100 },

  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.small },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  shopName:    { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:  { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  divider:     { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  infoIcon:    { fontSize: 14 },
  infoText:    { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, flex: 1 },
  infoPrice:   { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.sm },
  paidBadge:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success + '20', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.success + '40' },
  paidBadgeText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  emptyEmoji:   { fontSize: 48, marginBottom: SPACING.md },
  emptyText:    { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '600' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4 },

  reviewBtn:     { marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.warning, alignItems: 'center' },
  reviewBtnText: { color: COLORS.warning, fontWeight: '600', fontSize: FONTS.sizes.sm },
  cancelBtn:     { marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.error, alignItems: 'center' },
  cancelBtnText: { color: COLORS.error, fontWeight: '600', fontSize: FONTS.sizes.sm },

  rescheduleBtn:     { padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center' },
  rescheduleBtnText: { color: COLORS.accent, fontWeight: '600', fontSize: FONTS.sizes.sm },
  sectionLabel:      { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600', marginBottom: SPACING.sm },
  dateCard:          { width: 54, height: 64, borderRadius: RADIUS.md, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  dateCardActive:    { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dateDay:           { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  dateDayActive:     { color: COLORS.white },
  dateNum:           { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700', marginTop: 2 },
  dateNumActive:     { color: COLORS.white },
  slotsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  slotChip:          { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  slotChipTaken:     { opacity: 0.3 },
  slotChipSelected:  { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  slotText:          { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  slotTextSelected:  { color: COLORS.white, fontWeight: '700' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  modalTitle:    { color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: 4 },
  modalShop:     { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.lg },
  starsRow:      { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  star:          { fontSize: 36 },
  commentInput:  { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg, minHeight: 80, textAlignVertical: 'top' },
  modalBtns:     { flexDirection: 'row', gap: SPACING.sm },
  modalBtn:      { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center' },
});

export default BookingScreen;