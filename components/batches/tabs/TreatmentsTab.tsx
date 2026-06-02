import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import type { ApiTreatment } from '@/services/managementApi';
import { styles } from './styles';

function formatNumber(value?: number | null, suffix = '') {
  if (value === undefined || value === null) return '0';
  return `${Number(value).toLocaleString('en-IN')}${suffix}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelize(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function InfoPill({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue} numberOfLines={2}>
        {value === undefined || value === null || value === '' ? 'Not set' : String(value)}
      </Text>
    </View>
  );
}

function TreatmentCard({ treatment }: { treatment: ApiTreatment }) {
  return (
    <View style={styles.expenseHistoryCard}>
      <View style={styles.expenseHistoryHeader}>
        <View style={styles.expenseHistoryTitleWrap}>
          <Text style={styles.expenseHistoryTitle} numberOfLines={1}>
            {treatment.treatmentName || labelize(treatment.kind)}
          </Text>
          <Text style={styles.expenseHistoryMeta}>
            {[labelize(treatment.kind), formatDate(treatment.treatmentDate)].join(' | ')}
          </Text>
        </View>
        <View style={styles.editButtonIcon}>
          <MaterialCommunityIcons name="medical-bag" size={14} color="#0B5C36" />
        </View>
      </View>

      <View style={styles.expenseInfoGrid}>
        <InfoPill label="Treatment Date" value={formatDate(treatment.treatmentDate)} />
        <InfoPill label="Kind" value={labelize(treatment.kind)} />
        <InfoPill label="Treatment Name" value={treatment.treatmentName} />
        <InfoPill label="Dosage" value={treatment.dosage} />
        <InfoPill label="Bird Count" value={formatNumber(treatment.birdCount)} />
        <InfoPill label="Created At" value={formatDate(treatment.createdAt)} />
      </View>

      {treatment.notes ? (
        <Text style={styles.expenseNotes} numberOfLines={2}>
          {treatment.notes}
        </Text>
      ) : null}
    </View>
  );
}

export function TreatmentsTab({
  treatments,
  onAddTreatment,
}: {
  treatments: ApiTreatment[];
  onAddTreatment?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Treatments</Text>
        {onAddTreatment ? (
          <TouchableOpacity style={styles.addExpenseBtn} activeOpacity={0.75} onPress={onAddTreatment}>
            <Feather name="plus" size={16} color="#0B5C36" />
            <Text style={styles.addExpenseText}>Add Treatment</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {treatments.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Ionicons name="medkit-outline" size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No treatments yet</Text>
          <Text style={styles.emptyStateText}>
            Records from /batches/{'{batchId}'}/treatments will appear here.
          </Text>
        </View>
      ) : (
        treatments.map((treatment) => (
          <TreatmentCard key={treatment.id} treatment={treatment} />
        ))
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
