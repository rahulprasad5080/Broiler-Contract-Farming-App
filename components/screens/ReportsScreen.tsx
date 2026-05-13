import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="menu" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Business Reports Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Reports</Text>
          <View style={styles.grid}>
            <ReportCard 
              title="Batch Performance" 
              subtitle="Detailed batch analysis" 
              icon="chart-areaspline" 
              iconColor="#0B5C36" 
              bgColor="#E7F5ED" 
            />
            <ReportCard 
              title="P&L Report" 
              subtitle="Profit & loss statement" 
              icon="file-document-outline" 
              iconColor="#7C3AED" 
              bgColor="#F3E8FF" 
            />
            <ReportCard 
              title="Settlement Report" 
              subtitle="Farmer settlements" 
              icon="account-cash-outline" 
              iconColor="#D97706" 
              bgColor="#FFF7ED" 
            />
            <ReportCard 
              title="Expense Report" 
              subtitle="Company & farmer expenses" 
              icon="receipt-outline" 
              iconColor="#EF4444" 
              bgColor="#FEF2F2" 
            />
            <ReportCard 
              title="Sales Report" 
              subtitle="Sales & revenue analysis" 
              icon="cart-outline" 
              iconColor="#2563EB" 
              bgColor="#EFF6FF" 
            />
            <ReportCard 
              title="Mortality Report" 
              subtitle="Mortality analysis" 
              icon="medical-bag" 
              iconColor="#78350F" 
              bgColor="#FAFAF9" 
            />
            <ReportCard 
              title="Inventory Report" 
              subtitle="Stock & ledger report" 
              icon="package-variant-closed" 
              iconColor="#0D9488" 
              bgColor="#F0FDFA" 
            />
            <ReportCard 
              title="Payment Report" 
              subtitle="Payments & receipts" 
              icon="cash-multiple" 
              iconColor="#166534" 
              bgColor="#F0FDF4" 
            />
          </View>
        </View>

        {/* Export Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <ExportRow 
            title="Export to Excel" 
            subtitle="Download report as Excel file" 
            icon="file-excel-outline" 
            iconColor="#10B981" 
            bgColor="#ECFDF5" 
          />
          <ExportRow 
            title="Export to PDF" 
            subtitle="Download report as PDF file" 
            icon="file-pdf-box" 
            iconColor="#EF4444" 
            bgColor="#FEF2F2" 
          />
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportCard({ title, subtitle, icon, iconColor, bgColor }: { title: string, subtitle: string, icon: string, iconColor: string, bgColor: string }) {
  return (
    <TouchableOpacity style={styles.reportCard} activeOpacity={0.7}>
      <View style={[styles.cardIconBox, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function ExportRow({ title, subtitle, icon, iconColor, bgColor }: { title: string, subtitle: string, icon: string, iconColor: string, bgColor: string }) {
  return (
    <TouchableOpacity style={styles.exportRowItem} activeOpacity={0.7}>
      <View style={[styles.exportIconBox, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={iconColor} />
      </View>
      <View style={styles.exportTextContent}>
        <Text style={styles.exportTitle}>{title}</Text>
        <Text style={styles.exportSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#0B5C36" 
  },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIcon: { 
    marginRight: 16 
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  reportCard: {
    width: "47.5%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  exportRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  exportIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  exportTextContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  exportSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
});
