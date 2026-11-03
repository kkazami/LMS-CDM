import React, { useEffect, useRef } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../common/Button';
export function AttendanceScanner({ onScan, onClose }: { onScan: (token: string) => void; onClose: () => void }) {
  const scanned = useRef(false);
  useEffect(() => { const listener = AppState.addEventListener('change', state => { if (state !== 'active') onClose(); }); return () => listener.remove(); }, [onClose]);
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.screen}><Text style={styles.title}>Scan attendance QR</Text><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={result => { if (!scanned.current) { scanned.current = true; onScan(result.data); } }} /><View style={styles.footer}><Button title="Close scanner" onPress={onClose} /></View></SafeAreaView></Modal>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#0F1724' }, title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', padding: 20 }, camera: { flex: 1 }, footer: { padding: 20 } });
