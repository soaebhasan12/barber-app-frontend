import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { bookingAPI, reviewAPI, getApiError } from '../services/api';
import { formatTime12h, formatSlotDate, toLocalYMD } from '../utils/time';
import { startPayment } from '../services/payment';
import { useAuth } from '../context/AuthContext';

const MAX_COMMENT_LENGTH = 500;

const formatCountdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Alag component isliye ki BookingCard plain function hai, usme hooks nahi chalte
const PayCountdown = ({ deadline, onExpire }) => {
  const [left, setLeft] = useState(() => new Date(deadline).getTime() - Date.now());
  useEffect(() => {
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) { clearInterval(id); onExpire?.(); }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [deadline]);
  return <Text style={styles.countdownText}>Pay within {formatCountdown(left)}</Text>;
};

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
  const [fetchError, setFetchError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const slotReqRef = useRef(0);
  const { user } = useAuth();
  const [payingId, setPayingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const fetchBookings = async () => {
    try {
      setFetchError(null);
      const res = await bookingAPI.getMyBookings();
      const data = res.data.data || [];
      setBookings(data);
      const reviewed = data.filter(b => b.isReviewed).map(b => b._id);
      setReviewedIds(new Set(reviewed));
    } catch (err) {
      console.log('fetchBookings error:', err);
      setFetchError(getApiError(err, 'Could not load your bookings.').message);
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
      return { date: toLocalYMD(d), day: days[d.getDay()], num: d.getDate() };
    });
  };

  const openReschedule = (booking) => {
    setRescheduleBooking(booking);
    const today = toLocalYMD();
    setNewDate(today);
    setNewSlot(null);
    setRescheduleModal(true);
  };

  const fetchSlotsForReschedule = async (date) => {
    const reqId = ++slotReqRef.current; // sirf sabse naye request ka jawab dikhao
    setSlotsLoading(true);
    try {
      const res = await bookingAPI.getSlots(rescheduleBooking.shopId._id, date, rescheduleBooking.staffId?._id);
      if (reqId !== slotReqRef.current) return;
      setSlots(res.data.data || []);
    } catch (err) {
      if (reqId !== slotReqRef.current) return;
      console.log('fetchSlots error:', err);
      setSlots([]);
      Alert.alert('Error', getApiError(err, 'Could not load slots.').message);
    } finally {
      if (reqId === slotReqRef.current) setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (rescheduleModal && newDate) fetchSlotsForReschedule(newDate);
  }, [rescheduleModal, newDate]);

  const confirmReschedule = async (extra = {}) => {
    if (!newSlot) return;
    setRescheduling(true);
    try {
      await bookingAPI.reschedule(rescheduleBooking._id, newDate, newSlot, extra);
      Alert.alert('Success', 'Booking rescheduled! Waiting for owner confirmation.');
      setRescheduleModal(false);
      fetchBookings();
    } catch (err) {
      console.log('reschedule error:', err);
      const e = getApiError(err, 'Failed to reschedule');
      if (e.code === 'PAYMENT_REQUIRED') {
        Alert.alert('Payment required', 'Future-dated bookings need online payment. Please cancel this booking and book again with payment.');
      } else if (e.status === 409 && e.code === 'SLOT_HELD') {
        const n = e.data?.holdCount ?? e.data?.data?.holdCount;
        const who = n ? `${n} customer${n > 1 ? 's' : ''} already hold` : 'Other customers already hold';
        Alert.alert('Slot already held', `${who} this slot without paying. If one of them pays first, you could lose it.`, [
          { text: 'Pick another slot', style: 'cancel', onPress: () => { setNewSlot(null); fetchSlotsForReschedule(newDate); } },
          { text: 'Book anyway', onPress: () => confirmReschedule({ confirmHold: true }) },
        ]);
      } else if (e.status === 409 && e.code === 'HOLDS_FULL') {
        Alert.alert('Slot is full', 'All waiting spots for this slot are taken. Please pick another slot.');
        setNewSlot(null);
        fetchSlotsForReschedule(newDate);
      } else if (e.status === 409) {
        Alert.alert('Slot not available', e.message || 'This slot was just taken. Please pick another.');
        setNewSlot(null);
        fetchSlotsForReschedule(newDate);
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      setRescheduling(false);
    }
  };

  // Sirf message ke liye (device clock). Asli refund ka faisla server karta hai.
  const getCancelNote = (booking) => {
    if (booking.paymentStatus !== 'paid') return '';
    const [y, m, d] = (booking.slotDate || '').split('-').map(Number);
    const [hh, mm] = (booking.slotTime || '').split(':').map(Number);
    if ([y, m, d, hh, mm].some(v => !Number.isFinite(v))) {
      return '\n\nRefund policy: full refund if cancelled 2+ hours before the slot, no refund after that.';
    }
    const hoursLeft = (new Date(y, m - 1, d, hh, mm).getTime() - Date.now()) / 3600000;
    return hoursLeft >= 2
      ? '\n\nYou will get a full refund.'
      : '\n\nLess than 2 hours left: this cancellation is not eligible for a refund.';
  };

  const handleCancel = (booking) => {
    if (cancellingId) return;
    Alert.alert(
      'Cancel Booking',
      `Cancel your booking at ${booking.shopId?.name || 'this shop'}?${getCancelNote(booking)}`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(booking._id);
            try {
              const res = await bookingAPI.cancel(booking._id, 'Cancelled by customer');
              const refund = res.data?.data?.refund ?? res.data?.refund;
              const refundMsg = {
                processed: 'Your refund has been initiated. It usually reaches your account in 5-7 working days.',
                failed: 'The automatic refund could not be processed. Please contact support with your booking details.',
                not_eligible: 'It was less than 2 hours before the slot, so this booking is not eligible for a refund.',
              }[refund];
              Alert.alert('Booking cancelled', refundMsg || 'Your booking has been cancelled.');
              fetchBookings();
            } catch (err) {
              console.log('cancel error:', err);
              const e = getApiError(err, 'Failed to cancel booking');
              Alert.alert('Error', e.message);
              if (e.status === 409) fetchBookings(); // booking pehle hi badal chuki hai
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const isAwaitingPayment = (b) =>
    (b.status === 'pending' || b.status === 'confirmed') &&
    b.paymentStatus !== 'paid' &&
    !!b.paymentDeadline &&
    new Date(b.paymentDeadline).getTime() > Date.now();

  const handlePayNow = async (booking) => {
    if (payingId) return;
    setPayingId(booking._id);
    try {
      const result = await startPayment({
        booking,
        order: null, // helper khud /payments/create-order call karta hai
        shopName: booking.shopId?.name,
        description: (booking.services || []).map(s => s.name).join(' + '),
        user,
      });
      if (result.status === 'busy') return;
      if (result.status === 'paid') {
        Alert.alert('Payment successful', 'Your booking is confirmed.');
      } else if (result.status === 'verify_pending') {
        Alert.alert('Payment received', result.message);
      } else if (result.status === 'cancelled') {
        Alert.alert('Payment not completed', result.message);
      } else {
        Alert.alert(['expired', 'slot_taken'].includes(result.status) ? 'Slot not secured' : 'Payment failed', result.message);
      }
      fetchBookings();
    } catch (err) {
      console.log('handlePayNow error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'confirmed')  return COLORS.success;
    if (status === 'cancelled' || status === 'no_show') return COLORS.error;
    if (status === 'completed')  return COLORS.accent;
    return COLORS.warning;
  };

  const BookingCard = ({ item }) => {
    const awaiting = isAwaitingPayment(item);
    return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.shopName}>{item.shopId?.name || 'Shop'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '25' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {awaiting ? 'AWAITING PAYMENT' : (item.status || '').replace('_', ' ').toUpperCase()}
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
                {item.slotDate ? formatSlotDate(item.slotDate) : 'N/A'}
              </Text>
            </View>

            {/* Time Container */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.sizes.sm }} numberOfLines={1}>
                {item.slotTime ? formatTime12h(item.slotTime) : 'N/A'}
              </Text>
            </View>
          </View>

          {item.staffId && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{item.staffId?.name}</Text>
            </View>
          )}

          {awaiting && (
            <View style={styles.payBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.payBoxTitle}>Payment pending</Text>
                <PayCountdown deadline={item.paymentDeadline} onExpire={fetchBookings} />
              </View>
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => handlePayNow(item)}
                disabled={payingId === item._id}
                accessibilityRole="button"
              >
                <Text style={styles.payBtnText}>{payingId === item._id ? 'Opening...' : `Pay ₹${item.amount}`}</Text>
              </TouchableOpacity>
            </View>
          )}

          {(item.status === 'pending' || item.status === 'confirmed') && (
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1, marginTop: 0 }]} onPress={() => handleCancel(item)} disabled={cancellingId === item._id}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              {!awaiting && (
                <TouchableOpacity style={[styles.rescheduleBtn, { flex: 1 }]} onPress={() => openReschedule(item)}>
                  <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                </TouchableOpacity>
              )}
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

      {fetchError && bookings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Couldn't load bookings</Text>
          <Text style={styles.emptySubtext}>{fetchError}</Text>
          <TouchableOpacity
            style={[styles.rescheduleBtn, { marginTop: SPACING.md, paddingHorizontal: SPACING.lg }]}
            onPress={() => { setLoading(true); fetchBookings(); }}
          >
            <Text style={styles.rescheduleBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No bookings yet</Text>
          <Text style={styles.emptySubtext}>Book a service to get started</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item._id}
          renderItem={({ item }) => BookingCard({ item })}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={reviewModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                    <Text style={[styles.slotText, newSlot === slot.time && styles.slotTextSelected]}>{formatTime12h(slot.time)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.modalBtns, { marginTop: SPACING.lg }]}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: COLORS.border }]} onPress={() => setRescheduleModal(false)} disabled={rescheduling}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.accent }]} onPress={() => confirmReschedule()} disabled={!newSlot || rescheduling}>
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

  payBox:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.warning + '18', borderWidth: 1, borderColor: COLORS.warning + '40' },
  payBoxTitle:   { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.sizes.sm },
  countdownText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },
  payBtn:        { backgroundColor: COLORS.accent, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  payBtnText:    { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },

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