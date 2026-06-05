import { View, Text } from 'react-native';
import { styles } from '@/components/batches/tabs/styles';
import { formatValue } from '@/utils/format';

interface InfoPillProps {
  label: string;
  value?: string | number | null;
}

/**
 * A small labelled pill used in batch detail grids to display a single field.
 * Renders "Not set" for null, undefined, or empty string values.
 */
export function InfoPill({ label, value }: InfoPillProps) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue} numberOfLines={2}>
        {formatValue(value)}
      </Text>
    </View>
  );
}
