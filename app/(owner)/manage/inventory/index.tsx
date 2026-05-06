import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
import Toast from 'react-native-toast-message';
import {
  createBatchCost,
  createCatalogItem,
  listBatchCosts,
  listCatalogItems,
  type ApiCatalogItem,
  type ApiCatalogItemType,
  type ApiCost,
  type ApiCostCategory,
} from '@/services/managementApi';

type TabKey = 'catalog' | 'costs';

const CATALOG_TYPES: ApiCatalogItemType[] = ['FEED', 'VACCINE', 'MEDICINE', 'OTHER'];
const COST_CATEGORIES: ApiCostCategory[] = [
  'FEED',
  'VACCINE',
  'MEDICINE',
  'OTHER',
  'CHICK_PURCHASE',
  'LABOUR',
  'UTILITIES',
  'TRANSPORT',
  'MAINTENANCE',
];

const formatINR = (value?: number | null) => {
  if (value === null || value === undefined) return 'Rs 0';
  return `Rs ${Number(value).toLocaleString('en-IN')}`;
};

export default function InventoryScreen() {
  const { accessToken, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('catalog');
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [selectedCatalogType, setSelectedCatalogType] = useState<ApiCatalogItemType>('FEED');
  const [catalogName, setCatalogName] = useState('');
  const [catalogUnit, setCatalogUnit] = useState('');
  const [catalogDescription, setCatalogDescription] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);

  const [batchId, setBatchId] = useState('');
  const [costs, setCosts] = useState<ApiCost[]>([]);
  const [selectedCostCategory, setSelectedCostCategory] = useState<ApiCostCategory>('FEED');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
  const [costDate, setCostDate] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [costNotes, setCostNotes] = useState('');
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSeeCost = hasPermission('view:inventory-cost');

  useEffect(() => {
    const loadCatalog = async () => {
      if (!accessToken) {
        setError('Missing access token. Please sign in again.');
        return;
      }

      setCatalogLoading(true);
      setError(null);

      try {
        const response = await listCatalogItems(accessToken, { limit: 50 });
        setCatalogItems(response.data);
        if (response.data.length > 0) {
          setSelectedCatalogItemId((current) => current || response.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load catalog items.');
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, [accessToken]);

  const loadBatchCosts = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    if (!batchId.trim()) {
      setError('Enter a batch ID first.');
      return;
    }

    setLoadingCosts(true);
    setError(null);

    try {
      const response = await listBatchCosts(accessToken, batchId.trim());
      setCosts(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch costs.');
    } finally {
      setLoadingCosts(false);
    }
  };

  const submitCatalogItem = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    if (!catalogName.trim()) {
      setError('Catalog item name is required.');
      return;
    }

    setSavingCatalog(true);
    setError(null);

    try {
      const created = await createCatalogItem(accessToken, {
        name: catalogName.trim(),
        type: selectedCatalogType,
        unit: catalogUnit.trim() || undefined,
        description: catalogDescription.trim() || undefined,
        isActive: true,
      });

      setCatalogItems((prev) => [created, ...prev]);
      setCatalogName('');
      setCatalogUnit('');
      setCatalogDescription('');
      setSelectedCatalogItemId(created.id);
      Toast.show({type: 'success', text1: 'Saved', text2: 'Catalog item created successfully.',
  position: 'bottom'});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create catalog item.';
      setError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg,
  position: 'bottom'});
    } finally {
      setSavingCatalog(false);
    }
  };

  const submitBatchCost = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    if (!batchId.trim()) {
      setError('Batch ID is required.');
      return;
    }

    if (!costDate.trim() || !amount.trim()) {
      setError('Cost date and amount are required.');
      return;
    }

    setSavingCost(true);
    setError(null);

    try {
      const created = await createBatchCost(accessToken, batchId.trim(), {
        category: selectedCostCategory,
        catalogItemId: selectedCatalogItemId || undefined,
        costDate: costDate.trim(),
        amount: Number(amount),
        quantity: quantity.trim() ? Number(quantity) : undefined,
        unitRate: unitRate.trim() ? Number(unitRate) : undefined,
        notes: costNotes.trim() || undefined,
        clientReferenceId: `inventory-${Date.now()}`,
      });

      setCosts((prev) => [created, ...prev]);
      setAmount('');
      setQuantity('');
      setUnitRate('');
      setCostNotes('');
      Toast.show({type: 'success', text1: 'Saved', text2: 'Batch cost created successfully.',
  position: 'bottom'});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create batch cost.';
      setError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg,
  position: 'bottom'});
    } finally {
      setSavingCost(false);
    }
  };

  const openCostsForBatch = async () => {
    await loadBatchCosts();
    setActiveTab('costs');
  };

  const totalCost = costs.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Inventory master data</Text>
          <Text style={styles.headerTitle}>Catalog and Costs</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialCommunityIcons name="archive-cog-outline" size={20} color={Colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Catalog Items</Text>
            <Text style={styles.statValue}>{catalogLoading ? '...' : catalogItems.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Loaded Costs</Text>
            <Text style={styles.statValue}>{loadingCosts ? '...' : costs.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Cost</Text>
            <Text style={styles.statValue}>{canSeeCost ? formatINR(totalCost) : 'Hidden'}</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {([
            { key: 'catalog', label: 'Catalog' },
            { key: 'costs', label: 'Costs' },
          ] as { key: TabKey; label: string }[]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'catalog' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Create Catalog Item</Text>
              {catalogLoading ? <ActivityIndicator color={Colors.primary} /> : null}
            </View>

            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={catalogName}
                onChangeText={setCatalogName}
                placeholder="Broiler Starter Feed"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipRow}>
              {CATALOG_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selectedCatalogType === type && styles.chipActive]}
                  onPress={() => setSelectedCatalogType(type)}
                >
                  <Text style={[styles.chipText, selectedCatalogType === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={[styles.flexHalf, styles.rowGap]}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={catalogUnit}
                    onChangeText={setCatalogUnit}
                    placeholder="Bag / ml / kg"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <View style={[styles.inputBox, styles.textArea]}>
              <TextInput
                style={[styles.input, styles.multiLineInput]}
                value={catalogDescription}
                onChangeText={setCatalogDescription}
                placeholder="Optional item details"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={submitCatalogItem} disabled={savingCatalog}>
              {savingCatalog ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save Catalog Item</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {activeTab === 'catalog' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Catalog List</Text>
              <TouchableOpacity onPress={() => void openCostsForBatch()}>
                <Text style={styles.linkText}>Use selected item</Text>
              </TouchableOpacity>
            </View>

            {catalogLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : catalogItems.length ? (
              catalogItems.map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <View style={styles.listMeta}>
                    <Text style={styles.listTitle}>{item.name}</Text>
                    <Text style={styles.listSub}>
                      {item.type}
                      {item.unit ? ` · ${item.unit}` : ''}
                      {item.description ? ` · ${item.description}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, selectedCatalogItemId === item.id && styles.smallBtnActive]}
                    onPress={() => {
                      setSelectedCatalogItemId(item.id);
                      setActiveTab('costs');
                    }}
                  >
                    <Text style={[styles.smallBtnText, selectedCatalogItemId === item.id && styles.smallBtnTextActive]}>
                      {selectedCatalogItemId === item.id ? 'Selected' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No catalog items found yet.</Text>
            )}
          </View>
        ) : null}

        {activeTab === 'costs' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Batch Cost Entry</Text>
            <Text style={styles.panelSubtitle}>Enter a batch ID, choose a category, and save the cost line.</Text>

            <Text style={styles.fieldLabel}>Batch ID</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={batchId}
                onChangeText={setBatchId}
                placeholder="Batch ID"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {COST_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.chip, selectedCostCategory === category && styles.chipActive]}
                  onPress={() => setSelectedCostCategory(category)}
                >
                  <Text style={[styles.chipText, selectedCostCategory === category && styles.chipTextActive]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Catalog Item</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={selectedCatalogItemId}
                onChangeText={setSelectedCatalogItemId}
                placeholder="Catalog item ID"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.flexHalf, styles.rowGap]}>
                <Text style={styles.fieldLabel}>Cost Date</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={costDate}
                    onChangeText={setCostDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </View>
              <View style={styles.flexHalf}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.flexHalf, styles.rowGap]}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="Optional"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={styles.flexHalf}>
                <Text style={styles.fieldLabel}>Unit Rate</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={unitRate}
                    onChangeText={setUnitRate}
                    placeholder="Optional"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <View style={[styles.inputBox, styles.textArea]}>
              <TextInput
                style={[styles.input, styles.multiLineInput]}
                value={costNotes}
                onChangeText={setCostNotes}
                placeholder="Optional notes"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={submitBatchCost} disabled={savingCost}>
              {savingCost ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save Batch Cost</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => void loadBatchCosts()} disabled={loadingCosts}>
              {loadingCosts ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.secondaryBtnText}>Load Costs for Batch</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {activeTab === 'costs' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Recent Batch Costs</Text>
              {loadingCosts ? <ActivityIndicator color={Colors.primary} /> : null}
            </View>

            {costs.length ? (
              costs.map((item) => (
                <View key={item.id} style={styles.costRow}>
                  <View style={styles.listMeta}>
                    <Text style={styles.listTitle}>{item.category}</Text>
                    <Text style={styles.listSub}>
                      {item.costDate}
                      {item.clientReferenceId ? ` · ${item.clientReferenceId}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.costAmount}>{canSeeCost ? formatINR(item.amount) : 'Hidden'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No costs loaded for this batch yet.</Text>
            )}
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerEyebrow: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: Layout.screenPadding,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  errorText: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFF4F4',
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: '#FECACA',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    ...Layout.cardShadow,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  panel: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  panelSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  fieldLabel: {
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
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  input: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  textArea: {
    minHeight: 76,
    paddingTop: 10,
    paddingBottom: 10,
  },
  multiLineInput: {
    textAlignVertical: 'top',
    minHeight: 56,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flexHalf: {
    flex: 1,
  },
  rowGap: {
    marginRight: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FFF',
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  listMeta: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  listSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  smallBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  smallBtnTextActive: {
    color: Colors.primary,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingVertical: 10,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  costAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
});
