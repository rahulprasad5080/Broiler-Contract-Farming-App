import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Controller, Control, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { Colors } from '@/constants/Colors';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { styles } from './inventoryStyles';
import { ExpenseFormData, LEDGERS, EXPENSE_CATEGORIES } from './inventoryTypes';
import { ApiCatalogItem, ApiBatchExpense } from '@/services/managementApi';

interface ExpensesTabProps {
  expenseControl: Control<ExpenseFormData>;
  expenseErrors: FieldErrors<ExpenseFormData>;
  handleExpenseSubmit: UseFormHandleSubmit<ExpenseFormData>;
  submitExpense: (data: ExpenseFormData) => Promise<void>;
  savingExpense: boolean;
  loadingExpenses: boolean;
  expenses: ApiBatchExpense[];
  loadExpenses: () => Promise<void>;
  catalogItems: ApiCatalogItem[];
  labelize: (val: string) => string;
  formatQuantity: (val?: number | null, unit?: string | null) => string;
  formatINR: (val?: number | null) => string;
  setExpenseValue: (name: any, value: any) => void;
  selectedExpenseItem: ApiCatalogItem | null;
  catalogTypeToExpenseCategory: (type: any) => any;
  canSeeCost: boolean;
  loadedExpenseTotal: number;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenseControl,
  expenseErrors,
  handleExpenseSubmit,
  submitExpense,
  savingExpense,
  loadingExpenses,
  expenses,
  loadExpenses,
  catalogItems,
  labelize,
  formatQuantity,
  formatINR,
  setExpenseValue,
  selectedExpenseItem,
  catalogTypeToExpenseCategory,
  canSeeCost,
  loadedExpenseTotal,
}) => {
  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Batch Expense Entry</Text>
        <Text style={styles.panelSubtitle}>
          New contract uses /batches/:batchId/expenses. Choose company or farmer ledger before saving.
        </Text>

        <Controller
          control={expenseControl}
          name="batchId"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Batch ID</Text>
              <View style={[styles.inputBox, expenseErrors.batchId && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Batch ID"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              {expenseErrors.batchId ? (
                <Text style={styles.fieldErrorText}>{expenseErrors.batchId.message}</Text>
              ) : null}
            </>
          )}
        />

        <Controller
          control={expenseControl}
          name="ledger"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Ledger</Text>
              <View style={styles.chipRow}>
                {LEDGERS.map((ledger) => (
                  <TouchableOpacity
                    key={ledger}
                    style={[styles.chip, value === ledger && styles.chipActive]}
                    onPress={() => onChange(ledger)}
                  >
                    <Text style={[styles.chipText, value === ledger && styles.chipTextActive]}>
                      {labelize(ledger)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        />

        <Controller
          control={expenseControl}
          name="category"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {EXPENSE_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.chip, value === category && styles.chipActive]}
                    onPress={() => onChange(category)}
                  >
                    <Text style={[styles.chipText, value === category && styles.chipTextActive]}>
                      {labelize(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        />

        <Controller
          control={expenseControl}
          name="catalogItemId"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Catalog Item</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                <TouchableOpacity
                  style={[styles.chip, !value && styles.chipActive]}
                  onPress={() => onChange("")}
                >
                  <Text style={[styles.chipText, !value && styles.chipTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {catalogItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, value === item.id && styles.chipActive]}
                  onPress={() => {
                    onChange(item.id);
                    setExpenseValue("category", catalogTypeToExpenseCategory(item.type));
                    setExpenseValue("unit", item.unit);
                    setExpenseValue("rate", item.defaultRate ? String(item.defaultRate) : "");
                  }}
                  >
                    <Text style={[styles.chipText, value === item.id && styles.chipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedExpenseItem ? (
                <Text style={styles.helperText}>
                  Unit {selectedExpenseItem.unit} | Stock{" "}
                  {formatQuantity(selectedExpenseItem.currentStock, selectedExpenseItem.unit)}
                </Text>
              ) : null}
            </>
          )}
        />

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Controller
              control={expenseControl}
              name="expenseDate"
              render={({ field: { onChange, value } }) => (
                <DatePickerField
                  label="Expense Date"
                  value={value}
                  onChange={onChange}
                  placeholder="Select expense date"
                  error={expenseErrors.expenseDate?.message}
                />
              )}
            />
          </View>
          <View style={styles.flexHalf}>
            <Controller
              control={expenseControl}
              name="totalAmount"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Total Amount</Text>
                  <View style={[styles.inputBox, expenseErrors.totalAmount && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {expenseErrors.totalAmount ? (
                    <Text style={styles.fieldErrorText}>{expenseErrors.totalAmount.message}</Text>
                  ) : null}
                </>
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Controller
              control={expenseControl}
              name="quantity"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <View style={[styles.inputBox, expenseErrors.quantity && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </>
              )}
            />
          </View>
          <View style={styles.flexHalf}>
            <Controller
              control={expenseControl}
              name="rate"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Rate</Text>
                  <View style={[styles.inputBox, expenseErrors.rate && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </>
              )}
            />
          </View>
        </View>

        <Controller
          control={expenseControl}
          name="unit"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Unit</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="kg / bag / ml"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </>
          )}
        />

        <Controller
          control={expenseControl}
          name="description"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Starter feed purchase"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </>
          )}
        />

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Controller
              control={expenseControl}
              name="vendorName"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Vendor</Text>
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
          <View style={styles.flexHalf}>
            <Controller
              control={expenseControl}
              name="invoiceNumber"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.fieldLabel}>Invoice No.</Text>
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

        <Controller
          control={expenseControl}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <>
              <Text style={styles.fieldLabel}>Notes</Text>
              <View style={[styles.inputBox, styles.textArea]}>
                <TextInput
                  style={[styles.input, styles.multiLineInput]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Optional notes"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                />
              </View>
            </>
          )}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleExpenseSubmit(submitExpense)}
          disabled={savingExpense}
        >
          {savingExpense ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Batch Expense</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => void loadExpenses()}
          disabled={loadingExpenses}
        >
          {loadingExpenses ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={styles.secondaryBtnText}>Load Expenses for Batch</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Loaded Expenses</Text>
            <Text style={styles.panelSubtitle}>
              Total {canSeeCost ? formatINR(loadedExpenseTotal) : "Hidden"}
            </Text>
          </View>
          {loadingExpenses ? <ActivityIndicator color={Colors.primary} /> : null}
        </View>

        {expenses.length ? (
          expenses.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listMeta}>
                <Text style={styles.listTitle}>{item.description}</Text>
                <Text style={styles.listSub}>
                  {[labelize(item.ledger), labelize(item.category), item.expenseDate]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                <Text style={styles.noteText}>
                  {[item.vendorName, item.invoiceNumber, item.paymentStatus]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
              </View>
              <Text style={styles.amountText}>
                {canSeeCost ? formatINR(item.totalAmount) : "Hidden"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No expenses loaded for this batch yet.</Text>
        )}
      </View>
    </>
  );
};
