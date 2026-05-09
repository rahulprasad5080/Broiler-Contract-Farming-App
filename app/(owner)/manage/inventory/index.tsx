import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getLocalDateValue } from '@/services/dateUtils';
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
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

const catalogSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['FEED', 'VACCINE', 'MEDICINE', 'OTHER']),
  unit: z.string().min(1, 'Unit is required'),
  manufacturer: z.string().optional(),
});

const costSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  category: z.enum([
    'FEED',
    'VACCINE',
    'MEDICINE',
    'OTHER',
    'CHICK_PURCHASE',
    'LABOUR',
    'UTILITIES',
    'TRANSPORT',
    'MAINTENANCE',
  ]),
  catalogItemId: z.string().optional(),
  costDate: z.string().min(1, 'Date is required'),
  amount: z.string().min(1, 'Amount is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  quantity: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  unitRate: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  notes: z.string().optional(),
});

type CatalogFormData = z.infer<typeof catalogSchema>;
type CostFormData = z.infer<typeof costSchema>;

const formatINR = (value?: number | null) => {
  if (value === null || value === undefined) return 'Rs 0';
  return `Rs ${Number(value).toLocaleString('en-IN')}`;
};

export default function InventoryScreen() {
  const { accessToken, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('catalog');
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);

  const [costs, setCosts] = useState<ApiCost[]>([]);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control: catalogControl, handleSubmit: handleCatalogSubmit, reset: resetCatalog, formState: { errors: catalogErrors } } = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      name: '',
      type: 'FEED',
      unit: '',
      manufacturer: '',
    },
  });

  const { control: costControl, handleSubmit: handleCostSubmit, setValue: setCostValue, watch: watchCost, formState: { errors: costErrors } } = useForm<CostFormData>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      batchId: '',
      category: 'FEED',
      catalogItemId: '',
      costDate: getLocalDateValue(),
      amount: '',
      quantity: '',
      unitRate: '',
      notes: '',
    },
  });

  const costBatchId = watchCost('batchId');

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
          setCostValue('catalogItemId', response.data[0].id);
        }
      } catch (err) {
        setError(
          showRequestErrorToast(err, {
            title: 'Unable to load catalog',
            fallbackMessage: 'Failed to load catalog items.',
          }),
        );
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, [accessToken, setCostValue]);

  const loadBatchCosts = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    if (!costBatchId.trim()) {
      setError('Enter a batch ID first.');
      return;
    }

    setLoadingCosts(true);
    setError(null);

    try {
      const response = await listBatchCosts(accessToken, costBatchId.trim());
      setCosts(response.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: 'Unable to load costs',
          fallbackMessage: 'Failed to load batch costs.',
        }),
      );
    } finally {
      setLoadingCosts(false);
    }
  };

  const submitCatalogItem = async (data: CatalogFormData) => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    setSavingCatalog(true);
    setError(null);

    try {
      const created = await createCatalogItem(accessToken, {
        name: data.name.trim(),
        type: data.type,
        unit: data.unit.trim(),
        manufacturer: data.manufacturer?.trim() || undefined,
      });

      setCatalogItems((prev) => [created, ...prev]);
      resetCatalog();
      setCostValue('catalogItemId', created.id);
      showSuccessToast('Catalog item created successfully.', 'Saved');
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: 'Catalog save failed',
        fallbackMessage: 'Failed to create catalog item.',
      });
      setError(msg);
    } finally {
      setSavingCatalog(false);
    }
  };

  const submitBatchCost = async (data: CostFormData) => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    setSavingCost(true);
    setError(null);

    try {
      const selectedCatalogItem =
        catalogItems.find((item) => item.id === data.catalogItemId) ?? null;
      const trimmedNotes = data.notes?.trim() || undefined;

      const created = await createBatchCost(accessToken, data.batchId.trim(), {
        category: data.category,
        catalogItemId: data.catalogItemId || undefined,
        expenseDate: data.costDate.trim(),
        description:
          selectedCatalogItem?.name ||
          trimmedNotes ||
          `${data.category.replaceAll('_', ' ')} expense`,
        quantity: data.quantity?.trim() ? Number(data.quantity) : undefined,
        unit: selectedCatalogItem?.unit || undefined,
        rate: data.unitRate?.trim() ? Number(data.unitRate) : undefined,
        totalAmount: Number(data.amount),
        notes: trimmedNotes,
        clientReferenceId: `inventory-${Date.now()}`,
      });

      setCosts((prev) => [created, ...prev]);
      setCostValue('amount', '');
      setCostValue('quantity', '');
      setCostValue('unitRate', '');
      setCostValue('notes', '');
      showSuccessToast('Batch cost created successfully.', 'Saved');
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: 'Cost save failed',
        fallbackMessage: 'Failed to create batch cost.',
      });
      setError(msg);
    } finally {
      setSavingCost(false);
    }
  };

  const openCostsForBatch = async () => {
    await loadBatchCosts();
    setActiveTab('costs');
  };

  const totalCost = costs.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

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

            <Controller
              control={catalogControl}
              name="name"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <View style={[styles.inputBox, catalogErrors.name && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Broiler Starter Feed"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  {catalogErrors.name && <Text style={styles.fieldErrorText}>{catalogErrors.name.message}</Text>}
                </>
              )}
            />

            <Controller
              control={catalogControl}
              name="type"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.chipRow}>
                    {CATALOG_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.chip, value === type && styles.chipActive]}
                        onPress={() => onChange(type)}
                      >
                        <Text style={[styles.chipText, value === type && styles.chipTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {catalogErrors.type && <Text style={styles.fieldErrorText}>{catalogErrors.type.message}</Text>}
                </>
              )}
            />

            <View style={styles.row}>
              <View style={[styles.flexHalf, styles.rowGap]}>
                <Controller
                  control={catalogControl}
                  name="unit"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.fieldLabel}>Unit</Text>
                      <View style={[styles.inputBox, catalogErrors.unit && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          placeholder="Bag / ml / kg"
                          placeholderTextColor={Colors.textSecondary}
                        />
                      </View>
                      {catalogErrors.unit && <Text style={styles.fieldErrorText}>{catalogErrors.unit.message}</Text>}
                    </>
                  )}
                />
              </View>
            </View>

            <Controller
              control={catalogControl}
              name="manufacturer"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Manufacturer</Text>
                  <View style={[styles.inputBox, catalogErrors.manufacturer && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={[styles.input, styles.multiLineInput]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional brand or manufacturer"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                    />
                  </View>
                  {catalogErrors.manufacturer && <Text style={styles.fieldErrorText}>{catalogErrors.manufacturer.message}</Text>}
                </>
              )}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleCatalogSubmit(submitCatalogItem)} disabled={savingCatalog}>
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
                      {item.manufacturer ? ` · ${item.manufacturer}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, watchCost('catalogItemId') === item.id && styles.smallBtnActive]}
                    onPress={() => {
                      setCostValue('catalogItemId', item.id);
                      setActiveTab('costs');
                    }}
                  >
                    <Text style={[styles.smallBtnText, watchCost('catalogItemId') === item.id && styles.smallBtnTextActive]}>
                      {watchCost('catalogItemId') === item.id ? 'Selected' : 'Select'}
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

            <Controller
              control={costControl}
              name="batchId"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Batch ID</Text>
                  <View style={[styles.inputBox, costErrors.batchId && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Batch ID"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  {costErrors.batchId && <Text style={styles.fieldErrorText}>{costErrors.batchId.message}</Text>}
                </>
              )}
            />

            <Controller
              control={costControl}
              name="category"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <View style={styles.chipRow}>
                    {COST_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[styles.chip, value === category && styles.chipActive]}
                        onPress={() => onChange(category)}
                      >
                        <Text style={[styles.chipText, value === category && styles.chipTextActive]}>{category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {costErrors.category && <Text style={styles.fieldErrorText}>{costErrors.category.message}</Text>}
                </>
              )}
            />

            <Controller
              control={costControl}
              name="catalogItemId"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Catalog Item</Text>
                  <View style={[styles.inputBox, costErrors.catalogItemId && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Catalog item ID"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  {costErrors.catalogItemId && <Text style={styles.fieldErrorText}>{costErrors.catalogItemId.message}</Text>}
                </>
              )}
            />

            <View style={styles.row}>
              <View style={[styles.flexHalf, styles.rowGap]}>
                <Controller
                  control={costControl}
                  name="costDate"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.fieldLabel}>Cost Date</Text>
                      <View style={[styles.inputBox, costErrors.costDate && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={Colors.textSecondary}
                        />
                      </View>
                      {costErrors.costDate && <Text style={styles.fieldErrorText}>{costErrors.costDate.message}</Text>}
                    </>
                  )}
                />
              </View>
              <View style={styles.flexHalf}>
                <Controller
                  control={costControl}
                  name="amount"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.fieldLabel}>Amount</Text>
                      <View style={[styles.inputBox, costErrors.amount && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          placeholder="0"
                          placeholderTextColor={Colors.textSecondary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {costErrors.amount && <Text style={styles.fieldErrorText}>{costErrors.amount.message}</Text>}
                    </>
                  )}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.flexHalf, styles.rowGap]}>
                <Controller
                  control={costControl}
                  name="quantity"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.fieldLabel}>Quantity</Text>
                      <View style={[styles.inputBox, costErrors.quantity && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          placeholder="Optional"
                          placeholderTextColor={Colors.textSecondary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {costErrors.quantity && <Text style={styles.fieldErrorText}>{costErrors.quantity.message}</Text>}
                    </>
                  )}
                />
              </View>
              <View style={styles.flexHalf}>
                <Controller
                  control={costControl}
                  name="unitRate"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.fieldLabel}>Unit Rate</Text>
                      <View style={[styles.inputBox, costErrors.unitRate && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          placeholder="Optional"
                          placeholderTextColor={Colors.textSecondary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {costErrors.unitRate && <Text style={styles.fieldErrorText}>{costErrors.unitRate.message}</Text>}
                    </>
                  )}
                />
              </View>
            </View>

            <Controller
              control={costControl}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Notes</Text>
                  <View style={[styles.inputBox, styles.textArea, costErrors.notes && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={[styles.input, styles.multiLineInput]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional notes"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                    />
                  </View>
                  {costErrors.notes && <Text style={styles.fieldErrorText}>{costErrors.notes.message}</Text>}
                </>
              )}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleCostSubmit(submitBatchCost)} disabled={savingCost}>
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
                      {item.expenseDate}
                      {item.clientReferenceId ? ` · ${item.clientReferenceId}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.costAmount}>{canSeeCost ? formatINR(item.totalAmount) : 'Hidden'}</Text>
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
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
