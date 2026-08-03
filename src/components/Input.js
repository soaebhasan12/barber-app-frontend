import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  error,
  style,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        focused && styles.focused,
        error  && styles.errorBorder,
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:        { marginBottom: SPACING.md },
  label:          { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.xs, fontWeight: '500' },
  inputContainer: {
    backgroundColor: COLORS.inputBg,
    borderRadius:    RADIUS.md,
    borderWidth:     1.5,
    borderColor:     COLORS.border,
    paddingHorizontal: SPACING.md,
    height:          52,
    justifyContent:  'center',
  },
  focused:     { borderColor: COLORS.accent },
  errorBorder: { borderColor: COLORS.error },
  input:       { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, flex: 1 },
  error:       { color: COLORS.error, fontSize: FONTS.sizes.xs, marginTop: 4 },
});

export default Input;