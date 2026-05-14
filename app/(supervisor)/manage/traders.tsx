import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  ApiTrader,
  createTrader,
  listAllTraders,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const traderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type TraderFormData = z.infer<typeof traderSchema>;

export default function SupervisorTradersScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const { control, handleSubmit, reset, formState: { errors: formErrors } } = useForm<TraderFormData>({
    resolver: zodResolver(traderSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
    },
  });

  const fetchTraders = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await listAllTraders(accessToken);
      setTraders(res.data);
    } catch (error) {
      console.warn('Failed to fetch traders', error);
      showRequestErrorToast(error, {
        title: 'Unable to load traders',
        fallbackMessage: 'Failed to fetch traders.',
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchTraders();
  }, [fetchTraders]);

  const handleSave = async (data: TraderFormData) => {
    if (!accessToken) return;

    setSaving(true);
    try {
      const created = await createTrader(accessToken, {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
      });
      setTraders((prev) => [created, ...prev]);
      reset();
      setShowAddModal(false);
      showSuccessToast('Trader added.');
    } catch (error) {
      console.warn('Failed to save trader', error);
      showRequestErrorToast(error, {
        title: 'Trader save failed',
        fallbackMessage: 'Failed to add trader.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Traders Directory</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#0B5C36" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : traders.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>No Traders Found</Text>
            <Text style={styles.emptyText}>Tap the + icon to add a new trader.</Text>
          </View>
        ) : (
          traders.map((trader) => (
            <View key={trader.id} style={styles.traderCard}>
              <View style={styles.avatarBox}>
                <Ionicons name="person" size={20} color={Colors.primary} />
              </View>
              <View style={styles.traderInfo}>
                <Text style={styles.traderName}>{trader.name}</Text>
                {trader.phone ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{trader.phone}</Text>
                  </View>
                ) : null}
                {trader.address ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{trader.address}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Trader</Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.label}>Trader Name *</Text>
                  <View style={[styles.inputBox, formErrors.name && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="e.g., Ramesh Traders"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.name && <Text style={styles.fieldErrorText}>{formErrors.name.message}</Text>}
                </>
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={[styles.inputBox, formErrors.phone && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {formErrors.phone && <Text style={styles.fieldErrorText}>{formErrors.phone.message}</Text>}
                </>
              )}
            />

            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.label}>Address</Text>
                  <View style={[styles.inputBox, formErrors.address && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.address && <Text style={styles.fieldErrorText}>{formErrors.address.message}</Text>}
                </>
              )}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit(handleSave)} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save Trader</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCopy: { flex: 1 },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  headerAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100, maxWidth: Layout.contentMaxWidth, alignSelf: 'center', width: '100%' },
  mainScroll: { flex: 1, backgroundColor: '#F9FAFB' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: "#111827", marginTop: 16 },
  emptyText: { fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: 'center' },
  traderCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  avatarBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#E7F5ED', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  traderInfo: { flex: 1, justifyContent: 'center' },
  traderName: { fontSize: 17, fontWeight: '700', color: "#111827", marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13, color: "#4B5563" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: "#111827", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: "#374151", marginBottom: 8, marginTop: 14 },
  inputBox: { height: 52, borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: '#F9FAFB' },
  input: { fontSize: 15, color: "#111827", padding: 0 },
  submitBtn: { backgroundColor: "#0B5C36", height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  fieldErrorText: {
    color: "#DC2626",
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
});
