import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { WifiOff, RefreshCw, Settings, Check, AlertCircle, Server } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { getDefaultApiUrl } from '../lib/constants';

interface Props {
  onRetry: () => void;
  targetUrl?: string;
  errorMessage?: string;
}

export default function OfflineFallbackScreen({ onRetry, targetUrl, errorMessage }: Props) {
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('lumina_custom_api_url').then((val) => {
      if (val) {
        setCustomUrl(val);
      } else {
        setCustomUrl(targetUrl ? targetUrl.replace(/\/login.*$/, '').replace(/\/ics.*$/, '') : getDefaultApiUrl());
      }
    }).catch(() => {});
  }, [targetUrl]);

  const handleSaveCustomUrl = async () => {
    try {
      const clean = customUrl.trim().replace(/\/+$/, '');
      if (clean) {
        await SecureStore.setItemAsync('lumina_custom_api_url', clean);
      } else {
        await SecureStore.deleteItemAsync('lumina_custom_api_url');
      }
      setShowConfig(false);
      onRetry();
    } catch {
      onRetry();
    }
  };

  const handleResetUrl = async () => {
    try {
      await SecureStore.deleteItemAsync('lumina_custom_api_url');
      setCustomUrl(getDefaultApiUrl());
      setShowConfig(false);
      onRetry();
    } catch {
      onRetry();
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const testHost = (customUrl.trim() || getDefaultApiUrl()).replace(/\/+$/, '');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${testHost}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        setTestStatus('SUCCESS: Server is reachable and healthy!');
      } else {
        setTestStatus(`HTTP ${res.status}: Server reached but returned error`);
      }
    } catch (err) {
      setTestStatus(err instanceof Error ? `FAILED: ${err.message}` : 'FAILED: Connection refused or timed out');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <WifiOff size={36} color="#EF4444" />
        </View>

        <Text style={styles.title}>Connecting to CdM LMS</Text>
        <Text style={styles.subtitle}>
          Unable to establish a connection with the CdM LMS web server. Ensure Next.js is running on your computer.
        </Text>

        {targetUrl && (
          <View style={styles.urlCard}>
            <View style={styles.urlHeader}>
              <Server size={14} color="#FF7517" />
              <Text style={styles.urlLabel}>Target Server Address</Text>
            </View>
            <Text style={styles.urlText}>{targetUrl}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorCard}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.buttonPrimary} onPress={onRetry} activeOpacity={0.8}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => setShowConfig(!showConfig)}
            activeOpacity={0.8}
          >
            <Settings size={16} color="#9CA3AF" />
            <Text style={styles.buttonSecondaryText}>{showConfig ? 'Hide Settings' : 'Server Settings'}</Text>
          </TouchableOpacity>
        </View>

        {showConfig && (
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Server IP / URL Override</Text>
            <Text style={styles.configSubtitle}>
              If your phone is on Wi-Fi or Hotspot, specify your computer&apos;s IP address (e.g. http://192.168.1.8:3000):
            </Text>

            <TextInput
              style={styles.input}
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="http://192.168.1.8:3000"
              placeholderTextColor="#555C72"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {testStatus && (
              <Text
                style={[
                  styles.testStatusText,
                  testStatus.startsWith('SUCCESS') ? styles.testSuccess : styles.testFailed,
                ]}
              >
                {testStatus}
              </Text>
            )}

            <View style={styles.configBtnRow}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestConnection}
                disabled={isTesting}
                activeOpacity={0.8}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                  <Text style={styles.testBtnText}>Test Server</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetUrl}
                activeOpacity={0.8}
              >
                <Text style={styles.resetBtnText}>Auto-detect</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveCustomUrl}
                activeOpacity={0.8}
              >
                <Check size={14} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#0F1117',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF44441A',
    borderWidth: 1,
    borderColor: '#EF444433',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 320,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF7517',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E2132',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonSecondaryText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },
  urlCard: {
    backgroundColor: '#1A1D27',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  urlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  urlLabel: {
    fontSize: 11,
    color: '#8B92A5',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  urlText: {
    fontSize: 12,
    color: '#F0F2F8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444415',
    borderColor: '#EF444433',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    maxWidth: 340,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  configCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#141721',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  configSubtitle: {
    fontSize: 11,
    color: '#8B92A5',
    lineHeight: 15,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0F1117',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 10,
  },
  testStatusText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
  },
  testSuccess: {
    color: '#10B981',
  },
  testFailed: {
    color: '#EF4444',
  },
  configBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  testBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E2132',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  testBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E2132',
  },
  resetBtnText: {
    color: '#8B92A5',
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF7517',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
