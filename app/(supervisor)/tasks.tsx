import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { Colors } from '../../constants/Colors';

export default function TasksScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Supervisor Tasks</Text>
        <Text style={styles.subtitle}>Supervision duties and farm visits.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 10 },
});
