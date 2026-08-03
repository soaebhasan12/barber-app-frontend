import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const ProfileScreen = () => {
  const { user, logout, updateUser } = useAuth();
  const [editModal, setEditModal] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return Alert.alert('Error', 'Name cannot be empty');
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(nameInput.trim());
      await updateUser(res.data.data);
      setEditModal(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'owner' ? '✂️  Shop Owner' : '👤  Customer'}
          </Text>
        </View>
        <TouchableOpacity style={styles.editNameBtn} onPress={() => { setNameInput(user?.name || ''); setEditModal(true); }}>
          <Text style={styles.editNameText}>✎ Edit Name</Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <InfoRow icon="📱" label="Phone" value={`+91 ${user?.phone}`} />
        <View style={styles.divider} />
        <InfoRow icon="🎭" label="Account Type" value={user?.role === 'owner' ? 'Shop Owner' : 'Customer'} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: COLORS.border }]} onPress={() => setEditModal(false)}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.accent }]} onPress={handleSaveName} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '600' }}>Save</Text>}
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
  header:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  title:     { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },

  editNameBtn:  { marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  editNameText: { color: COLORS.accent, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  modalTitle:   { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.lg },
  modalInput:   { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  modalBtns:    { flexDirection: 'row', gap: SPACING.sm },
  modalBtn:     { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center' },

  avatarSection: { alignItems: 'center', paddingVertical: SPACING.xl },
  avatar:        {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  avatarText: { fontSize: 36, color: COLORS.white, fontWeight: '700' },
  userName:   { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  roleBadge:  { marginTop: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: 4, backgroundColor: COLORS.card, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  roleText:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },

  card:     { marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  infoIcon: { fontSize: 20 },
  infoLabel:{ color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  infoValue:{ color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '500', marginTop: 2 },
  divider:  { height: 1, backgroundColor: COLORS.border },

  logoutBtn:  { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.error, alignItems: 'center' },
  logoutText: { color: COLORS.error, fontWeight: '600', fontSize: FONTS.sizes.md },
});

export default ProfileScreen;