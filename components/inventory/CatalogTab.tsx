import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Controller, Control, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { Colors } from '@/constants/Colors';
import { styles } from './inventoryStyles';
import { CatalogFormData, CATALOG_TYPES } from './inventoryTypes';
import { ApiCatalogItem } from '@/services/managementApi';

interface CatalogTabProps {
  catalogControl: Control<CatalogFormData>;
  catalogErrors: FieldErrors<CatalogFormData>;
  handleCatalogSubmit: UseFormHandleSubmit<CatalogFormData>;
  submitCatalogItem: (data: CatalogFormData) => Promise<void>;
  savingCatalog: boolean;
  loadingCatalog: boolean;
  catalogItems: ApiCatalogItem[];
  loadCatalog: () => Promise<void>;
  labelize: (val: string) => string;
  formatQuantity: (val?: number | null, unit?: string | null) => string;
  selectedExpenseItemId?: string;
  setExpenseValue: (name: any, value: any) => void;
  setLedgerCatalogItemId: (id: string) => void;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  catalogControl,
  catalogErrors,
  handleCatalogSubmit,
  submitCatalogItem,
  savingCatalog,
  loadingCatalog,
  catalogItems,
  loadCatalog,
  labelize,
  formatQuantity,
  selectedExpenseItemId,
  setExpenseValue,
  setLedgerCatalogItemId,
}) => {
  return (
    <>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Create Catalog Item</Text>
          {loadingCatalog ? <ActivityIndicator color={Colors.primary} /> : null}
        </View>

        <Controller
          control={catalogControl}
          name="name"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Name</Text>
              <View style={[styles.inputBox, catalogErrors.name && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Starter Feed"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              {catalogErrors.name ? (
                <Text style={styles.fieldErrorText}>{catalogErrors.name.message}</Text>
              ) : null}
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
                    <Text style={[styles.chipText, value === type && styles.chipTextActive]}>
                      {labelize(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        />

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Controller
              control={catalogControl}
              name="unit"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <View style={[styles.inputBox, catalogErrors.unit && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="kg / bag / ml"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  {catalogErrors.unit ? (
                    <Text style={styles.fieldErrorText}>{catalogErrors.unit.message}</Text>
                  ) : null}
                </>
              )}
            />
          </View>
          <View style={styles.flexHalf}>
            <Controller
              control={catalogControl}
              name="sku"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>SKU</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                </>
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Controller
              control={catalogControl}
              name="defaultRate"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Default Rate</Text>
                  <View style={[styles.inputBox, catalogErrors.defaultRate && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {catalogErrors.defaultRate ? (
                    <Text style={styles.fieldErrorText}>{catalogErrors.defaultRate.message}</Text>
                  ) : null}
                </>
              )}
            />
          </View>
          <View style={styles.flexHalf}>
            <Controller
              control={catalogControl}
              name="reorderLevel"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Reorder Level</Text>
                  <View style={[styles.inputBox, catalogErrors.reorderLevel && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {catalogErrors.reorderLevel ? (
                    <Text style={styles.fieldErrorText}>{catalogErrors.reorderLevel.message}</Text>
                  ) : null}
                </>
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Controller
              control={catalogControl}
              name="currentStock"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Opening Stock</Text>
                  <View style={[styles.inputBox, catalogErrors.currentStock && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {catalogErrors.currentStock ? (
                    <Text style={styles.fieldErrorText}>{catalogErrors.currentStock.message}</Text>
                  ) : null}
                </>
              )}
            />
          </View>
          <View style={styles.flexHalf}>
            <Controller
              control={catalogControl}
              name="manufacturer"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Manufacturer</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                </>
              )}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleCatalogSubmit(submitCatalogItem)}
          disabled={savingCatalog}
        >
          {savingCatalog ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Catalog Item</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Catalog List</Text>
          <TouchableOpacity onPress={() => void loadCatalog()}>
            <Text style={styles.linkText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loadingCatalog ? (
          <ActivityIndicator color={Colors.primary} />
        ) : catalogItems.length ? (
          catalogItems.map((item) => {
            const lowStock =
              item.reorderLevel !== null &&
              item.reorderLevel !== undefined &&
              Number(item.currentStock ?? 0) <= Number(item.reorderLevel);

            return (
              <View key={item.id} style={styles.listRow}>
                <View style={styles.listMeta}>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listSub}>
                    {[labelize(item.type), item.sku, item.unit, item.manufacturer]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  <Text style={[styles.stockText, lowStock && styles.lowStockText]}>
                    Stock {formatQuantity(item.currentStock, item.unit)}
                    {item.reorderLevel ? ` | Reorder ${item.reorderLevel}` : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.smallBtn,
                    selectedExpenseItemId === item.id && styles.smallBtnActive,
                  ]}
                  onPress={() => {
                    setExpenseValue("catalogItemId", item.id);
                    setExpenseValue("unit", item.unit);
                    setLedgerCatalogItemId(item.id);
                  }}
                >
                  <Text
                    style={[
                      styles.smallBtnText,
                      selectedExpenseItemId === item.id && styles.smallBtnTextActive,
                    ]}
                  >
                    Select
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No catalog items found yet.</Text>
        )}
      </View>
    </>
  );
};
