import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MoreMenuDrawer } from '../../../../src/components/navigation/MoreMenuDrawer';
import { FloatingPillTabBar } from '../../../../src/components/navigation/FloatingPillTabBar';
import { ChatbotFAB } from '../../../../src/components/chatbot/ChatbotFAB';

export default function StudentTabsLayout() {
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
