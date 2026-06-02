import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DatePickerField } from '@/components/ui/DatePickerField';
import { ScreenState } from '@/components/ui/ScreenState';
import { SearchableSelectField } from '@/components/ui/SearchableSelectField';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import {
  createLegacyBatchCost,
  fetchBatch,
  listAllBatches,
  listAllVendors,
  listCatalogItems,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiCatalogItem,
  type ApiExpenseCategoryCode,
  type ApiVendor,
} from '@/services/managementApi';

const THEME_GREEN = '#0B5C36';

type CostFormState = {
  ledger: ApiBatchExpense['ledger'];
  catalogItemId: string;
  vendorId: string;
  category: string;
  expenseDate: string;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  totalAmount: string;
  invoiceNumber: string;
  notes: string;
};

function createDefaultForm(ledger: ApiBatchExpense['ledger'] = 'COMPANY'): CostFormState {
  return {
    ledger,
    catalogItemId: '',
    vendorId: '',
    category: '',
    expenseDate: getLocalDateValue(),
    description: '',
    quantity: '',
    unit: '',
    rate: '',
    totalAmount: '',
    invoiceNumber: '',
    notes: '',
  };
}

function toOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function labelize(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function BatchCostCreateScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { batchId: routeBatchId, ledger, lockBatch } = useLocalSearchParams<{
    batchId?: string;
    ledger?: string;
    lockBatch?: string;
  }>();
  const initialLedger = ledger === 'FARMER' ? 'FARMER' : 'COMPANY';
  const shouldLockBatch = lockBatch === '1';
  const [selectedBatchId, setSelectedBatchId] = useState(routeBatchId ?? '');
  const [batch, setBatch] = useState<ApiBatch | null>(null);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [form, setForm] = useState<CostFormState>(() => createDefaultForm(initialLedger));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBatch = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setErrorMessage(null);
      const [batchesResponse, vendorsResponse, catalogResponse] = await Promise.all([
        listAllBatches(accessToken),
        listAllVendors(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setBatches(batchesResponse.data ?? []);
      setVendors(vendorsResponse.data ?? []);
      setCatalogItems((catalogResponse.data ?? []).filter((item) => item.isActive !== false));

      const effectiveBatchId =
        selectedBatchId ||
        routeBatchId ||
        batchesResponse.data.find((item) => item.status === 'ACTIVE' || item.status === 'SALES_RUNNING')?.id ||
        batchesResponse.data[0]?.id ||
        '';

      if (effectiveBatchId && effectiveBatchId !== selectedBatchId) {
        setSelectedBatchId(effectiveBatchId);
      }

      if (effectiveBatchId) {
        const response = await fetchBatch(accessToken, effectiveBatchId);
        setBatch(response);
      } else {
        setBatch(null);
      }
    } catch (error) {
      setErrorMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load batch',
          fallbackMessage: 'Failed to load batch details.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, routeBatchId, selectedBatchId]);

  const vendorOptions = React.useMemo(
    () =>
      vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.phone, vendor.email, vendor.address].filter(Boolean).join(' '),
      })),
    [vendors],
  );

  const catalogOptions = React.useMemo(
    () =>
      catalogItems.map((item) => ({
        label: item.name,
        value: item.id,
        description: `${item.type} - ${item.unit}`,
        keywords: [item.sku, item.type, item.unit].filter(Boolean).join(' '),
      })),
    [catalogItems],
  );

  const selectedVendor = vendors.find((vendor) => vendor.id === form.vendorId);
  const batchOptions = React.useMemo(
    () =>
      batches.map((item) => ({
        label: item.code,
        value: item.id,
        description: item.farmName ?? undefined,
        keywords: `${item.farmName ?? ''} ${item.status}`,
      })),
    [batches],
  );

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  const updateForm = (key: keyof CostFormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'quantity' || key === 'rate') {
        const quantity = Number(key === 'quantity' ? value : current.quantity);
        const rate = Number(key === 'rate' ? value : current.rate);
        if (quantity > 0 && rate > 0) {
          next.totalAmount = String(quantity * rate);
        }
      }
      return next;
    });
  };

  const selectCatalogItem = (value: string) => {
    updateForm('catalogItemId', value);
    const selectedItem = catalogItems.find((item) => item.id === value);
    if (!selectedItem) return;
    setForm((current) => ({
      ...current,
      catalogItemId: value,
      unit: selectedItem.unit ?? current.unit,
      rate:
        selectedItem.defaultRate !== undefined && selectedItem.defaultRate !== null
          ? String(selectedItem.defaultRate)
          : current.rate,
    }));
  };

  const submitCost = async () => {
    if (!accessToken || !selectedBatchId || submitting) return;
    if (!form.category.trim() || !form.expenseDate.trim() || !form.totalAmount.trim()) {
      showRequestErrorToast(new Error('Category, date, and total amount are required.'), {
        title: 'Cost details missing',
      });
      return;
    }

    setSubmitting(true);
    try {
      await createLegacyBatchCost(accessToken, selectedBatchId, {
        ledger: form.ledger,
        catalogItemId: toOptionalText(form.catalogItemId),
        vendorId: toOptionalText(form.vendorId),
        category: form.category.trim() as ApiExpenseCategoryCode,
        expenseDate: form.expenseDate,
        description: toOptionalText(form.description) || form.category.trim(),
        quantity: toOptionalNumber(form.quantity),
        unit: toOptionalText(form.unit),
        rate: toOptionalNumber(form.rate),
        totalAmount: Number(form.totalAmount),
        vendorName: selectedVendor?.name,
        invoiceNumber: toOptionalText(form.invoiceNumber),
        notes: toOptionalText(form.notes),
        clientReferenceId: `cost-${Date.now()}`,
      });

      showSuccessToast('Cost created successfully.');
      router.back();
    } catch (error) {
      showRequestErrorToast(error, { title: 'Cost create failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Create Cost"
        subtitle={batch?.code ? `${batch.code} | ${batch.farmName ?? 'Farm'}` : 'Batch cost entry'}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.stateWrap}>
          <ScreenState title="Loading batch" message="Preparing cost form." loading />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateWrap}>
          <ScreenState
            title="Unable to load batch"
            message={errorMessage}
            tone="error"
            icon="cloud-offline-outline"
            actionLabel="Retry"
            onAction={() => void loadBatch()}
          />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.batchCard}>
              <View>
                <Text style={styles.batchLabel}>Batch</Text>
                <Text style={styles.batchTitle}>{batch?.code ?? (selectedBatchId || 'Select batch')}</Text>
                <Text style={styles.batchMeta}>{batch?.farmName ?? 'Farm not loaded'}</Text>
              </View>
              <Ionicons name="calculator-outline" size={24} color={THEME_GREEN} />
            </View>

            <SearchableSelectField
              label="Batch"
              value={selectedBatchId}
              options={batchOptions}
              onSelect={(value) => {
                setSelectedBatchId(value);
                const selected = batches.find((item) => item.id === value) ?? null;
                setBatch(selected);
              }}
              placeholder="Select batch"
              searchPlaceholder="Search batch or farm"
              emptyMessage="No batches found"
              locked={shouldLockBatch}
            />

            <View style={styles.ledgerToggle}>
              {(['COMPANY', 'FARMER'] as const).map((item) => {
                const active = form.ledger === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.ledgerButton, active && styles.ledgerButtonActive]}
                    onPress={() => updateForm('ledger', item)}
                  >
                    <Text style={[styles.ledgerText, active && styles.ledgerTextActive]}>{labelize(item)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.row}>
              <InputField label="Category" value={form.category} onChangeText={(value) => updateForm('category', value)} required />
              <DatePickerField
                label="Cost Date *"
                value={form.expenseDate}
                onChange={(value) => updateForm('expenseDate', value)}
                disableFuture
              />
            </View>

            <InputField label="Description" value={form.description} onChangeText={(value) => updateForm('description', value)} />

            <SearchableSelectField
              label="Catalog Item"
              value={form.catalogItemId}
              options={[{ label: 'No catalog item', value: '' }, ...catalogOptions]}
              onSelect={selectCatalogItem}
              placeholder="Optional catalog item"
              searchPlaceholder="Search catalog item"
              emptyMessage="No catalog items found"
            />

            <SearchableSelectField
              label="Vendor"
              value={form.vendorId}
              options={[{ label: 'No vendor', value: '' }, ...vendorOptions]}
              onSelect={(value) => updateForm('vendorId', value)}
              placeholder="Optional vendor"
              searchPlaceholder="Search vendor"
              emptyMessage="No vendors found"
            />

            <View style={styles.row}>
              <InputField
                label="Quantity"
                value={form.quantity}
                onChangeText={(value) => updateForm('quantity', value)}
                keyboardType="decimal-pad"
              />
              <InputField label="Unit" value={form.unit} onChangeText={(value) => updateForm('unit', value)} />
            </View>

            <View style={styles.row}>
              <InputField label="Rate" value={form.rate} onChangeText={(value) => updateForm('rate', value)} keyboardType="decimal-pad" />
              <InputField
                label="Total Amount"
                value={form.totalAmount}
                onChangeText={(value) => updateForm('totalAmount', value)}
                keyboardType="decimal-pad"
                required
              />
            </View>

            <InputField label="Invoice Number" value={form.invoiceNumber} onChangeText={(value) => updateForm('invoiceNumber', value)} />

            <InputField label="Notes" value={form.notes} onChangeText={(value) => updateForm('notes', value)} multiline />

            <TouchableOpacity style={[styles.submitButton, submitting && styles.disabled]} onPress={submitCost} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Save Cost</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad' | 'url';
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={keyboardType === 'url' ? 'none' : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  stateWrap: {
    padding: 16,
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  batchTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  batchMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  ledgerToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  ledgerButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ledgerButtonActive: {
    backgroundColor: THEME_GREEN,
  },
  ledgerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  ledgerTextActive: {
    color: '#FFF',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
    minWidth: 0,
    marginBottom: 12,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  required: {
    color: Colors.tertiary,
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    paddingHorizontal: 11,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 90,
    paddingTop: 11,
    textAlignVertical: 'top',
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: THEME_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
