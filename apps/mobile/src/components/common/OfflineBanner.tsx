import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';

export function OfflineBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const translateY = React.useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsConnected(!offline);

      Animated.spring(translateY, {
        toValue: offline ? 0 : -50,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, [translateY]);

  if (isConnected) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLabel="Offline Mode Active: Showing cached data"
      style={[
        styles.container,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <WifiOff size={16} color="#92400E" />
      <Text style={styles.text}>Offline — Showing cached academic data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 999,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
});
