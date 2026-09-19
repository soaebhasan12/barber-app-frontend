import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { adminAPI } from '../../services/api';

const AdminShopsScreen = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [rejectModalShop, setRejectModalShop] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await adminAPI.getPendingShops();
      setShops(res.data.data);
    } catch (err) {
      console.log('fetchPending error:', err.message, err.response?.data);
      Alert.alert('Error', 'Failed to fetch pending shops');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (shop) => {
    Alert.alert('Approve Shop', `Approve "${shop.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        setProcessingId(shop._id);
        try {
          await adminAPI.approveShop(shop._id);
          setShops(shops.filter(s => s._id !== shop._id));
        } catch (err) {
          console.log('approveShop error:', err.message, err.response?.data);
          Alert.alert('Error', 'Failed to approve shop');
        } finally {
          setProcessingId(null);
        }
      }},
    ]);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return Alert.alert('Error', 'Please enter a reason');
    setProcessingId(rejectModalShop._id);
    try {
      await adminAPI.rejectShop(rejectModalShop._id, rejectReason.trim());
      setShops(shops.filter(s => s._id !== rejectModalShop._id));
      setRejectModalShop(null);
      setRejectReason('');
    } catch (err) {
      console.log('rejectShop error:', err.message, err.response?.data);
      Alert.alert('Error', 'Failed to reject shop');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Shops</Text>
        <Text style={styles.count}>{shops.length} awaiting review</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {shops.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>All caught up</Text>
          </View>
        ) : (
          shops.map(shop => (
            <View key={shop._id} style={styles.card}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.shopMeta}>{shop.category.toUpperCase()} · {shop.phone}</Text>
              <Text style={styles.shopAddress}>{shop.address}</Text>
              <Text style={styles.shopMeta}>{shop.images?.length || 0} photos · {shop.workingHours?.length || 0} day hours set</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(shop)}
                  disabled={processingId === shop._id}
                >
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => setRejectModalShop(shop)}
                  disabled={processingId === shop._id}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={!!rejectModalShop} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject "{rejectModalShop?.name}"</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for rejection"
              placeholderTextColor={COLORS.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => { setRejectModalShop(null); setRejectReason(''); }}
              >
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={handleReject}>
                <Text style={styles.actionBtnText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  header:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  title:     { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  count:     { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 2 },

  scroll: { paddingHorizontal: SPACING.lg },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText:  { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '600', marginTop: SPACING.sm },

  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  shopName:    { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
  shopMeta:    { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 4 },
  shopAddress: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  approveBtn: { backgroundColor: COLORS.success },
  rejectBtn:  { backgroundColor: COLORS.error },
  cancelBtn:  { backgroundColor: COLORS.textMuted },
  actionBtnText: { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.sm },

  modalOverlay: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalCard:    { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  modalTitle:   { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md, marginBottom: SPACING.md },
  reasonInput:  { backgroundColor: COLORS.inputBg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: SPACING.md },
});

export default AdminShopsScreen;