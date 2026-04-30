import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Control, Controller, FieldValues, Path, RegisterOptions } from 'react-hook-form';
import { Colors } from '../../constants/Colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface FormInputProps<TFieldValues extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  /** react-hook-form control object */
  control: Control<TFieldValues>;
  /** Field name (must match key in your form schema) */
  name: Path<TFieldValues>;
  /** Optional validation rules */
  rules?: RegisterOptions<TFieldValues, Path<TFieldValues>>;
  /** Label shown above the input */
  label?: string;
  /** Ionicons icon name shown on the left */
  leftIcon?: IoniconsName;
  /** Show password toggle eye icon (use with secureTextEntry) */
  isPassword?: boolean;
  /** Extra label element on the right (e.g. "Forgot?" link) */
  rightLabel?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FormInput<TFieldValues extends FieldValues>({
  control,
  name,
  rules,
  label,
  leftIcon,
  isPassword = false,
  rightLabel,
  ...textInputProps
}: FormInputProps<TFieldValues>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={styles.group}>
          {/* ── Label row ─────────────────────────────────── */}
          {(label || rightLabel) && (
            <View style={styles.labelRow}>
              {label && <Text style={styles.label}>{label}</Text>}
              {rightLabel}
            </View>
          )}

          {/* ── Input wrapper ─────────────────────────────── */}
          <View style={[styles.wrapper, error && styles.wrapperError]}>
            {leftIcon && (
              <Ionicons
                name={leftIcon}
                size={20}
                color={error ? Colors.error : Colors.textSecondary}
                style={styles.leftIcon}
              />
            )}

            <TextInput
              style={styles.input}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry={isPassword && !showPassword}
              {...textInputProps}
            />

            {/* Eye icon for password fields */}
            {isPassword && (
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Error message ─────────────────────────────── */}
          {error?.message && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}
        </View>
      )}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    height: 48,
  },
  wrapperError: {
    borderColor: Colors.error,
    backgroundColor: '#FFF9F9',
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
});
