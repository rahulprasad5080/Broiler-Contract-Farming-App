import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';

function GridCard({ icon, iconColor, bgColor, value, label, isWarning }: any) {
  return (
    <View style={[styles.gridCard, isWarning && { borderColor: '#FECACA', backgroundColor: '#FFF5F5' }]}>
      <View style={[styles.gridCardIconWrap, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon} size={13} color={iconColor} />
      </View>
      <View style={styles.gridCardTextWrap}>
        <Text style={styles.gridLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.gridVal} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

interface OverviewTabProps {
  chicksPlaced: string | number;
  liveBirds: string | number;
  mortality: string;
  fcr: string;
  avgWeight: string;
  feedConsumed: string;
  ageDays: number;
}

export function OverviewTab({
  chicksPlaced,
  liveBirds,
  mortality,
  fcr,
  avgWeight,
  feedConsumed,
  ageDays,
}: OverviewTabProps) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Batch Overview</Text>
        <View style={styles.grid}>
          <GridCard
            icon="bird"
            iconColor="#0B5C36"
            bgColor="#E7F5ED"
            value={chicksPlaced}
            label="Chicks Placed"
          />
          <GridCard
            icon="checkbox-marked-circle-outline"
            iconColor="#10B981"
            bgColor="#EFFDF4"
            value={liveBirds}
            label="Live Birds"
          />
          <GridCard
            icon="heart-broken"
            iconColor="#EF4444"
            bgColor="#FEF2F2"
            value={mortality}
            label="Mortality"
            isWarning={parseFloat(mortality) > 0}
          />

          <GridCard
            icon="calculator-variant"
            iconColor="#8B5CF6"
            bgColor="#F3E8FF"
            value={fcr}
            label="FCR"
          />
          <GridCard
            icon="scale"
            iconColor="#F97316"
            bgColor="#FFF7ED"
            value={avgWeight}
            label="Avg. Weight"
          />
          <GridCard
            icon="corn"
            iconColor="#3B82F6"
            bgColor="#EFF6FF"
            value={feedConsumed}
            label="Feed Consumed"
          />

          <GridCard
            icon="calendar-clock"
            iconColor="#1A73E8"
            bgColor="#E8F0FE"
            value={ageDays.toString()}
            label="Age (Days)"
          />
        </View>
      </View>
    </>
  );
}
