import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TopAppBar } from '@/components/ui/TopAppBar';

const PRIVACY_POLICY_SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'WingSoft Farms stores account details, farm records, batch activity, inventory, expenses, sales, settlements, reports, and app security preferences needed to run broiler contract farming workflows.',
    icon: 'folder-open-outline',
  },
  {
    title: 'How We Use Information',
    body: 'This information is used to manage farms, calculate payouts, track alerts, approve expenses, prepare reports, secure user access, and improve day-to-day operational accuracy.',
    icon: 'analytics-outline',
  },
  {
    title: 'Data Access',
    body: 'Only authorized users can access information based on their role and permissions. Owners can manage business settings, users, and operational records assigned to their organization.',
    icon: 'people-outline',
  },
  {
    title: 'Security',
    body: 'The app supports password, PIN, and biometric unlock preferences. Users should keep credentials private and report unauthorized access immediately.',
    icon: 'shield-checkmark-outline',
  },
  {
    title: 'Data Retention',
    body: 'Operational records may be retained while the organization uses the app, or as required for accounting, settlement, reporting, support, and audit purposes.',
    icon: 'time-outline',
  },
  {
    title: 'Contact',
    body: 'For privacy questions, data corrections, or support requests, contact the WingSoft Farms support team through your organization owner or administrator.',
    icon: 'mail-outline',
  },
] as const;

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Privacy Policy"
        subtitle="WingSoft Farms data and security"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Privacy Policy</Text>
            <Text style={styles.heroText}>
              This policy explains how WingSoft Farms handles information used inside the broiler contract farming app.
            </Text>
            <Text style={styles.updatedText}>Last updated: 08 Jun 2026</Text>
          </View>
        </View>

        <View style={styles.policyList}>
          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <View key={section.title} style={styles.policyCard}>
              <View style={styles.policyIcon}>
                <Ionicons name={section.icon} size={20} color="#0B5C36" />
              </View>
              <View style={styles.policyCopy}>
                <Text style={styles.policyTitle}>{section.title}</Text>
                <Text style={styles.policyBody}>{section.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
          <Text style={styles.noticeText}>
            This in-app policy is written for operational clarity. Any signed service agreement or organization policy may also apply.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80,
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#0B5C36',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#064E2E',
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  updatedText: {
    marginTop: 10,
    color: '#C6F6D5',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  policyList: {
    gap: 12,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    padding: 14,
  },
  policyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    marginTop: 1,
  },
  policyCopy: {
    flex: 1,
    minWidth: 0,
  },
  policyTitle: {
    color: '#212B36',
    fontSize: 15,
    fontWeight: '900',
  },
  policyBody: {
    marginTop: 5,
    color: '#637381',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  noticeCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
  },
  noticeText: {
    flex: 1,
    color: '#1E3A8A',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});
