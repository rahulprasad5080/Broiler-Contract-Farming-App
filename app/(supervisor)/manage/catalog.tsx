import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  ApiCatalogItem,
  ApiCatalogItemType,
  createCatalogItem,
  listCatalogItems,
} from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

const CATALOG_TYPES = [
  'CHICKS',
  'FEED',
  'MEDICINE',
  'VACCINE',
  'EQUIPMENT',
  'OTHER',
] as const satisfies readonly ApiCatalogItemType[];

const catalogSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(CATALOG_TYPES),
  unit: z.string().min(1, 'Unit is required'),
  manufacturer: z.string().optional(),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

const CATALOG_DEFAULTS = {
  name: '',
  type: 'FEED' as const,
  unit: '',
  manufacturer: '',
} satisfies CatalogFormData;

export default function SupervisorCatalogScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [items, setItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const draftBannerOpacity = useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, reset, watch, formState: { errors: formErrors } } = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
    defaultValues: CATALOG_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    'form_draft_catalog_item',
    watch,
    reset,
    CATALOG_DEFAULTS,
  );

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isRestored) return;
    setShowBanner(true);
    Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowBanner(false));
  }, [isRestored, draftBannerOpacity]);

  useEffect(() => {
    const fetchCatalog = async () => {
      if (!accessToken) return;
      setLoading(true);
      try {
        const res = await listCatalogItems(accessToken, { limit: 100 });
        setItems(res.data);
      } catch (error) {
        console.warn('Failed to fetch catalog items', error);
        showRequestErrorToast(error, {
          title: 'Unable to load catalog',
          fallbackMessage: 'Failed to fetch catalog items.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [accessToken]);

  const handleSave = async (data: CatalogFormData) => {
    if (!accessToken) return;

    setSaving(true);
    try {
      const created = await createCatalogItem(accessToken, {
        name: data.name.trim(),
        type: data.type,
        unit: data.unit.trim(),
        manufacturer: data.manufacturer?.trim() || undefined,
      });
      setItems((prev) => [created, ...prev]);
      await clearPersistedData();
      reset();
      showSuccessToast('Catalog item added.');
    } catch (error) {
      console.warn('Failed to save catalog item', error);
      showRequestErrorToast(error, {
        title: 'Catalog save failed',
        fallbackMessage: 'Failed to add item.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Catalog Master</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) => item.id}
        style={styles.mainScroll}
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={styles.card}>
              {/* Draft restored banner */}
              {showBanner && (
                <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
                  <Ionicons name="cloud-done-outline" size={16} color="#0B5C36" />
                  <Text style={styles.draftBannerText}>Draft restored</Text>
                </Animated.View>
              )}

              <Text style={styles.sectionTitle}>Add New Item</Text>

              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Name *</Text>
                    <View style={[styles.inputBox, formErrors.name && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="e.g., Pre-starter Feed"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                    {formErrors.name && <Text style={styles.fieldErrorText}>{formErrors.name.message}</Text>}
                  </>
                )}
              />

              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Type *</Text>
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
                    {formErrors.type && <Text style={styles.fieldErrorText}>{formErrors.type.message}</Text>}
                  </>
                )}
              />

              <Controller
                control={control}
                name="unit"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Unit *</Text>
                    <View style={[styles.inputBox, formErrors.unit && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="e.g., kg, ml, pieces"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                    {formErrors.unit && <Text style={styles.fieldErrorText}>{formErrors.unit.message}</Text>}
                  </>
                )}
              />

              <Controller
                control={control}
                name="manufacturer"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Manufacturer</Text>
                    <View style={[styles.inputBox, styles.textArea, formErrors.manufacturer && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={[styles.input, styles.multiLine]}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Optional brand or manufacturer"
                        placeholderTextColor={Colors.textSecondary}
                        multiline
                      />
                    </View>
                    {formErrors.manufacturer && <Text style={styles.fieldErrorText}>{formErrors.manufacturer.message}</Text>}
                  </>
                )}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit(handleSave)} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Add Item</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.listHeaderCard}>
              <Text style={styles.sectionTitle}>Existing Items</Text>
              {loading ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} /> : null}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.listItem, styles.listItemCard]}>
            <View style={styles.itemCopy}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.type}
                {item.unit ? ` | ${item.unit}` : ''}
                {item.manufacturer ? ` | ${item.manufacturer}` : ''}
              </Text>
              <Text style={styles.itemMeta}>
                Stock {Number(item.currentStock ?? 0).toLocaleString('en-IN')}
                {item.reorderLevel ? ` | Reorder ${item.reorderLevel}` : ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={[styles.statusText, { color: item.isActive ? '#2E7D32' : '#C62828' }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No items found.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerCopy: { flex: 1 },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100, maxWidth: Layout.contentMaxWidth, alignSelf: 'center', width: '100%' },
  mainScroll: { flex: 1, backgroundColor: '#F9FAFB' },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E7F5ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B7E0C2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  draftBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B5C36',
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  listHeaderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: "#111827", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: "#374151", marginBottom: 8, marginTop: 14 },
  inputBox: {
    minHeight: 52, borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center', backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 15, color: "#111827", padding: 0 },
  textArea: { minHeight: 90, paddingTop: 12 },
  multiLine: { minHeight: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#E7F5ED', borderColor: '#0B5C36' },
  chipText: { fontSize: 12, fontWeight: '700', color: "#6B7280" },
  chipTextActive: { color: '#0B5C36' },
  submitBtn: {
    backgroundColor: "#0B5C36", height: 52, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 24,
    shadowColor: "#0B5C36", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  fieldErrorText: {
    color: "#DC2626",
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  emptyText: { fontSize: 15, color: "#6B7280", textAlign: 'center', paddingVertical: 30 },
  listItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  listItemCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  itemCopy: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 16, fontWeight: '700', color: "#111827" },
  itemMeta: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
});
