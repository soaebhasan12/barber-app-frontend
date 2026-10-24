import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { bookingAPI, getApiError } from '../services/api';
import { toLocalYMD, formatTime12h } from '../utils/time';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ACTIVE = ['pending', 'confirmed'];

const OwnerSlotGrid = ({ shopId, refreshKey }) => {
  const [date, setDate] = useState(toLocalYMD());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqRef = useRef(0);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { date: toLocalYMD(d), day: DAY_NAMES[d.getDay()], num: d.getDate() };
  });

  useEffect(() => {
    if (!shopId) return;
    const id = ++reqRef.current;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [slotRes, bookRes] = await Promise.all([
          bookingAPI.getSlots(shopId, date),
          bookingAPI.getShopBookings(shopId, date),
        ]);
        if (id !== reqRef.current) return;
        const slots = slotRes.data.data || [];
        const active = (bookRes.data.data || []).filter(b => ACTIVE.includes(b.status));
        const byTime = {};
        active.forEach(b => { byTime[b.slotTime] = (byTime[b.slotTime] || 0) + 1; });
        const map = {};
        slots.forEach(s => { map[s.time] = { time: s.time, full: !s.available, count: byTime[s.time] || 0 }; });
        // Beet chuke slots getSlots se hat jaate hain, par unki bookings dikhni chahiye
        Object.keys(byTime).forEach(t => { if (!map[t]) map[t] = { time: t, full: false, count: byTime[t] }; });
        setRows(Object.values(map).sort((a, b) => a.time.localeCompare(b.time)));
      } catch (err) {
        if (id !== reqRef.current) return;
        console.log('OwnerSlotGrid error:', err);
        setError(getApiError(err, 'Could not load slots.').message);
      } finally {
        if (id === reqRef.current) setLoading(false);
      }
    })();
  }, [shopId, date, refreshKey]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Slot Overview</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled style={{ marginBottom: SPACING.md }}>
        {dates.map(d => (
          <TouchableOpacity key={d.date} style={[styles.dateCard, date === d.date && styles.dateCardActive]} onPress={() => setDate(d.date)}>
            <Text style={[styles.dateDay, date === d.date && styles.dateTextActive]}>{d.day}</Text>
            <Text style={[styles.dateNum, date === d.date && styles.dateTextActive]}>{d.num}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : error ? (
        <Text style={styles.hint}>{error}</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.hint}>No slots on this day. The shop may be closed.</Text>
      ) : (
        <View style={styles.grid}>
          {rows.map(r => (
            <View key={r.time} style={[styles.chip, r.full ? styles.chipFull : r.count > 0 && styles.chipBooked]}>
              <Text style={styles.chipTime}>{formatTime12h(r.time)}</Text>
              <Text style={styles.chipNote}>{r.full ? 'Full' : r.count > 0 ? `${r.count} booked` : 'Free'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:  { paddingHorizontal: SPACING.lg, marginBottom: 110 },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  hint:  { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center' },
  dateCard:       { width: 52, height: 62, borderRadius: RADIUS.md, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  dateCardActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dateDay:        { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  dateNum:        { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700', marginTop: 2 },
  dateTextActive: { color: COLORS.white },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip:       { minWidth: 88, alignItems: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipBooked: { backgroundColor: COLORS.accent + '20', borderColor: COLORS.accent },
  chipFull:   { backgroundColor: COLORS.error + '18', borderColor: COLORS.error },
  chipTime:   { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  chipNote:   { color: COLORS.textSecondary, fontSize: 10, marginTop: 1 },
});

export default OwnerSlotGrid;