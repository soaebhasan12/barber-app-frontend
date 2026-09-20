import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const LoginScreen = () => {
  const { login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [name, setName]     = useState('');
  const [role, setRole]     = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendOTP = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) return setError('Please enter a valid email address');
    setError('');
    setLoading(true);
    try {
      await authAPI.sendOTP({ email: email.trim(), role });
      setStep('otp');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== OTP_LENGTH) return setError('Please enter the 6-digit OTP');
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP({ email: email.trim(), otp, name });
      await login(res.data.data.token, res.data.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text, index) => {
    // Autofill/paste — poora code ek box mein aa sakta hai
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const filled = Array(OTP_LENGTH).fill('');
      digits.forEach((d, i) => { filled[i] = d; });
      setOtpDigits(filled);
      const lastIndex = Math.min(digits.length, OTP_LENGTH) - 1;
      if (lastIndex >= 0) otpRefs.current[lastIndex]?.focus();
      return;
    }
    const updated = [...otpDigits];
    updated[index] = text.replace(/\D/g, '');
    setOtpDigits(updated);
    if (text && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
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
            <Ionicons name="cut" size={34} color={COLORS.white} />
          </View>
          <Text style={styles.appName}>BarberBook</Text>
          <Text style={styles.tagline}>Book your style, anytime</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {step === 'email' && (
            <>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Enter your email address</Text>

              {/* Role Toggle */}
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'user' && styles.roleBtnActive]}
                  onPress={() => setRole('user')}
                  activeOpacity={0.85}
                >
                  <Ionicons name={role === 'user' ? 'person' : 'person-outline'} size={20} color={role === 'user' ? COLORS.accent : COLORS.textSecondary} />
                  <Text style={[styles.roleTxt, role === 'user' && styles.roleTxtActive]}>Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'owner' && styles.roleBtnActive]}
                  onPress={() => setRole('owner')}
                  activeOpacity={0.85}
                >
                  <Ionicons name={role === 'owner' ? 'storefront' : 'storefront-outline'} size={20} color={role === 'owner' ? COLORS.accent : COLORS.textSecondary} />
                  <Text style={[styles.roleTxt, role === 'owner' && styles.roleTxtActive]}>Shop Owner</Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={error}
              />

              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.trustText}>Secure OTP verification via Email</Text>
              </View>

              <Button title="Send OTP" onPress={handleSendOTP} loading={loading} />
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>Sent to {email}</Text>

              <View style={styles.otpRow}>
                {otpDigits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={el => (otpRefs.current[i] = el)}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, i)}
                    onKeyPress={e => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={i === 0 ? OTP_LENGTH : 1}
                    textContentType={i === 0 ? 'oneTimeCode' : undefined}
                    autoComplete={i === 0 ? 'sms-otp' : 'off'}
                    style={[styles.otpBox, digit && styles.otpBoxFilled]}
                  />
                ))}
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Input
                label="Your Name (optional)"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Rahul Sharma"
              />

              <Button title="Verify & Login" onPress={handleVerifyOTP} loading={loading} />

              <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => { setStep('email'); setError(''); }} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.backTxt}>Change email</Text>
                </TouchableOpacity>

                {resendTimer > 0 ? (
                  <Text style={styles.resendMuted}>Resend in {resendTimer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOTP}>
                    <Text style={styles.resendActive}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

        </View>

        <Text style={styles.terms}>
          By logging in, you agree to our Terms & Privacy Policy
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
  appName:   { fontSize: FONTS.sizes.xxxl, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 1 },
  tagline:   { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.lg,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },

  title:    { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },

  roleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  roleBtn: {
    flex: 1, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.border, alignItems: 'center', gap: 6,
  },
  roleBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '20' },
  roleTxt:       { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  roleTxtActive: { color: COLORS.accent, fontWeight: '700' },

  trustRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACING.md, marginTop: -SPACING.xs },
  trustText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  otpBox: {
    width: 44, height: 52, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: COLORS.accent },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.xs, marginBottom: SPACING.sm, marginTop: -SPACING.sm },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backTxt:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  resendMuted: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  resendActive: { color: COLORS.accent, fontSize: FONTS.sizes.sm, fontWeight: '700' },

  terms: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: SPACING.lg },
});

export default LoginScreen;