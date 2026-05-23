import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  expectedAge: number;
  toGo: number;
}

export function OverviewTab({
  chicksPlaced,
  liveBirds,
  mortality,
  fcr,
  avgWeight,
  feedConsumed,
  ageDays,
  expectedAge,
  toGo,
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
          <GridCard
            icon="calendar-check"
            iconColor="#64748B"
            bgColor="#F1F5F9"
            value={expectedAge.toString()}
            label="Expected Sale"
          />
          <GridCard
            icon="run-fast"
            iconColor="#0B5C36"
            bgColor="#E7F5ED"
            value={`${toGo} Days`}
            label="To Go"
          />
        </View>
      </View>

      {/* Performance Trend Mock */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Trend</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>FCR</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Mortality %</Text>
            </View>
          </View>

          <View style={styles.chartBox}>
            <View style={styles.yAxisLabelsLeft}>
              <Text style={styles.yText}>2.0</Text>
              <Text style={styles.yText}>1.5</Text>
              <Text style={styles.yText}>1.0</Text>
              <Text style={styles.yText}>0.5</Text>
              <Text style={styles.yText}>0</Text>
            </View>

            <View style={styles.chartArea}>
              <View style={styles.gridLine}><Text></Text></View>
              <View style={styles.gridLine}><Text></Text></View>
              <View style={styles.gridLine}><Text></Text></View>
              <View style={styles.gridLine}><Text></Text></View>
              <View style={styles.gridLine}><Text></Text></View>

              <View style={styles.mockPathGreen} />
              <View style={styles.mockPathRed} />
            </View>

            <View style={styles.yAxisLabelsRight}>
              <Text style={styles.yText}>6%</Text>
              <Text style={styles.yText}>4%</Text>
              <Text style={styles.yText}>2%</Text>
              <Text style={styles.yText}>0%</Text>
              <Text style={styles.yText}></Text>
            </View>
          </View>
          <View style={styles.xAxisLabels}>
            <Text style={styles.xText}>1 May</Text>
            <Text style={styles.xText}>8 May</Text>
            <Text style={styles.xText}>15 May</Text>
            <Text style={styles.xText}>20 May</Text>
          </View>
        </View>
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          <View style={[styles.activityIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
          </View>
          <View style={styles.activityBody}>
            <Text style={styles.activityTitle}>Daily Entry Added</Text>
            <Text style={styles.activityTime}>Today, 08:30 AM</Text>
          </View>
          <Text style={styles.activityAuthor}>By Ramesh</Text>
        </View>

        <View style={styles.activityCard}>
          <View style={[styles.activityIconBox, { backgroundColor: '#F3E8FF' }]}>
            <Ionicons name="cart-outline" size={20} color="#A855F7" />
          </View>
          <View style={styles.activityBody}>
            <Text style={styles.activityTitle}>Feed Allocated</Text>
            <Text style={styles.activityTime}>Today, 07:45 AM</Text>
          </View>
          <Text style={styles.activityAuthor}>By Supervisor</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </>
  );
}
