import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { toLocalYMD } from '../utils/time';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const parse = (s) => { const [y, m] = s.split('-').map(Number); return { y, m: m - 1 }; };

// marks: { 'YYYY-MM-DD': { pending, total } }
const DatePickerModal = ({ visible, value, marks = {}, onSelect, onClose }) => {
  const [view, setView] = useState(parse(value));
  useEffect(() => { if (visible) setView(parse(value)); }, [visible, value]);

  const daysIn = new Date(view.y, view.m + 1, 0).getDate();
  const lead = new Date(view.y, view.m, 1).getDay();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const today = toLocalYMD();
  const move = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          <View style={styles.head}>
            <TouchableOpacity onPress={() => move(-1)} style={styles.navBtn} accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{MONTHS[view.m]} {view.y}</Text>
            <TouchableOpacity onPress={() => move(1)} style={styles.navBtn} accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            {WEEK.map((w, i) => <Text key={i} style={styles.weekText}>{w}</Text>)}
          </View>

          <View style={styles.row}>
            {cells.map((d, i) => {
              if (!d) return <View key={`e${i}`} style={styles.cell} />;
              const date = toLocalYMD(new Date(view.y, view.m, d));
              const mark = marks[date];
              const selected = date === value;
              return (
                <TouchableOpacity key={date} style={styles.cell} onPress={() => onSelect(date)} activeOpacity={0.8}>
                  <View style={[styles.day, date === today && styles.dayToday, selected && styles.daySelected]}>
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{d}</Text>
                  </View>
                  {mark?.pending > 0
                    ? <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
                    : mark?.total > 0 ? <View style={[styles.dot, { backgroundColor: COLORS.accent }]} /> : <View style={styles.dotGap} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: COLORS.warning }]} /><Text style={styles.legendText}>Pending</Text>
            <View style={[styles.dot, { backgroundColor: COLORS.accent, marginLeft: SPACING.md }]} /><Text style={styles.legendText}>Bookings</Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footBtn} onPress={() => onSelect(today)}>
              <Text style={styles.footBtnText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footBtn} onPress={onClose}>
              <Text style={[styles.footBtnText, { color: COLORS.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:      { width: '100%', backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.md },
  head:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  navBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '700' },
  row:       { flexDirection: 'row', flexWrap: 'wrap' },
  weekText:  { width: '14.285%', textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600', paddingVertical: 4 },
  cell:      { width: '14.285%', alignItems: 'center', paddingVertical: 3 },
  day:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  dayToday:  { borderColor: COLORS.accent },
  daySelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dayText:   { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  dayTextSelected: { color: COLORS.white, fontWeight: '700' },
  dot:       { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dotGap:    { width: 5, height: 5, marginTop: 2 },
  legend:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  legendText:{ color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginLeft: 4 },
  footer:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  footBtn:   { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  footBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.sizes.sm },
});

export default DatePickerModal;