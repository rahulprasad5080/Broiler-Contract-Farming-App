import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  ApiTrader,
  ApiVendor,
  createTrader,
  createVendor,
  listAllTraders,
  listAllVendors,
} from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const traderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type TraderFormData = z.infer<typeof traderSchema>;
type PartnerTab = 'vendors' | 'traders';
type PartnerRecord = ApiVendor | ApiTrader;

export default function SupervisorTradersScreen() {
  const { accessToken } = useAuth();

  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [activeTab, setActiveTab] = useState<PartnerTab>('vendors');
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

  const fetchPartners = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [vendorRes, traderRes] = await Promise.all([
        listAllVendors(accessToken),
        listAllTraders(accessToken),
      ]);
      setVendors(vendorRes.data);
      setTraders(traderRes.data);
    } catch (error) {
      showRequestErrorToast(error, {
        title: 'Unable to load partners',
        fallbackMessage: 'Failed to fetch vendors and traders.',
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchPartners();
  }, [fetchPartners]);

  const handleSave = async (data: TraderFormData) => {
    if (!accessToken) return;

    setSaving(true);
    try {
      const payload = {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
      };
      if (activeTab === 'vendors') {
        const created = await createVendor(accessToken, payload);
        setVendors((prev) => [created, ...prev]);
      } else {
        const created = await createTrader(accessToken, payload);
        setTraders((prev) => [created, ...prev]);
      }
      reset();
      setShowAddModal(false);
      showSuccessToast(`${activeTab === 'vendors' ? 'Vendor' : 'Trader'} added.`);
    } catch (error) {
      showRequestErrorToast(error, {
        title: 'Trader save failed',
        fallbackMessage: `Failed to add ${activeTab === 'vendors' ? 'vendor' : 'trader'}.`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Partners Directory"
        subtitle="Vendors for purchases, traders for sales"
        right={
          <TouchableOpacity style={styles.headerAction} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color="#0B5C36" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={loading ? [] : (activeTab === 'vendors' ? vendors : traders)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        style={styles.mainList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.tabRow}>
            {(['vendors', 'traders'] as PartnerTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                  {tab === 'vendors' ? 'Vendors' : 'Traders'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item: partner }: { item: PartnerRecord }) => (
          <View style={styles.traderCard}>
              <View style={styles.avatarBox}>
                <Ionicons name={activeTab === 'vendors' ? 'business-outline' : 'person'} size={20} color={Colors.primary} />
              </View>
              <View style={styles.traderInfo}>
                <Text style={styles.traderName}>{partner.name}</Text>
                {partner.phone ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{partner.phone}</Text>
                  </View>
                ) : null}
                {partner.address ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{partner.address}</Text>
                  </View>
                ) : null}
              </View>
            </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ScreenState title="Loading partners" message="Fetching partner directory." loading />
          ) : (
            <ScreenState
              title={`No ${activeTab === 'vendors' ? 'vendors' : 'traders'} found`}
              message={`Tap the add button to add a new ${activeTab === 'vendors' ? 'vendor' : 'trader'}.`}
              icon="people-outline"
            />
          )
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: '100%' }}
          >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add {activeTab === 'vendors' ? 'Vendor' : 'Trader'}</Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.label}>{activeTab === 'vendors' ? 'Vendor' : 'Trader'} Name *</Text>
                  <View style={[styles.inputBox, formErrors.name && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder={activeTab === 'vendors' ? 'e.g., Ramesh Feed Supply' : 'e.g., Ramesh Traders'}
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
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save {activeTab === 'vendors' ? 'Vendor' : 'Trader'}</Text>}
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  headerAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100, maxWidth: Layout.contentMaxWidth, alignSelf: 'center', width: '100%' },
  mainList: { flex: 1, backgroundColor: '#F9FAFB' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: '#0B5C36', borderColor: '#0B5C36' },
  tabBtnText: { fontSize: 13, fontWeight: '800', color: '#6B7280' },
  tabBtnTextActive: { color: '#FFF' },
  traderCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: Layout.borderRadius.sm, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  avatarBox: { width: 52, height: 52, borderRadius: Layout.borderRadius.sm, backgroundColor: '#E7F5ED', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
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
