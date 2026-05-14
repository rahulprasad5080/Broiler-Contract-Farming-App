import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

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

const traderSchema = z.object({
  name: z.string().trim().min(1, 'Trader name is required'),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type TraderFormData = z.infer<typeof traderSchema>;

const TRADER_DEFAULTS = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
} satisfies TraderFormData;

export default function PartnerManagementScreen() {
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TraderFormData>({
    resolver: zodResolver(traderSchema),
    defaultValues: TRADER_DEFAULTS,
  });

  const canManagePartners = hasPermission('manage:partners');

  const loadTraders = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await listAllTraders(accessToken);
      setTraders(response.data);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load traders',
          fallbackMessage: 'Failed to load trader master.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadTraders();
    }, [loadTraders]),
  );

  const filteredTraders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return traders;

    return traders.filter(
      (trader) =>
        trader.name.toLowerCase().includes(query) ||
        (trader.phone ?? '').includes(query) ||
        (trader.email ?? '').toLowerCase().includes(query),
    );
  }, [search, traders]);

  const handleAddTrader = async (data: TraderFormData) => {
    if (!accessToken) {
      setMessage('Missing access token. Please sign in again.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const created = await createTrader(accessToken, {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        address: data.address?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      });

      setTraders((current) => [created, ...current]);
      reset(TRADER_DEFAULTS);
      setShowAddModal(false);
      showSuccessToast('Trader saved successfully.', 'Saved');
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Trader save failed',
          fallbackMessage: 'Failed to save trader.',
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canManagePartners) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partners</Text>
        </View>
        <View style={styles.lockedState}>
          <MaterialCommunityIcons name="shield-lock-outline" size={54} color={Colors.textSecondary} />
          <Text style={styles.lockedTitle}>Permission required</Text>
          <Text style={styles.lockedText}>You do not have access to manage trader master data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Trader Master</Text>
          <Text style={styles.headerSub}>Used by sale entry and settlement review</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [] : filteredTraders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            <View style={styles.summaryPanel}>
              <View>
                <Text style={styles.kicker}>MASTER DATA</Text>
                <Text style={styles.summaryTitle}>Traders</Text>
              </View>
              {loading ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.summaryCount}>{traders.length}</Text>}
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, phone, email"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trader Directory</Text>
              <TouchableOpacity style={styles.textAction} onPress={() => void loadTraders()}>
                <Text style={styles.textActionLabel}>Refresh</Text>
                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item: trader }) => (
          <View style={styles.partnerCard}>
              <View style={styles.avatarBox}>
                <MaterialCommunityIcons name="account-cash-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.partnerMain}>
                <Text style={styles.partnerName}>{trader.name}</Text>
                <Text style={styles.partnerMeta}>
                  {[trader.phone, trader.email].filter(Boolean).join(' | ') || 'No contact saved'}
                </Text>
                {trader.address ? <Text style={styles.partnerMeta}>{trader.address}</Text> : null}
              </View>
            </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={styles.listLoader} />
          ) : (
            <Text style={styles.emptyText}>No traders found.</Text>
          )
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Trader</Text>

            <Field control={control} name="name" label="Trader Name" error={errors.name?.message} placeholder="Mahadev Traders" />
            <Field control={control} name="phone" label="Phone" error={errors.phone?.message} placeholder="9876543210" keyboardType="phone-pad" />
            <Field control={control} name="email" label="Email" error={errors.email?.message} placeholder="trader@example.com" />
            <Field control={control} name="address" label="Address" error={errors.address?.message} placeholder="Ward 3, Rampura" />
            <Field control={control} name="notes" label="Notes" error={errors.notes?.message} placeholder="Optional notes" multiline />

            <TouchableOpacity style={[styles.submitBtn, saving && styles.submitBtnDisabled]} onPress={handleSubmit(handleAddTrader)} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Create Trader</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  control,
  name,
  label,
  error,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  control: ReturnType<typeof useForm<TraderFormData>>['control'];
  name: keyof TraderFormData;
  label: string;
  error?: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <>
          <Text style={styles.formLabel}>{label}</Text>
          <View style={[styles.inputBox, multiline && styles.textArea, error && { borderColor: Colors.tertiary }]}>
            <TextInput
              style={[styles.textInput, multiline && styles.multiLineInput]}
              placeholder={placeholder}
              placeholderTextColor={Colors.textSecondary}
              value={value}
              onChangeText={onChange}
              keyboardType={keyboardType}
              multiline={multiline}
            />
          </View>
          {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
        </>
      )}
    />
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
  },
  backBtn: {
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
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 110,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  messageText: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#E8F5E9',
    padding: 10,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
  },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerMain: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 3,
  },
  partnerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  listLoader: {
    marginVertical: 20,
  },
  lockedState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  inputBox: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 82,
    paddingTop: 10,
  },
  textInput: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  multiLineInput: {
    minHeight: 58,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#9DB8A8',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
