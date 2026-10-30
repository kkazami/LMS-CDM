import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MoreMenuDrawer } from '../../../../src/components/navigation/MoreMenuDrawer';
import { FloatingPillTabBar } from '../../../../src/components/navigation/FloatingPillTabBar';
import { ChatbotFAB } from '../../../../src/components/chatbot/ChatbotFAB';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { isIcsUser } from '../../../../src/lib/ite-eligibility';

export default function StudentTabsLayout() {
  const ics = isIcsUser(useAuthStore(s => s.user));
  return (
    <MoreMenuDrawer role="STUDENT">
      <View style={styles.container}>
        <Tabs
          tabBar={(props) => <FloatingPillTabBar {...props} role="STUDENT" />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
            }}
          />
          <Tabs.Screen
            name="courses"
            options={{
              title: 'Courses',
            }}
          />
          <Tabs.Screen
            name="grades"
            options={{
              title: 'Grades',
            }}
          />
          <Tabs.Screen
            name="alerts"
            options={{
              title: 'Alerts',
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
            }}
          />
          <Tabs.Screen name="agenda" options={{ title: 'Agenda', href: null }} />
          <Tabs.Screen name="community" options={{ title: 'Community', href: null }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile', href: null }} />
        </Tabs>
        <ChatbotFAB />
      </View>
    </MoreMenuDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
