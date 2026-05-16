import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { debugLogger } from '@/services/debugLogger';

export function NetworkInspector() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState(debugLogger.getLogs());
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    return debugLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
  }, []);

  const selectedLog = logs.find(l => l.id === selectedLogId);

  const renderJson = (data: any) => {
    if (!data) return <Text style={styles.jsonText}>null</Text>;
    return (
      <Text style={styles.jsonText}>
        {JSON.stringify(data, null, 2)}
      </Text>
    );
  };

  const renderLogItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.logItem, selectedLogId === item.id && styles.logItemActive]}
      onPress={() => setSelectedLogId(item.id)}
    >
      <View style={styles.logItemHeader}>
        <Text style={[styles.methodBadge, { backgroundColor: getMethodColor(item.method) }]}>
          {item.method}
        </Text>
        <Text style={[styles.statusText, { color: item.status >= 400 ? '#EF4444' : '#10B981' }]}>
          {item.status}
        </Text>
        <Text style={styles.timeText}>{item.timestamp}</Text>
      </View>
      <Text style={styles.urlText} numberOfLines={1}>{item.url}</Text>
    </TouchableOpacity>
  );

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return '#3B82F6';
      case 'POST': return '#10B981';
      case 'PUT': return '#F59E0B';
      case 'DELETE': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="bug" size={24} color="#FFF" />
        {logs.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{logs.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {selectedLogId && (
                <TouchableOpacity onPress={() => setSelectedLogId(null)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle}>
                {selectedLogId ? 'Request Details' : 'API History'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {selectedLogId && selectedLog ? (
            <ScrollView style={styles.content}>
              <View style={styles.detailCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>URL:</Text>
                  <Text style={styles.value}>{selectedLog.url}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Method:</Text>
                  <Text style={[styles.value, { fontWeight: '700', color: getMethodColor(selectedLog.method) }]}>
                    {selectedLog.method}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Status:</Text>
                  <Text style={[styles.value, { fontWeight: '700', color: selectedLog.status >= 400 ? '#EF4444' : '#10B981' }]}>
                    {selectedLog.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Request Body</Text>
              <View style={styles.jsonContainer}>
                {renderJson(selectedLog.requestPayload)}
              </View>

              <Text style={styles.sectionTitle}>Response Data</Text>
              <View style={styles.jsonContainer}>
                {renderJson(selectedLog.responsePayload)}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <FlatList
              data={logs}
              renderItem={renderLogItem}
              keyExtractor={item => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No API calls captured yet.</Text>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 9999,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    padding: 12,
  },
  logItem: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logItemActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  logItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  methodBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  urlText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 70,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  jsonContainer: {
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 12,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#10B981',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#9CA3AF',
    fontSize: 16,
  },
});
