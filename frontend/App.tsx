import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { checkBackendHealth, checkDbStatus } from './src/services/api';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setBackendStatus(null);
    setDbStatus(null);

    try {
      const health = await checkBackendHealth();
      setBackendStatus(`UP (${health.message})`);
    } catch (err: any) {
      setBackendStatus(`ERROR: ${err.message || 'Cannot reach backend'}`);
    }

    try {
      const db = await checkDbStatus();
      setDbStatus(`${db.database}: ${db.message}`);
    } catch (err: any) {
      setDbStatus(`ERROR: ${err.message || 'Database check failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.card}>
        <Text style={styles.badge}>READY TO DEVELOP</Text>
        <Text style={styles.title}>IsetConnect</Text>
        <Text style={styles.subtitle}>
          React Native (Frontend) + Spring Boot (Backend) + PostgreSQL (Database)
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>Backend & Database Status</Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Backend API:</Text>
          <Text style={[styles.statusValue, backendStatus?.includes('UP') ? styles.success : styles.neutral]}>
            {backendStatus ?? 'Press "Test Connection" below'}
          </Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>PostgreSQL (pgAdmin4):</Text>
          <Text style={[styles.statusValue, dbStatus?.includes('CONNECTED') ? styles.success : styles.neutral]}>
            {dbStatus ?? 'Press "Test Connection" below'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testConnection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Backend Connection</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>
        Spring Boot backend runs on http://localhost:8080 by default.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  neutral: {
    color: '#4B5563',
  },
  success: {
    color: '#059669',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  footerNote: {
    marginTop: 20,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
