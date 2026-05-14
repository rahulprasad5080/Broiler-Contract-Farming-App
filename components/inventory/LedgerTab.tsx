import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { styles } from './inventoryStyles';
import { ApiCatalogItem, ApiInventoryLedgerEntry } from '@/services/managementApi';

interface LedgerTabProps {
  catalogItems: ApiCatalogItem[];
  ledgerRows: ApiInventoryLedgerEntry[];
  ledgerCatalogItemId: string;
  setLedgerCatalogItemId: (id: string) => void;
  ledgerBatchId: string;
  setLedgerBatchId: (id: string) => void;
  loadLedger: () => Promise<void>;
  loadingLedger: boolean;
  labelize: (val: string) => string;
  formatQuantity: (val?: number | null, unit?: string | null) => string;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  catalogItems,
  ledgerRows,
  ledgerCatalogItemId,
  setLedgerCatalogItemId,
  ledgerBatchId,
  setLedgerBatchId,
  loadLedger,
  loadingLedger,
  labelize,
  formatQuantity,
}) => {
  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Stock Ledger Filters</Text>
        <Text style={styles.panelSubtitle}>
          Filter movement history by catalog item and optional batch ID.
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

        <Text style={styles.fieldLabel}>Batch ID</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={ledgerBatchId}
            onChangeText={setLedgerBatchId}
            placeholder="Optional batch ID"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

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
                  {[labelize(item.movementType), item.movementDate, item.batchId]
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
