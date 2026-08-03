import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { bookingAPI } from '../services/api';
import api from '../services/api';

const BookingScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [reviewModal, setReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const fetchBookings = async () => {
    try {
      const res = await bookingAPI.getMyBookings();
      setBookings(res.data.data);
    } catch (err) {
      console.log('fetchBookings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    setSubmitting(true);
    try {
      await api.post('/reviews/add', {
        bookingId: selectedBooking._id,
        rating,
        comment,
      });
      Alert.alert('Success', 'Review submitted!');
      setReviewModal(false);
      setComment('');
      setRating(5);
      fetchBookings();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
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
            <Text style={styles.infoIcon}>✂️</Text>
            <Text style={styles.infoText}>
              {item.services?.map(s => s.name).join(' + ') || 'Service'}
            </Text>
            <Text style={styles.infoPrice}>₹{item.amount}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{item.slotDate}</Text>
            <Text style={styles.infoText}>⏰ {item.slotTime}</Text>
          </View>

          {item.staffId && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👤</Text>
              <Text style={styles.infoText}>{item.staffId?.name}</Text>
            </View>
          )}

          {item.status === 'completed' && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => { setSelectedBooking(item); setReviewModal(true); }}
            >
              <Text style={styles.reviewBtnText}>⭐ Write Review</Text>
            </TouchableOpacity>
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
          <Text style={styles.emptyEmoji}>📅</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate your experience</Text>
            <Text style={styles.modalShop}>{selectedBooking?.shopId?.name}</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
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
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: COLORS.border }]} onPress={() => setReviewModal(false)}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.accent }]} onPress={submitReview} disabled={submitting}>
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>{submitting ? 'Submitting...' : 'Submit'}</Text>
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
  title:       { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  list:        { padding: SPACING.lg, paddingBottom: 100 },

  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  shopName:    { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white, flex: 1 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:  { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  divider:     { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  infoIcon:    { fontSize: 14 },
  infoText:    { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, flex: 1 },
  infoPrice:   { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.sm },

  emptyEmoji:   { fontSize: 48, marginBottom: SPACING.md },
  emptyText:    { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '600' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4 },

  reviewBtn:     { marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.warning, alignItems: 'center' },
  reviewBtnText: { color: COLORS.warning, fontWeight: '600', fontSize: FONTS.sizes.sm },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  modalTitle:    { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: 4 },
  modalShop:     { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.lg },
  starsRow:      { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  star:          { fontSize: 36 },
  commentInput:  { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg, minHeight: 80, textAlignVertical: 'top' },
  modalBtns:     { flexDirection: 'row', gap: SPACING.sm },
  modalBtn:      { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center' },
});

export default BookingScreen;