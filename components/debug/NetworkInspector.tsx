import { debugLogger } from '@/services/debugLogger';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function NetworkInspector() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState(debugLogger.getLogs());
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return debugLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
  }, []);

  const selectedLog = logs.find(l => l.id === selectedLogId);

  const handleClearLogs = () => {
    debugLogger.clear();
    setSelectedLogId(null);
  };

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

      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {selectedLogId && (
                  <TouchableOpacity onPress={() => setSelectedLogId(null)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#1F2937" />
                  </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>
                  {selectedLogId ? 'Request Details' : 'API History'}
                </Text>
              </View>
              <View style={styles.headerActions}>
                {logs.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearLogs}
                    style={styles.headerActionButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clear API history"
                  >
                    <Ionicons name="trash-outline" size={21} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={styles.headerActionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close API history"
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
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
                <View style={{ height: 24 }} />
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
          </View>
        </View>
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
    marginTop: 50,
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
    height: '90%',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
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
    padding: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActionButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    padding: 10,
  },
  logItem: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
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
    padding: 12,
  },
  detailCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
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
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  jsonContainer: {
    backgroundColor: '#1F2937',
    padding: 10,
    borderRadius: 10,
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
