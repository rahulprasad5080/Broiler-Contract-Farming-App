import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { getLocalDateValue } from '@/services/dateUtils';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DatePickerFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disableFuture?: boolean;
};

function todayValue() {
  return getLocalDateValue();
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateValue(value?: string) {
  if (!value) return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dateFromValue(value?: string) {
  if (!isValidDateValue(value)) {
    return new Date();
  }

  const [year, month, day] = value!.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthFromValue(value?: string) {
  const date = dateFromValue(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];
}

function isFutureDate(value: string) {
  return value > todayValue();
}

export function DatePickerField({
  label,
  value,
  onChange,
  error,
  placeholder = 'Select date',
  disableFuture = false,
}: DatePickerFieldProps) {
  const [visible, setVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => monthFromValue(value));

  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);
  const calendarTitle = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const openPicker = useCallback(() => {
    setCalendarMonth(monthFromValue(value));
    setVisible(true);
  }, [value]);

  const selectDate = useCallback(
    (date: Date) => {
      onChange(formatDateValue(date));
      setVisible(false);
    },
    [onChange],
  );

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputBox, error && styles.inputError]}
        onPress={openPicker}
        activeOpacity={0.78}
      >
        <Text style={[styles.dateValue, !value && styles.datePlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.calendarOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.calendarSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() => setCalendarMonth((current) => addMonths(current, -1))}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{calendarTitle}</Text>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() => setCalendarMonth((current) => addMonths(current, 1))}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((date, index) => {
                const dateValue = date ? formatDateValue(date) : '';
                const isSelected = Boolean(date && value && dateValue === value);
                const isToday = Boolean(date && dateValue === todayValue());
                const disabled = !date || (disableFuture && isFutureDate(dateValue));

                return (
                  <TouchableOpacity
                    key={`${dateValue || 'empty'}-${index}`}
                    style={[styles.calendarDay, disabled && styles.calendarDayDisabled]}
                    onPress={() => date && !disabled && selectDate(date)}
                    disabled={disabled}
                    activeOpacity={0.78}
                  >
                    <View
                      style={[
                        styles.calendarDayInner,
                        isToday && styles.calendarDayToday,
                        isSelected && styles.calendarDaySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                          disabled && styles.calendarDayTextDisabled,
                        ]}
                      >
                        {date ? date.getDate() : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: Colors.tertiary,
  },
  dateValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  datePlaceholder: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    padding: 20,
  },
  calendarSheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F8',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayToday: {
    backgroundColor: '#E8F5E9',
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayDisabled: {
    opacity: 0.35,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  calendarDayTextSelected: {
    color: '#FFF',
  },
  calendarDayTextDisabled: {
    color: Colors.textSecondary,
  },
});
