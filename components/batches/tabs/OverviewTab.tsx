import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

function GridCard({ value, label, valColor, bgHighlight }: any) {
  return (
    <View style={[styles.gridCard, bgHighlight && { backgroundColor: bgHighlight }]}>
      <Text style={[styles.gridVal, { color: valColor }]}>{value}</Text>
      <Text style={styles.gridLabel}>{label}</Text>
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
          <GridCard value={chicksPlaced} label="Chicks Placed" valColor="#3B82F6" />
          <GridCard value={liveBirds} label="Live Birds" valColor="#10B981" />
          <GridCard value={mortality} label="Mortality" valColor="#EF4444" bgHighlight="#FEF2F2" />

          <GridCard value={fcr} label="FCR" valColor="#8B5CF6" />
          <GridCard value={avgWeight} label="Avg. Weight" valColor="#F97316" />
          <GridCard value={feedConsumed} label="Feed Consumed" valColor="#3B82F6" />

          <GridCard value={ageDays.toString()} label="Age (Days)" valColor="#10B981" />
          <GridCard value={expectedAge.toString()} label="Expected Sale Age" valColor="#111827" />
          <GridCard value={`${toGo} Days`} label="To Go" valColor="#10B981" />
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
