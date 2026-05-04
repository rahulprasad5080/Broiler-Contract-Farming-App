import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ApiFarm, createBatch, listAllFarms } from '@/services/managementApi';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function toOptionalNumber(value: string) {
  if (value.trim() === '') return undefined;
  const next = Number(value);
  return Number.isNaN(next) ? undefined : next;
}

function farmLabel(farm: ApiFarm) {
  const place = [farm.village, farm.district].filter(Boolean).join(', ');
  return `${farm.code} • ${farm.name}${place ? ` • ${place}` : ''}`;
}

export default function CreateBatchScreen() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [code, setCode] = useState('');
  const [placementDate, setPlacementDate] = useState(todayValue());
  const [placementCount, setPlacementCount] = useState('');
  const [chickCostTotal, setChickCostTotal] = useState('');
  const [chickRatePerBird, setChickRatePerBird] = useState('');
  const [sourceHatchery, setSourceHatchery] = useState('');
  const [targetCloseDate, setTargetCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const availableFarms = useMemo(
    () => farms.filter((farm) => (farm.activeBatchCount ?? 0) === 0),
    [farms],
  );

  const loadFarms = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    try {
      const response = await listAllFarms(accessToken);
      setFarms(response.data);
      setSelectedFarmId((current) => current || response.data.find((farm) => farm.activeBatchCount === 0)?.id || '');
    } catch (error) {
      console.warn('Failed to load farms:', error);
      setMessage('Could not load farms from backend.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadFarms();
    }, [loadFarms]),
  );

  useEffect(() => {
    if (!selectedFarmId && availableFarms[0]) {
      setSelectedFarmId(availableFarms[0].id);
    }
  }, [availableFarms, selectedFarmId]);

  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;
  const canSubmit = Boolean(
    accessToken &&
      selectedFarmId &&
      code.trim() &&
      placementDate &&
      placementCount.trim(),
  );

  const handleSave = async () => {
    if (!accessToken || !selectedFarmId) {
      setMessage('Select a farm before saving.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const created = await createBatch(accessToken, {
        farmId: selectedFarmId,
        code: code.trim(),
        placementDate,
        placementCount: Number(placementCount),
        chickCostTotal: toOptionalNumber(chickCostTotal),
        chickRatePerBird: toOptionalNumber(chickRatePerBird),
        sourceHatchery: sourceHatchery.trim() || undefined,
        targetCloseDate: targetCloseDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setMessage(`Batch ${created.code} created successfully.`);
      setCode('');
      setPlacementCount('');
      setChickCostTotal('');
      setChickRatePerBird('');
      setSourceHatchery('');
      setTargetCloseDate('');
      setNotes('');
      router.back();
    } catch (error) {
      console.warn('Failed to create batch:', error);
      const fallback = error instanceof Error ? error.message : 'Failed to create batch.';
      setMessage(fallback);
      Alert.alert('Batch create failed', fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Create New Batch</Text>
          <Text style={styles.headerSub}>{user?.role ?? 'User'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>
            A live batch is created directly in the backend. Only farms without an active batch are shown here.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Farm</Text>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading farms...</Text>
            </View>
          ) : availableFarms.length === 0 ? (
            <Text style={styles.emptyText}>No eligible farms available for batch creation.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {availableFarms.map((farm) => {
                const active = farm.id === selectedFarmId;
                return (
                  <TouchableOpacity
                    key={farm.id}
                    style={[styles.farmChip, active && styles.farmChipActive]}
                    onPress={() => setSelectedFarmId(farm.id)}
                  >
                    <Text style={[styles.farmChipText, active && styles.farmChipTextActive]}>
                      {farmLabel(farm)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selectedFarm ? (
            <View style={styles.summaryStrip}>
              <Ionicons name="business-outline" size={18} color={Colors.primary} />
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>{selectedFarm.name}</Text>
                <Text style={styles.summarySub}>
                  {selectedFarm.code} • {selectedFarm.location ?? 'No location'} • {selectedFarm.status}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Batch Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Batch Code *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="BATCH-APR-2026-01"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Placement Date *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={placementDate}
                onChangeText={setPlacementDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecondary}
              />
              <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Placement Count *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={placementCount}
                  onChangeText={setPlacementCount}
                  placeholder="5000"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                <Ionicons name="layers-outline" size={18} color={Colors.textSecondary} />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Chick Rate / Bird</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={chickRatePerBird}
                  onChangeText={setChickRatePerBird}
                  placeholder="44"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Ionicons name="cash-outline" size={18} color={Colors.textSecondary} />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Chick Cost Total</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={chickCostTotal}
                  onChangeText={setChickCostTotal}
                  placeholder="220000"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Ionicons name="logo-usd" size={18} color={Colors.textSecondary} />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Target Close Date</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={targetCloseDate}
                  onChangeText={setTargetCloseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textSecondary}
                />
                <Ionicons name="calendar-number-outline" size={18} color={Colors.textSecondary} />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Source Hatchery</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={sourceHatchery}
                onChangeText={setSourceHatchery}
                placeholder="Sunrise Hatchery"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <View style={[styles.inputBox, styles.textArea]}>
              <TextInput
                style={[styles.input, styles.multiLine]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Phase 1 starter batch"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>
          </View>
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, (!canSubmit || submitting) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSubmit || submitting}
          activeOpacity={canSubmit ? 0.85 : 1}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Create Batch</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 14,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 14,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  loadingBox: {
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  farmChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  farmChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  farmChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  farmChipTextActive: {
    color: '#FFF',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  summarySub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
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
  textArea: {
    minHeight: 84,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  multiLine: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  messageBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9DB8A8',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
