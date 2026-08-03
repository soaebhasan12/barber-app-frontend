import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { serviceAPI, bookingAPI, staffAPI, paymentAPI } from '../services/api';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

const ShopDetailScreen = ({ route, navigation }) => {
  const { shop } = route.params;
  const { user } = useAuth();
  const [services, setServices]         = useState([]);
  const [staff, setStaff]               = useState([]);
  const [slots, setSlots]               = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedStaff, setSelectedStaff]     = useState(null);
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]           = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking]           = useState(false);
  const [tab, setTab]                   = useState('services');

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { fetchSlots(); }, [selectedDate, selectedStaff]);

  const fetchInitialData = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        serviceAPI.getByShop(shop._id),
        staffAPI.getByShop(shop._id),
      ]);
      setServices(servicesRes.data.data);
      setStaff(staffRes.data.data);
    } catch (err) {
      console.log('fetchInitialData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    setSlotsLoading(true);
    try {
      const res = await bookingAPI.getSlots(shop._id, selectedDate, selectedStaff?._id);
      setSlots(res.data.data);
    } catch (err) {
      console.log('fetchSlots error:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const toggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s._id === service._id);
      if (exists) return prev.filter(s => s._id !== service._id);
      return [...prev, service];
    });
  };

  const totalPrice    = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);

  const handleBooking = async () => {
    if (selectedServices.length === 0 || !selectedSlot) return;
    setBooking(true);
    try {
      const res = await bookingAPI.create({
        shopId:   shop._id,
        services: selectedServices.map(s => s._id),
        staffId:  selectedStaff?._id || null,
        slotDate: selectedDate,
        slotTime: selectedSlot,
      });
      const newBooking = res.data.data;

      Alert.alert(
        'Booking Confirmed! ✅',
        'How would you like to pay?',
        [
          { text: 'Pay at Shop', onPress: () => navigation.goBack() },
          { text: 'Pay Online', onPress: () => handlePayOnline(newBooking) },
        ]
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const handlePayOnline = async (newBooking) => {
    try {
      const orderRes = await paymentAPI.createOrder(newBooking._id);
      const { orderId, amount, keyId } = orderRes.data.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: 'INR',
        name: shop.name,
        description: selectedServices.map(s => s.name).join(' + '),
        order_id: orderId,
        prefill: { name: user?.name, contact: user?.phone },
        theme: { color: COLORS.accent },
      };

      const paymentData = await RazorpayCheckout.open(options);

      await paymentAPI.verify({
        bookingId: newBooking._id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      Alert.alert('Success', 'Payment successful! ✅');
      navigation.goBack();
    } catch (err) {
      if (err.code === 'PAYMENT_CANCELLED' || err.description) {
        Alert.alert('Payment Cancelled', 'You can pay at the shop instead. Your booking is still confirmed.');
      } else {
        Alert.alert('Error', 'Payment failed. You can pay at the shop instead.');
      }
      navigation.goBack();
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

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={COLORS.accent} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Shop Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>
            {shop.category === 'men' ? '💈' : shop.category === 'women' ? '💅' : '✂️'}
          </Text>
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerName}>{shop.name}</Text>
            <Text style={styles.bannerAddress}>📍 {shop.address}</Text>
            <View style={styles.bannerMeta}>
              <Text style={styles.metaText}>⭐ {shop.rating > 0 ? shop.rating : 'New'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{shop.totalReviews} reviews</Text>
              <Text style={styles.metaDot}>•</Text>
              <View style={[styles.statusDot, { backgroundColor: shop.acceptingBookings ? COLORS.success : COLORS.error }]} />
              <Text style={[styles.metaText, { color: shop.acceptingBookings ? COLORS.success : COLORS.error }]}>
                {shop.acceptingBookings ? 'Available' : 'Busy'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Switch */}
        <View style={styles.tabRow}>
          {['services', 'slots'].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'services' ? '✂️  Services' : '📅  Book Slot'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SERVICES TAB ── */}
        {tab === 'services' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Choose a Service</Text>
            {services.map(service => (
              <TouchableOpacity
                key={service._id}
                style={[styles.serviceCard, selectedServices.find(s => s._id === service._id) && styles.serviceCardActive]}
                onPress={() => toggleService(service)}
                activeOpacity={0.85}
              >
                <View style={styles.serviceLeft}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDuration}>⏱  {service.durationMin} mins</Text>
                  {service.description && <Text style={styles.serviceDesc}>{service.description}</Text>}
                </View>
                <View style={styles.serviceRight}>
                  <Text style={styles.servicePrice}>₹{service.price}</Text>
                  <View style={[styles.selectBtn, selectedServices.find(s => s._id === service._id) && styles.selectBtnActive]}>
                    <Text style={styles.selectBtnText}>{selectedServices.find(s => s._id === service._id) ? '✓' : 'Select'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Staff Section */}
            {staff.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>Choose Staff (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {/* Any Staff option */}
                  <TouchableOpacity
                    style={[styles.staffCard, !selectedStaff && styles.staffCardActive]}
                    onPress={() => setSelectedStaff(null)}
                  >
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffAvatarText}>🎲</Text>
                    </View>
                    <Text style={[styles.staffName, !selectedStaff && styles.staffNameActive]}>Any</Text>
                    <Text style={styles.staffSpec}>Available</Text>
                  </TouchableOpacity>

                  {staff.map(s => (
                    <TouchableOpacity
                      key={s._id}
                      style={[styles.staffCard, selectedStaff?._id === s._id && styles.staffCardActive]}
                      onPress={() => setSelectedStaff(s)}
                    >
                      <View style={[styles.staffAvatar, selectedStaff?._id === s._id && styles.staffAvatarActive]}>
                        <Text style={styles.staffAvatarText}>
                          {s.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.staffName, selectedStaff?._id === s._id && styles.staffNameActive]}>
                        {s.name}
                      </Text>
                      <Text style={styles.staffSpec} numberOfLines={1}>
                        {s.speciality?.slice(0, 2).join(', ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}

        {selectedServices.length > 0 && (
          <TouchableOpacity
            style={styles.selectedServiceBar}
            onPress={() => setTab('slots')}
          >
            <View>
              <Text style={styles.selectedServiceText}>
                {selectedServices.map(s => s.name).join(' + ')}
              </Text>
              <Text style={[styles.selectedServicePrice, { fontSize: 11, marginTop: 2 }]}>
                ⏱ {totalDuration} mins
              </Text>
            </View>
            <Text style={styles.selectedServicePrice}>₹{totalPrice} →</Text>
          </TouchableOpacity>
        )}        

        {/* ── SLOTS TAB ── */}
        {tab === 'slots' && (
          <View style={styles.section}>

            {/* {selectedServices.length > 0 && (
              <View style={styles.selectedServiceBar}>
                <Text style={styles.selectedServiceText}>
                  ✂️  {selectedServices.map(s => s.name).join(' + ')}
                </Text>
                <Text style={styles.selectedServicePrice}>₹{totalPrice}</Text>
              </View>
            )} */}

            {selectedStaff && (
              <View style={[styles.selectedServiceBar, { marginTop: 6 }]}>
                <Text style={styles.selectedServiceText}>👤  {selectedStaff.name}</Text>
                <Text style={styles.selectedServicePrice}>{selectedStaff.speciality?.join(', ')}</Text>
              </View>
            )}

            {/* Date Picker */}
            <Text style={styles.sectionLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {getDates().map(({ date, day, num }) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateCard, selectedDate === date && styles.dateCardActive]}
                  onPress={() => { setSelectedDate(date); setSelectedSlot(null); }}
                >
                  <Text style={[styles.dateDay, selectedDate === date && styles.dateDayActive]}>{day}</Text>
                  <Text style={[styles.dateNum, selectedDate === date && styles.dateNumActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Time Slots */}
            <Text style={styles.sectionLabel}>Select Time</Text>
            {!selectedServices ? (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>← Please select a service first</Text>
              </View>
            ) : slotsLoading ? (
              <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.lg }} />
            ) : slots.length === 0 ? (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>Shop is closed on this day</Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map(slot => (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.slotChip,
                      !slot.available && styles.slotChipTaken,
                      selectedSlot === slot.time && styles.slotChipSelected,
                    ]}
                    onPress={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.slotText,
                      !slot.available && styles.slotTextTaken,
                      selectedSlot === slot.time && styles.slotTextSelected,
                    ]}>
                      {slot.time}
                    </Text>
                    {!slot.available && <Text style={styles.slotBooked}>Booked</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Bottom Book Button */}
      {selectedServices.length > 0 && selectedSlot && (
        <View style={styles.bottomBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomService}>{selectedServices.map(s => s.name).join(' + ')}</Text>
            <Text style={styles.bottomSlot}>
              📅 {selectedDate}  ·  ⏰ {selectedSlot}
              {selectedStaff ? `  ·  👤 ${selectedStaff.name}` : ''}
            </Text>
          </View>
          <Button
            title={`Book ₹${totalPrice}`}
            onPress={handleBooking}
            loading={booking}
            style={{ minWidth: 130 }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  backIcon:    { color: COLORS.white, fontSize: 20, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '700' },

  banner:        { height: 180, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  bannerEmoji:   { fontSize: 60 },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, backgroundColor: 'rgba(0,0,0,0.65)' },
  bannerName:    { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  bannerAddress: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  bannerMeta:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 4 },
  metaText:      { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  metaDot:       { color: COLORS.textMuted },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },

  tabRow:        { flexDirection: 'row', margin: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 4 },
  tabBtn:        { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabBtnActive:  { backgroundColor: COLORS.accent },
  tabText:       { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  tabTextActive: { color: COLORS.white },

  section:      { paddingHorizontal: SPACING.lg },
  sectionLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600', marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },

  serviceCard:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border },
  serviceCardActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '15' },
  serviceLeft:       { flex: 1 },
  serviceName:       { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '600' },
  serviceDuration:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  serviceDesc:       { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  serviceRight:      { alignItems: 'flex-end', gap: SPACING.xs },
  servicePrice:      { color: COLORS.accent, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  selectBtn:         { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  selectBtnActive:   { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  selectBtnText:     { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '600' },

  staffCard:        { alignItems: 'center', marginRight: SPACING.md, padding: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, width: 90 },
  staffCardActive:  { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '15' },
  staffAvatar:      { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.cardLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  staffAvatarActive:{ backgroundColor: COLORS.accent },
  staffAvatarText:  { fontSize: 22 },
  staffName:        { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600', textAlign: 'center' },
  staffNameActive:  { color: COLORS.accent },
  staffSpec:        { color: COLORS.textMuted, fontSize: 10, textAlign: 'center', marginTop: 2 },

  selectedServiceBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.accent + '15', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.accent + '50',},
  selectedServiceText:  { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.sm, flex: 1, },
  selectedServicePrice: { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.md, },

  dateCard:       { width: 58, height: 70, borderRadius: RADIUS.md, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  dateCardActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dateDay:        { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  dateDayActive:  { color: COLORS.white },
  dateNum:        { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '700', marginTop: 2 },
  dateNumActive:  { color: COLORS.white },

  slotsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  slotChip:         { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, minWidth: 85, alignItems: 'center' },
  slotChipTaken:    { opacity: 0.35 },
  slotChipSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  slotText:         { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  slotTextTaken:    { textDecorationLine: 'line-through' },
  slotTextSelected: { color: COLORS.white, fontWeight: '700' },
  slotBooked:       { color: COLORS.textMuted, fontSize: 9, marginTop: 1 },

  hintBox:  { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  hintText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },

  bottomBar: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.md, ...SHADOWS.medium },
  bottomService: { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.sm },
  bottomSlot:    { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
});

export default ShopDetailScreen;