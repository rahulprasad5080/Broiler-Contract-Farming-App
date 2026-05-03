import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

// ─── Mock chicken farm image (via picsum / placeholder) ───────────────────────
const CHICKEN_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80',
};

const SUPERVISOR_TIPS = [
  'Ensure scales are zeroed before weighing samples to maintain data accuracy.',
  'Record mortality as soon as discovered — do not batch-report at end of day.',
  'Distribute feed evenly across all feeders before measuring consumption.',
  'Weigh at least 3% of the flock to get a reliable average weight sample.',
];

export default function DailyEntryScreen() {
  const router = useRouter();

  const [mortality, setMortality] = useState('');
  const [feedConsumption, setFeedConsumption] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tip = SUPERVISOR_TIPS[today.getDate() % SUPERVISOR_TIPS.length];

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const isValid =
    mortality !== '' || feedConsumption !== '' || avgWeight !== '';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Broiler Manager</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page Title ── */}
        <Text style={styles.pageTitle}>Daily Entry</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{dateStr}</Text>
        </View>
        <View style={[styles.metaRow, { marginTop: 4 }]}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>Flock #2024-A (Day 18)</Text>
        </View>

        <View style={styles.divider} />

        {/* ── Mortality Field ── */}
        <Text style={styles.fieldLabel}>Mortality (Number of Birds)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            placeholder="0"
            placeholderTextColor={Colors.textSecondary}
            value={mortality}
            onChangeText={setMortality}
            keyboardType="numeric"
          />
          <View style={styles.inputIcon}>
            <MaterialCommunityIcons name="skull-outline" size={22} color={Colors.textSecondary} />
          </View>
        </View>
        <Text style={styles.fieldHint}>Report count of dead birds found today.</Text>

        {/* ── Feed Consumption Field ── */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Feed Consumption (kg)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            placeholder="0.0"
            placeholderTextColor={Colors.textSecondary}
            value={feedConsumption}
            onChangeText={setFeedConsumption}
            keyboardType="decimal-pad"
          />
          <View style={styles.inputIcon}>
            <MaterialCommunityIcons name="silverware-fork" size={22} color={Colors.textSecondary} />
          </View>
        </View>
        <Text style={styles.fieldHint}>Total weight of feed distributed.</Text>

        {/* ── Average Weight Field ── */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Average Weight (kg)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            placeholder="0.000"
            placeholderTextColor={Colors.textSecondary}
            value={avgWeight}
            onChangeText={setAvgWeight}
            keyboardType="decimal-pad"
          />
          <View style={styles.inputIcon}>
            <MaterialCommunityIcons name="scale" size={22} color={Colors.textSecondary} />
          </View>
        </View>
        <Text style={styles.fieldHint}>Sample average weight per bird.</Text>

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={isValid ? 0.8 : 1}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.submitBtnText}>Submit Entry</Text>
        </TouchableOpacity>

        {/* ── Success Banner ── */}
        {submitted && (
          <View style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
            </View>
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Entry Saved</Text>
              <Text style={styles.successSub}>Flock data updated for Day 18.</Text>
            </View>
          </View>
        )}

        {/* ── Chicken Image ── */}
        <View style={styles.imageCard}>
          <Image
            source={CHICKEN_IMAGE}
            style={styles.chickenImage}
            resizeMode="cover"
          />
          <View style={styles.tipOverlay}>
            <Text style={styles.tipTitle}>Supervisor Tip</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 14 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },

  container: {
    padding: Layout.screenPadding,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.formMaxWidth,
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },

  // Input Fields
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 54,
    ...Layout.cardShadow,
  },
  inputField: {
    flex: 1,
    fontSize: 18,
    color: Colors.text,
    padding: 0,
  },
  inputIcon: {
    marginLeft: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 12,
    marginTop: 28,
    marginBottom: 16,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#9DB8A8',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Success Banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    gap: 12,
  },
  successIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  successSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Chicken Image Card
  imageCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  chickenImage: {
    width: '100%',
    height: 160,
  },
  tipOverlay: {
    backgroundColor: '#FFF',
    padding: 14,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
