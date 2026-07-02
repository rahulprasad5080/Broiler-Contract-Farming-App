import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  ApiTrader,
  ApiVendor,
  createTrader,
  createVendor,
  updateTrader,
  updateVendor,
  listAllTraders,
  listAllVendors,
} from '@/services/managementApi';

type PartnerTab = 'vendors' | 'traders';
type PartnerRecord = ApiVendor | ApiTrader;

export default function PartnerManagementScreen() {
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [activeTab, setActiveTab] = useState<PartnerTab>('vendors');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canManagePartners = hasPermission('manage:partners');

  const loadPartners = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setMessage(null);
    try {
      const [vendorsRes, tradersRes] = await Promise.all([
        listAllVendors(accessToken),
        listAllTraders(accessToken),
      ]);
      setVendors(vendorsRes.data);
      setTraders(tradersRes.data);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load partners',
          fallbackMessage: 'Failed to load vendor and trader masters.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadPartners();
    }, [loadPartners]),
  );

  const currentPartners = activeTab === 'vendors' ? vendors : traders;
  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return currentPartners;

    return currentPartners.filter(
      (partner) =>
        partner.name.toLowerCase().includes(query) ||
        (partner.phone ?? '').includes(query),
    );
  }, [currentPartners, search]);

  const handleOpenAdd = () => {
    router.push({
      pathname: '/(owner)/manage/partners/createupdate',
      params: { partnerKind: activeTab === 'vendors' ? 'vendor' : 'trader' },
    });
  };

  const handleOpenEdit = (partner: PartnerRecord) => {
    router.push({
      pathname: '/(owner)/manage/partners/createupdate',
      params: {
        partnerKind: activeTab === 'vendors' ? 'vendor' : 'trader',
        id: partner.id,
      },
    });
  };

  if (!canManagePartners) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Partners" subtitle="Permission required" onBack={() => router.replace('/(owner)/profile')} />
        <View style={styles.lockedState}>
          <ScreenState
            title="Permission required"
            message="You do not have access to manage partner master data."
            icon="shield-outline"
            tone="error"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Partner Master"
        subtitle="Vendors for purchases, traders for sales"
        onBack={() => router.replace('/(owner)/profile')}
        right={
          <TouchableOpacity style={styles.headerAction} onPress={handleOpenAdd}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={loading ? [] : filteredPartners}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            <View style={styles.summaryPanel}>
              <View>
                <Text style={styles.kicker}>MASTER DATA</Text>
                <Text style={styles.summaryTitle}>{activeTab === 'vendors' ? 'Vendors' : 'Traders'}</Text>
              </View>
              {loading ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.summaryCount}>{currentPartners.length}</Text>}
            </View>

            <View style={styles.tabRow}>
              {(['vendors', 'traders'] as PartnerTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                  onPress={() => {
                    setActiveTab(tab);
                    setSearch('');
                  }}
                >
                  <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                    {tab === 'vendors' ? 'Vendors' : 'Traders'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, phone"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeTab === 'vendors' ? 'Vendor Directory' : 'Trader Directory'}
              </Text>
              <TouchableOpacity style={styles.textAction} onPress={() => void loadPartners()}>
                <Text style={styles.textActionLabel}>Refresh</Text>
                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item: partner }) => (
          <View style={styles.partnerCard}>
              <View style={styles.avatarBox}>
                <MaterialCommunityIcons
                  name={activeTab === 'vendors' ? 'truck-outline' : 'account-cash-outline'}
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.partnerMain}>
                <Text style={styles.partnerName}>{partner.name}</Text>
                <Text style={styles.partnerMeta}>
                  {partner.phone || 'No contact saved'}
                </Text>
                {partner.address ? <Text style={styles.partnerMeta}>{partner.address}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleOpenEdit(partner)} style={styles.editBtn}>
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ScreenState title="Loading partners" message="Fetching vendor and trader master data." loading />
          ) : (
            <ScreenState
              title={`No ${activeTab === 'vendors' ? 'vendors' : 'traders'} found`}
              message={`Create a ${activeTab === 'vendors' ? 'vendor' : 'trader'} to use in ${activeTab === 'vendors' ? 'purchases and payments' : 'sales and receipts'}.`}
              icon="people-outline"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.sm,
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFF',
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
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B7E0C2',
    backgroundColor: '#E7F5ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
