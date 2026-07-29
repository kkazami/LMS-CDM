import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FlaskConical } from 'lucide-react-native';
import { Button } from './Button';

export function UnderDevelopment() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}>
        <View style={[styles.iconWrapper, { backgroundColor: theme.colors.primary + '20' }]}>
          <FlaskConical size={48} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>Interactive Labs</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primary }]}>Coming Soon to Mobile</Text>
        <Text style={[styles.description, { color: theme.colors.sidebarMuted }]}>
          Immersive 3D learning experiences including PC Building, Arduino Circuits, Server Rack Assembly, Logic Gates, and Code Lab are currently available on the web platform.
        </Text>
        <Button
          title="Open Web Version"
          variant="outline"
          onPress={() => {
            // Future implementation for opening web view or external link
          }}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    width: '100%',
  },
});
