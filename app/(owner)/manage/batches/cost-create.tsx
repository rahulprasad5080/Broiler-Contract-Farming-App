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
import { useMasterDataTypeOptions } from '@/hooks/useMasterDataTypeOptions';
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

  const {
    selectOptions: categoryOptions,
    loading: loadingCategories,
    errorMessage: categoryError,
  } = useMasterDataTypeOptions('EXPENSE_CATEGORY');

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

  useEffect(() => {
    if (!form.category && categoryOptions.length > 0) {
      updateForm('category', categoryOptions[0].value);
    }
  }, [categoryOptions, form.category]);

  const updateForm = (key: keyof CostFormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'quantity' || key === 'rate') {
        const quantity = Number(key === 'quantity' ? value : current.quantity);
        const rate = Number(key === 'rate' ? value : current.rate);
        if (!isNaN(quantity) && !isNaN(rate) && quantity > 0 && rate > 0) {
          next.totalAmount = String(Number((quantity * rate).toFixed(2)));
        } else {
          next.totalAmount = '0';
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
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {batch ? (
              <View style={styles.batchInfoBox}>
                <Text style={styles.batchInfoLabel}>Current Batch Details</Text>
                <Text style={styles.batchInfoValue}>{batch.code} | {batch.farmName ?? 'Farm'}</Text>
              </View>
            ) : null}

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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ledger Type</Text>
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
            </View>

            <DatePickerField
              label="Cost Date *"
              value={form.expenseDate}
              onChange={(value) => updateForm('expenseDate', value)}
              disableFuture
            />

            <SearchableSelectField
              label="Category"
              value={form.category}
              options={categoryOptions}
              onSelect={(value) => updateForm('category', value)}
              placeholder={loadingCategories ? 'Loading categories...' : 'Select category'}
              searchPlaceholder="Search category"
              emptyMessage="No categories found"
              error={categoryError || undefined}
              disabled={loadingCategories}
              required
            />

            <InputField
              label="Description"
              value={form.description}
              onChangeText={(value) => updateForm('description', value)}
            />

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

            <InputField
              label="Quantity"
              value={form.quantity}
              onChangeText={(value) => updateForm('quantity', value)}
              keyboardType="decimal-pad"
            />

            <InputField
              label="Unit"
              value={form.unit}
              onChangeText={(value) => updateForm('unit', value)}
            />

            <InputField
              label="Rate"
              value={form.rate}
              onChangeText={(value) => updateForm('rate', value)}
              keyboardType="decimal-pad"
            />

            {/* Total Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Total Amount (₹)</Text>
              <Text style={styles.totalAmountText}>₹ {Number(form.totalAmount || 0).toLocaleString('en-IN')}</Text>
              {parseFloat(form.quantity) > 0 && parseFloat(form.rate) > 0 ? (
                <Text style={styles.calculationBreakdown}>
                  Calculated as: {form.quantity} qty × ₹{form.rate}
                </Text>
              ) : null}
            </View>

            <InputField
              label="Invoice Number"
              value={form.invoiceNumber}
              onChangeText={(value) => updateForm('invoiceNumber', value)}
            />

            <InputField
              label="Notes"
              value={form.notes}
              onChangeText={(value) => updateForm('notes', value)}
              multiline
            />

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
    backgroundColor: '#FFF',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  stateWrap: {
    padding: 16,
  },
  batchInfoBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  batchInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  batchInfoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B5C36',
  },
  ledgerToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
  },
  ledgerButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerButtonActive: {
    backgroundColor: THEME_GREEN,
  },
  ledgerText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  ledgerTextActive: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: Colors.tertiary,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0B5C36',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  totalAmountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B5C36',
    marginTop: 4,
  },
  calculationBreakdown: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
});
