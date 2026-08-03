import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const { login } = useAuth();
  const [step, setStep]     = useState('phone');  // phone | otp | name
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [name, setName]     = useState('');
  const [role, setRole]     = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSendOTP = async () => {
      if (phone.length !== 10) return setError('Please enter a valid 10-digit number');
      setError('');
      setLoading(true);
      try {
        await authAPI.sendOTP(phone, role);
        setStep('otp');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to send OTP. Please try again');
      } finally {
        setLoading(false);
      }
    };

    const handleVerifyOTP = async () => {
      if (otp.length !== 6) return setError('Please enter the 6-digit OTP');
      setError('');
      setLoading(true);
      try {
        const res = await authAPI.verifyOTP(phone, otp, name);
        await login(res.data.data.token, res.data.data.user);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid OTP. Please try again');
      } finally {
        setLoading(false);
      }
    };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>✂️</Text>
          </View>
          <Text style={styles.appName}>BarberBook</Text>
          <Text style={styles.tagline}>Book your style, anytime</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {step === 'phone' && (
            <>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Apna phone number daalo</Text>

              {/* Role Toggle */}
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'user' && styles.roleBtnActive]}
                  onPress={() => setRole('user')}
                >
                  <Text style={[styles.roleTxt, role === 'user' && styles.roleTxtActive]}>👤 Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'owner' && styles.roleBtnActive]}
                  onPress={() => setRole('owner')}
                >
                  <Text style={[styles.roleTxt, role === 'owner' && styles.roleTxtActive]}>✂️ Shop Owner</Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                error={error}
              />
              <Button title="Send OTP" onPress={handleSendOTP} loading={loading} />
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>OTP Verify karo</Text>
              <Text style={styles.subtitle}>+91 {phone} pe bheja gaya</Text>

              <Input
                label="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                error={error}
              />

              <Input
                label="Apna Naam (optional)"
                value={name}
                onChangeText={setName}
                placeholder="Jaise: Rahul Sharma"
              />

              <Button title="Verify & Login" onPress={handleVerifyOTP} loading={loading} />

              <TouchableOpacity onPress={() => { setStep('phone'); setError(''); }} style={styles.backBtn}>
                <Text style={styles.backTxt}>← Number change karo</Text>
              </TouchableOpacity>
            </>
          )}

        </View>

        <Text style={styles.terms}>
          Login karke aap humare Terms & Privacy Policy se agree karte hain
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:    { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },

  logoSection: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle:  {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  logoEmoji: { fontSize: 36 },
  appName:   { fontSize: FONTS.sizes.xxxl, fontWeight: '700', color: COLORS.white, letterSpacing: 1 },
  tagline:   { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.lg,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },

  title:    { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },

  roleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  roleBtn: {
    flex: 1, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.border, alignItems: 'center',
  },
  roleBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '20' },
  roleTxt:       { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  roleTxtActive: { color: COLORS.accent, fontWeight: '600' },

  backBtn: { alignItems: 'center', marginTop: SPACING.md },
  backTxt: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },

  terms: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: SPACING.lg },
});

export default LoginScreen;