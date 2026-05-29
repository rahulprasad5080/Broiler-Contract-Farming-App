import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SearchableSelectField, type SearchableSelectOption } from '@/components/ui/SearchableSelectField';
import { Colors } from '@/constants/Colors';
import { styles } from './inventoryStyles';
import { ApiBatch, ApiFinancePurchase, ApiVendor } from '@/services/managementApi';

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

interface PurchasesTabProps {
  purchases: ApiFinancePurchase[];
  batches: ApiBatch[];
  vendors: ApiVendor[];
  filterBatchId: string;
  setFilterBatchId: (id: string) => void;
  filterVendorId: string;
  setFilterVendorId: (id: string) => void;
  vendorOptions: SearchableSelectOption[];
  loadPurchases: () => Promise<void>;
  loadingPurchases: boolean;
  loadingBatches: boolean;
  labelize: (val: string) => string;
  formatQuantity: (val?: number | null, unit?: string | null) => string;
  formatINR: (val?: number | null) => string;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({
  purchases,
  batches,
  vendors,
  filterBatchId,
  setFilterBatchId,
  filterVendorId,
  setFilterVendorId,
  vendorOptions,
  loadPurchases,
  loadingPurchases,
  loadingBatches,
  labelize,
  formatQuantity,
  formatINR,
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
        <Text style={styles.panelTitle}>Purchase Filters</Text>
        <Text style={styles.panelSubtitle}>
          Filter stock purchases by batch and vendor.
        </Text>

        <SearchableSelectField
          label="Batch"
          value={filterBatchId}
          options={batchOptions}
          onSelect={setFilterBatchId}
          placeholder={loadingBatches ? "Loading batches..." : "All Batches"}
          searchPlaceholder="Search batch or farm"
          emptyMessage="No batches found"
          disabled={loadingBatches}
        />

        <SearchableSelectField
          label="Vendor"
          value={filterVendorId}
          options={[{ label: "All Vendors", value: "", description: "Show every vendor" }, ...vendorOptions]}
          onSelect={setFilterVendorId}
          placeholder="All Vendors"
          searchPlaceholder="Search vendor"
          emptyMessage="No vendors found"
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => void loadPurchases()}
          disabled={loadingPurchases}
        >
          {loadingPurchases ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Load Purchases</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Purchase History</Text>
          {loadingPurchases ? <ActivityIndicator color={Colors.primary} /> : null}
        </View>

        {purchases.length ? (
          purchases.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listMeta}>
                <Text style={styles.listTitle}>
                  {item.itemName}
                </Text>
                <Text style={styles.listSub}>
                  {[
                    labelize(item.purchaseType),
                    formatDate(item.purchaseDate),
                    item.invoiceNumber ? `Inv: ${item.invoiceNumber}` : ""
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                <Text style={styles.noteText}>
                  {[
                    item.vendorName || "Unknown Vendor",
                    item.quantity ? `Qty: ${formatQuantity(item.quantity, item.unit)}` : "",
                    item.unitCost ? `@ ${formatINR(item.unitCost)}` : ""
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {item.remarks ? (
                  <Text style={[styles.noteText, { fontStyle: "italic", marginTop: 4 }]}>
                    Note: {item.remarks}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text style={styles.amountText}>
                  {formatINR(item.totalAmount)}
                </Text>
                <View
                  style={{
                    marginTop: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: item.paymentStatus === 'PAID' ? '#E8F5E9' : item.paymentStatus === 'PARTIAL' ? '#FFF3E0' : '#FFEBEE',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: item.paymentStatus === 'PAID' ? '#2E7D32' : item.paymentStatus === 'PARTIAL' ? '#EF6C00' : '#C62828',
                    }}
                  >
                    {labelize(item.paymentStatus)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No purchases loaded yet.</Text>
        )}
      </View>
    </>
  );
};
