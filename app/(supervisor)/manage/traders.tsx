import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';
import {
  ApiTrader,
  createTrader,
  listAllTraders,
} from '@/services/managementApi';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

  const fetchTraders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await listAllTraders(accessToken);
      setTraders(res.data);
    } catch (error) {
      console.warn('Failed to fetch traders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraders();
  }, [accessToken]);

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
      Toast.show({ type: 'success', text1: 'Success', text2: 'Trader added' });
    } catch (error) {
      console.warn('Failed to save trader', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add trader' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Traders Directory</Text>
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  headerAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Layout.screenPadding, paddingBottom: 100, maxWidth: Layout.contentMaxWidth, alignSelf: 'center', width: '100%' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  traderCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Layout.cardShadow,
  },
  avatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  traderInfo: { flex: 1, justifyContent: 'center' },
  traderName: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  infoText: { fontSize: 13, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 12 },
  inputBox: { height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#F9FAFB' },
  input: { fontSize: 14, color: Colors.text, padding: 0 },
  submitBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
