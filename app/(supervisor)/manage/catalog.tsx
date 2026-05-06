import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';
import {
  ApiCatalogItem,
  ApiCatalogItemType,
  createCatalogItem,
  listCatalogItems,
} from '@/services/managementApi';

const CATALOG_TYPES: ApiCatalogItemType[] = ['FEED', 'VACCINE', 'MEDICINE', 'OTHER'];

export default function SupervisorCatalogScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  
  const [items, setItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<ApiCatalogItemType>('FEED');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchCatalog = async () => {
      if (!accessToken) return;
      setLoading(true);
      try {
        const res = await listCatalogItems(accessToken, { limit: 100 });
        setItems(res.data);
      } catch (error) {
        console.warn('Failed to fetch catalog items', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [accessToken]);

  const handleSave = async () => {
    if (!accessToken) return;
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name is required' });
      return;
    }

    setSaving(true);
    try {
      const created = await createCatalogItem(accessToken, {
        name: name.trim(),
        type,
        unit: unit.trim() || undefined,
        description: description.trim() || undefined,
        isActive: true,
      });
      setItems((prev) => [created, ...prev]);
      setName('');
      setUnit('');
      setDescription('');
      Toast.show({ type: 'success', text1: 'Success', text2: 'Catalog item added' });
    } catch (error) {
      console.warn('Failed to save catalog item', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add item' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catalog Master</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add New Item</Text>
          
          <Text style={styles.label}>Name *</Text>
          <View style={styles.inputBox}>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., Pre-starter Feed" placeholderTextColor={Colors.textSecondary} />
          </View>

          <Text style={styles.label}>Type *</Text>
          <View style={styles.chipRow}>
            {CATALOG_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Unit</Text>
          <View style={styles.inputBox}>
            <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="e.g., kg, ml, pieces" placeholderTextColor={Colors.textSecondary} />
          </View>

          <Text style={styles.label}>Description</Text>
          <View style={[styles.inputBox, styles.textArea]}>
            <TextInput style={[styles.input, styles.multiLine]} value={description} onChangeText={setDescription} placeholder="Optional" placeholderTextColor={Colors.textSecondary} multiline />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Add Item</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Existing Items</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>No items found.</Text>
          ) : (
            items.map(item => (
              <View key={item.id} style={styles.listItem}>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.type} {item.unit ? `· ${item.unit}` : ''}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Text style={[styles.statusText, { color: item.isActive ? '#2E7D32' : '#C62828' }]}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  container: { padding: Layout.screenPadding, paddingBottom: 100, maxWidth: Layout.contentMaxWidth, alignSelf: 'center', width: '100%' },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border, ...Layout.cardShadow,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 12 },
  inputBox: {
    minHeight: 46, borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 14, color: Colors.text, padding: 0 },
  textArea: { minHeight: 80, paddingTop: 10 },
  multiLine: { minHeight: 60, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#E8F5E9', borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  submitBtn: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 20 },
  listItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemName: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  itemMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
});
