import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import {
  createWarehouse,
  listWarehouses,
  type ApiWarehouse,
} from "@/services/managementApi";

const warehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  code: z.string().min(1, "Code is required"),
  location: z.string().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

const DEFAULTS: WarehouseFormData = {
  name: "",
  code: "",
  location: "",
};

function CreateWarehouseModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: DEFAULTS,
  });

  const onSubmit = async (data: WarehouseFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    try {
      await createWarehouse(accessToken, {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        location: data.location?.trim() || undefined,
        isActive: true,
      });
      showSuccessToast("Warehouse created successfully.");
      reset(DEFAULTS);
      onCreated();
      onClose();
    } catch (error) {
      showRequestErrorToast(error, { title: "Failed to create warehouse" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>New Warehouse</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={modal.form}>
            <ModalInput
              control={control}
              name="name"
              label="Warehouse Name"
              placeholder="e.g. Main Warehouse"
              error={errors.name?.message}
              required
            />
            <ModalInput
              control={control}
              name="code"
              label="Code"
              placeholder="e.g. MAIN or FG-01"
              error={errors.code?.message}
              required
              autoCapitalize="characters"
            />
            <ModalInput
              control={control}
              name="location"
              label="Location (optional)"
              placeholder="e.g. North Side Shed"
              error={errors.location?.message}
            />
          </View>

          <TouchableOpacity
            style={[modal.saveBtn, saving && modal.disabledBtn]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            activeOpacity={0.82}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={modal.saveBtnText}>Create Warehouse</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ModalInput({
  control,
  name,
  label,
  placeholder,
  error,
  required,
  autoCapitalize = "sentences",
}: {
  control: any;
  name: string;
  label: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={modal.inputGroup}>
      <Text style={modal.label}>
        {label} {required ? <Text style={{ color: Colors.error }}>*</Text> : null}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TextInput
            style={[modal.input, error && { borderColor: Colors.error }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            autoCapitalize={autoCapitalize}
          />
        )}
      />
      {error ? <Text style={modal.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function WarehouseMasterScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadWarehouses = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await listWarehouses(accessToken);
        setWarehouses(res.data ?? []);
      } catch (err) {
        setError("Unable to load warehouses.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      void loadWarehouses();
    }, [loadWarehouses]),
  );

  const renderItem = ({ item }: { item: ApiWarehouse }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="business-outline" size={22} color={Colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCode}>{item.code}</Text>
        {item.location ? (
          <Text style={styles.cardLocation}>{item.location}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.statusBadge,
          item.isActive
            ? { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }
            : { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: item.isActive ? "#059669" : "#9CA3AF" },
          ]}
        >
          {item.isActive ? "Active" : "Inactive"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Warehouses"
        subtitle="Manage warehouse master"
        leadingMode="back"
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.page}>
        <FlatList
          data={loading ? [] : warehouses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            !loading && warehouses.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => void loadWarehouses(true)}
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading warehouses" message="Fetching warehouse list..." loading />
            ) : error ? (
              <ScreenState
                title="Failed to load"
                message={error}
                icon="alert-circle-outline"
                tone="error"
                actionLabel="Retry"
                onAction={() => void loadWarehouses()}
              />
            ) : (
              <ScreenState
                title="No warehouses found"
                message="Create your first warehouse to start the new stock flow."
                icon="business-outline"
                actionLabel="Create Warehouse"
                onAction={() => setShowCreate(true)}
              />
            )
          }
          ListFooterComponent={<View style={{ height: 28 }} />}
        />
      </View>

      <CreateWarehouseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => void loadWarehouses()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  page: { flex: 1, backgroundColor: "#F4F6F8" },
  listContent: { padding: 14, paddingBottom: 56 },
  listEmpty: { flexGrow: 1 },
  addBtn: {
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBtnText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 1,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E7F5ED",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardName: { color: "#111827", fontSize: 15, fontWeight: "800" },
  cardCode: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  cardLocation: { color: "#6B7280", fontSize: 11, marginTop: 2 },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
  },
  statusText: { fontSize: 11, fontWeight: "800" },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#111827", fontSize: 18, fontWeight: "900" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: 12 },
  inputGroup: { gap: 6 },
  label: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "#FAFAFA",
  },
  errorText: { color: Colors.error, fontSize: 11, fontWeight: "700" },
  saveBtn: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveBtnText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  disabledBtn: { opacity: 0.7 },
});
