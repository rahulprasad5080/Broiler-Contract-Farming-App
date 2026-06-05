import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import type { ApiTreatment } from '@/services/managementApi';
import { InfoPill } from '@/components/ui/InfoPill';
import { formatDate, formatNumber, labelize } from '@/utils/format';
import { styles } from './styles';

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
