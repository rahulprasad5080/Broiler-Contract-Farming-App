import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileBox}>
          <Text style={styles.initials}>{user?.name?.charAt(0) || 'S'}</Text>
        </View>
        <Text style={styles.title}>{user?.name || 'Supervisor Profile'}</Text>
        <Text style={styles.subtitle}>{user?.role} Account</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  profileBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  initials: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 5, marginBottom: 30 },
  logoutBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 8 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold' },
});
