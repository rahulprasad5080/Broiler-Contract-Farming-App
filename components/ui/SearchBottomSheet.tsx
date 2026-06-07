import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type SearchBottomSheetItem = {
  label: string;
  value: string;
  description?: string;
};

export type SearchBottomSheetProps = {
  visible: boolean;
  title: string;
  data: SearchBottomSheetItem[];
  selectedValue?: string;
  placeholder?: string;
  emptyMessage?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

type Palette = {
  primary: string;
  surface: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  mutedSurface: string;
  overlay: string;
};

type RowProps = {
  item: SearchBottomSheetItem;
  selected: boolean;
  colors: Palette;
  onPress: (item: SearchBottomSheetItem) => void;
};

const ITEM_HEIGHT = 64;

const SearchBottomSheetRow = memo(function SearchBottomSheetRow({
  item,
  selected,
  colors,
  onPress,
}: RowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      onPress={() => onPress(item)}
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: selected ? colors.mutedSurface : colors.surface,
        },
      ]}
    >
      <View style={styles.rowTextWrap}>
        <Text
          style={[styles.rowLabel, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.description ? (
          <Text
            style={[styles.rowDescription, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

export function SearchBottomSheet({
  visible,
  title,
  data,
  selectedValue,
  placeholder = "Search",
  emptyMessage = "No results found",
  onClose,
  onSelect,
}: SearchBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const visibleRef = useRef(visible);
  const hasOpenedRef = useRef(false);
  const [query, setQuery] = useState("");

  const colors = useMemo<Palette>(
    () => ({
      primary: Colors.primary,
      surface: "#FFFFFF",
      background: Colors.background,
      text: Colors.text,
      textSecondary: Colors.textSecondary,
      border: Colors.border,
      mutedSurface: "#EEF8F3",
      overlay: "rgba(15, 23, 42, 0.48)",
    }),
    [],
  );

  const snapPoints = useMemo(() => ["65%"], []);

  useEffect(() => {
    visibleRef.current = visible;

    if (visible) {
      hasOpenedRef.current = false;
      const frame = requestAnimationFrame(() => {
        bottomSheetRef.current?.present();
      });
      const timeout = setTimeout(() => {
        bottomSheetRef.current?.present();
      }, 80);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timeout);
      };
    }

    bottomSheetRef.current?.dismiss();
    setQuery("");
    hasOpenedRef.current = false;
  }, [visible]);

  const filteredData = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return data;
    }

    return data.filter((item) => {
      const label = item.label.toLowerCase();
      const value = item.value.toLowerCase();
      const description = item.description?.toLowerCase() ?? "";

      return (
        label.includes(trimmedQuery) ||
        value.includes(trimmedQuery) ||
        description.includes(trimmedQuery)
      );
    });
  }, [data, query]);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleClose = useCallback(() => {
    setQuery("");
    hasOpenedRef.current = false;

    if (visibleRef.current) {
      visibleRef.current = false;
      onClose();
    }
  }, [onClose]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) {
        hasOpenedRef.current = true;
        return;
      }

      if (!hasOpenedRef.current) {
        return;
      }

      if (index === -1) {
        handleClose();
      }
    },
    [handleClose],
  );

  const handleSelect = useCallback(
    (item: SearchBottomSheetItem) => {
      onSelect(item.value);
      closeSheet();
    },
    [closeSheet, onSelect],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={1}
        pressBehavior="close"
        style={[props.style, { backgroundColor: colors.overlay }]}
      />
    ),
    [colors.overlay],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchBottomSheetItem }) => (
      <SearchBottomSheetRow
        item={item}
        selected={item.value === selectedValue}
        colors={colors}
        onPress={handleSelect}
      />
    ),
    [colors, handleSelect, selectedValue],
  );

  const keyExtractor = useCallback(
    (item: SearchBottomSheetItem) => item.value,
    [],
  );

  const getItemLayout = useCallback(
    (
      _: ArrayLike<SearchBottomSheetItem> | null | undefined,
      index: number,
    ) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View
          style={[styles.emptyIcon, { backgroundColor: colors.mutedSurface }]}
        >
          <Ionicons
            name="search-outline"
            size={24}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {emptyMessage}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Try a different name or keyword.
        </Text>
      </View>
    ),
    [colors, emptyMessage],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      containerStyle={styles.modalContainer}
      backgroundStyle={[
        styles.sheetBackground,
        { backgroundColor: colors.surface },
      ]}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: colors.border },
      ]}
      enableDynamicSizing={false}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              activeOpacity={0.72}
              onPress={closeSheet}
              style={[
                styles.closeButton,
                { backgroundColor: colors.mutedSurface },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: "#F7F8FA",
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={19}
              color={colors.textSecondary}
            />
            <BottomSheetTextInput
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text }]}
            />
            {query ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                activeOpacity={0.72}
                onPress={() => setQuery("")}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <BottomSheetFlatList
          data={filteredData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          ListEmptyComponent={emptyState}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={18}
          maxToRenderPerBatch={24}
          windowSize={12}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={[
            styles.listContent,
            filteredData.length === 0 && styles.emptyListContent,
          ]}
        />
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    zIndex: 9999,
    elevation: 9999,
  },
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 42,
    height: 5,
    borderRadius: 999,
  },
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: "600",
  },
  clearButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    minHeight: ITEM_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  rowDescription: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
});
