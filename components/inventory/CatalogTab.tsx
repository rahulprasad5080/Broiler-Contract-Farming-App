import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Controller, Control, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ApiCatalogItem } from '@/services/managementApi';
import { styles } from './inventoryStyles';
import { CatalogFormData } from './inventoryTypes';
import { SearchableSelectField, type SearchableSelectOption } from '@/components/ui/SearchableSelectField';

interface CatalogTabProps {
  catalogControl: Control<CatalogFormData>;
  catalogErrors: FieldErrors<CatalogFormData>;
  handleCatalogSubmit: UseFormHandleSubmit<CatalogFormData>;
  submitCatalogItem: (data: CatalogFormData) => Promise<void>;
  savingCatalog: boolean;
  catalogModalVisible: boolean;
  catalogModalMode: 'create' | 'edit';
  loadingCatalog: boolean;
  catalogItems: ApiCatalogItem[];
  loadCatalog: () => Promise<void>;
  openCreateCatalogModal: () => void;
  openEditCatalogModal: (item: ApiCatalogItem) => void;
  closeCatalogModal: () => void;
  labelize: (val: string) => string;
  formatQuantity: (val?: number | null, unit?: string | null) => string;
  catalogTypeOptions: SearchableSelectOption[];
  loadingCatalogTypes: boolean;
  catalogTypeError?: string | null;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  catalogControl,
  catalogErrors,
  handleCatalogSubmit,
  submitCatalogItem,
  savingCatalog,
  catalogModalVisible,
  catalogModalMode,
  loadingCatalog,
  catalogItems,
  loadCatalog,
  openCreateCatalogModal,
  openEditCatalogModal,
  closeCatalogModal,
  labelize,
  formatQuantity,
  catalogTypeOptions,
  loadingCatalogTypes,
  catalogTypeError,
}) => {
  const isEditMode = catalogModalMode === 'edit';

  return (
    <>
      <Modal
        visible={catalogModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCatalogModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeCatalogModal}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardWrap}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {isEditMode ? 'Update Catalog Item' : 'Create Catalog Item'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Feed, medicine, vaccine, chicks, equipment, or other stock item
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={closeCatalogModal}
                  disabled={savingCatalog}
                  accessibilityRole="button"
                  accessibilityLabel="Close catalog form"
                >
                  <MaterialCommunityIcons name="close" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalContent}
              >
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
                    <SearchableSelectField
                      label="Type"
                      value={value}
                      options={catalogTypeOptions}
                      onSelect={onChange}
                      placeholder={loadingCatalogTypes ? "Loading types..." : "Select type"}
                      searchPlaceholder="Search catalog type"
                      emptyMessage="No catalog types found"
                      error={catalogErrors.type?.message || catalogTypeError || undefined}
                      disabled={loadingCatalogTypes}
                      locked={isEditMode}
                      required
                    />
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
                          <View
                            style={[styles.inputBox, catalogErrors.defaultRate && styles.inputError]}
                          >
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
                            <Text style={styles.fieldErrorText}>
                              {catalogErrors.defaultRate.message}
                            </Text>
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
                          <View
                            style={[styles.inputBox, catalogErrors.reorderLevel && styles.inputError]}
                          >
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
                            <Text style={styles.fieldErrorText}>
                              {catalogErrors.reorderLevel.message}
                            </Text>
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
                          <View
                            style={[styles.inputBox, catalogErrors.currentStock && styles.inputError]}
                          >
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
                            <Text style={styles.fieldErrorText}>
                              {catalogErrors.currentStock.message}
                            </Text>
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

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={closeCatalogModal}
                    disabled={savingCatalog}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSaveButton, savingCatalog && styles.disabledButton]}
                    onPress={handleCatalogSubmit(submitCatalogItem)}
                    disabled={savingCatalog}
                  >
                    {savingCatalog ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.modalSaveButtonText}>
                        {isEditMode ? 'Update Item' : 'Save Item'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Catalog List</Text>
          <View style={styles.panelHeaderActions}>
            {loadingCatalog ? <ActivityIndicator color={Colors.primary} /> : null}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => void loadCatalog()}
              accessibilityRole="button"
              accessibilityLabel="Refresh catalog list"
            >
              <MaterialCommunityIcons name="refresh" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconButton, styles.headerIconButtonPrimary]}
              onPress={openCreateCatalogModal}
              accessibilityRole="button"
              accessibilityLabel="Create catalog item"
            >
              <MaterialCommunityIcons name="plus" size={19} color="#FFF" />
            </TouchableOpacity>
          </View>
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
                  style={styles.smallIconButton}
                  onPress={() => openEditCatalogModal(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={17} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyText}>No catalog items found yet.</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={openCreateCatalogModal}>
              <MaterialCommunityIcons name="plus" size={17} color="#FFF" />
              <Text style={styles.emptyStateButtonText}>Add Catalog Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
};
