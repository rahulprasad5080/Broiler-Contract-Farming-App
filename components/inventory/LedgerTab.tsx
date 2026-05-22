import { SearchableSelectField, type SearchableSelectOption } from '@/components/ui/SearchableSelectField';
import { Colors } from '@/constants/Colors';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { styles } from './inventoryStyles';
import { ApiBatch, ApiCatalogItem, ApiInventoryLedgerEntry } from '@/services/managementApi';

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface LedgerTabProps {
  catalogItems: ApiCatalogItem[];
  batches: ApiBatch[];
  ledgerRows: ApiInventoryLedgerEntry[];
  ledgerCatalogItemId: string;
  setLedgerCatalogItemId: (id: string) => void;
  ledgerBatchId: string;
  setLedgerBatchId: (id: string) => void;
  ledgerVendorId: string;
  setLedgerVendorId: (id: string) => void;
  vendorOptions: SearchableSelectOption[];
  loadLedger: () => Promise<void>;
  loadingLedger: boolean;
  loadingBatches: boolean;
  labelize: (val: string) => string;
  formatQuantity: (val?: number | null, unit?: string | null) => string;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  catalogItems,
  batches,
  ledgerRows,
  ledgerCatalogItemId,
  setLedgerCatalogItemId,
  ledgerBatchId,
  setLedgerBatchId,
  ledgerVendorId,
  setLedgerVendorId,
  vendorOptions,
  loadLedger,
  loadingLedger,
  loadingBatches,
  labelize,
  formatQuantity,
}) => {
  const batchOptions = useMemo(
    () => [
      { label: "All Batches", value: "", description: "Show every batch" },
      ...batches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: batch.farmName ?? labelize(batch.status),
        keywords: `${batch.farmName ?? ""} ${batch.status} ${batch.id}`,
      })),
    ],
    [batches, labelize],
  );

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Stock Ledger Filters</Text>
        <Text style={styles.panelSubtitle}>
          Filter movement history by catalog item and optional batch.
        </Text>

        <Text style={styles.fieldLabel}>Catalog Item</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
          <TouchableOpacity
            style={[styles.chip, !ledgerCatalogItemId && styles.chipActive]}
            onPress={() => setLedgerCatalogItemId("")}
          >
            <Text style={[styles.chipText, !ledgerCatalogItemId && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {catalogItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, ledgerCatalogItemId === item.id && styles.chipActive]}
              onPress={() => setLedgerCatalogItemId(item.id)}
            >
              <Text style={[styles.chipText, ledgerCatalogItemId === item.id && styles.chipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SearchableSelectField
          label="Batch"
          value={ledgerBatchId}
          options={batchOptions}
          onSelect={setLedgerBatchId}
          placeholder={loadingBatches ? "Loading batches..." : "All Batches"}
          searchPlaceholder="Search batch or farm"
          emptyMessage="No batches found"
          disabled={loadingBatches}
        />

        <SearchableSelectField
          label="Vendor"
          value={ledgerVendorId}
          options={[{ label: "All Vendors", value: "", description: "Show every vendor" }, ...vendorOptions]}
          onSelect={setLedgerVendorId}
          placeholder="All Vendors"
          searchPlaceholder="Search vendor"
          emptyMessage="No vendors found"
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => void loadLedger()}
          disabled={loadingLedger}
        >
          {loadingLedger ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Load Ledger</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Ledger Movements</Text>
          {loadingLedger ? <ActivityIndicator color={Colors.primary} /> : null}
        </View>

        {ledgerRows.length ? (
          ledgerRows.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listMeta}>
                <Text style={styles.listTitle}>
                  {item.catalogItemName || item.catalogItemId}
                </Text>
                <Text style={styles.listSub}>
                  {[labelize(item.movementType), formatDate(item.movementDate), item.batchId]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {item.notes ? <Text style={styles.noteText}>{item.notes}</Text> : null}
              </View>
              <View style={styles.ledgerNumbers}>
                <Text style={styles.ledgerIn}>+{formatQuantity(item.quantityIn)}</Text>
                <Text style={styles.ledgerOut}>-{formatQuantity(item.quantityOut)}</Text>
                <Text style={styles.ledgerBalance}>
                  Bal {formatQuantity(item.balanceAfter)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No ledger rows loaded yet.</Text>
        )}
      </View>
    </>
  );
};
