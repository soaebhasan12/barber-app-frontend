import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const Button = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',   // primary | outline | ghost
  size = 'md',           // sm | md | lg
  disabled = false,
  style,
}) => {
  const isOutline = variant === 'outline';
  const isGhost   = variant === 'ghost';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[size],
        isOutline && styles.outline,
        isGhost   && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={isOutline ? COLORS.accent : COLORS.white} />
        : <Text style={[styles.text, isOutline && styles.textOutline, isGhost && styles.textGhost]}>
            {title}
          </Text>
      }
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.accent,
    borderRadius:    RADIUS.md,
    alignItems:      'center',
    justifyContent:  'center',
  },
  sm:  { paddingVertical: SPACING.xs,  paddingHorizontal: SPACING.md, height: 40 },
  md:  { paddingVertical: SPACING.sm,  paddingHorizontal: SPACING.lg, height: 52 },
  lg:  { paddingVertical: SPACING.md,  paddingHorizontal: SPACING.xl, height: 60 },
  outline: {
    backgroundColor: 'transparent',
    borderWidth:      1.5,
    borderColor:      COLORS.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: { opacity: 0.5 },
  text: {
    color:      COLORS.white,
    fontSize:   FONTS.sizes.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textOutline: { color: COLORS.accent },
  textGhost:   { color: COLORS.textSecondary },
});

export default Button;