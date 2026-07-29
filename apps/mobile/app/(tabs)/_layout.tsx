import { Tabs } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/auth-store';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Megaphone,
  Menu as MenuIcon,
  BarChart2,
  Users,
  Library,
} from 'lucide-react-native';

export default function TabLayout() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const role = (user?.role || 'STUDENT').toUpperCase();

  const isProfessor = role === 'PROFESSOR' || role === 'TEACHER';
  const isAdmin = role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="[institute]/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />

      {isAdmin ? (
        <Tabs.Screen
          name="[institute]/courses/index"
          options={{
            title: 'Courses',
            tabBarIcon: ({ color, size }) => <Library size={size} color={color} />,
          }}
        />
      ) : (
        <Tabs.Screen
          name="[institute]/courses/index"
          options={{
            title: isProfessor ? 'My Courses' : 'Courses',
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          }}
        />
      )}

      {isProfessor ? (
        <Tabs.Screen
          name="[institute]/grades/index"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
          }}
        />
      ) : isAdmin ? (
        <Tabs.Screen
          name="[institute]/grades/index"
          options={{
            title: 'Users',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          }}
        />
      ) : (
        <Tabs.Screen
          name="[institute]/grades/index"
          options={{
            title: 'Grades',
            tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
          }}
        />
      )}

      <Tabs.Screen
        name="[institute]/announcements/index"
        options={{
          title: 'Announcements',
          tabBarIcon: ({ color, size }) => <Megaphone size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="[institute]/more/index"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MenuIcon size={size} color={color} />,
        }}
      />

      {/* Hidden screens from bottom bar, accessed via stack or More menu */}
      <Tabs.Screen name="[institute]/_layout" options={{ href: null }} />
      <Tabs.Screen name="[institute]/assignments/index" options={{ href: null }} />
      <Tabs.Screen name="[institute]/leaderboards/index" options={{ href: null }} />
      <Tabs.Screen name="[institute]/tasks/index" options={{ href: null }} />
      <Tabs.Screen name="[institute]/activities/index" options={{ href: null }} />
      <Tabs.Screen name="[institute]/profile/index" options={{ href: null }} />
      <Tabs.Screen name="[institute]/courses/[courseId]" options={{ href: null }} />
      <Tabs.Screen name="[institute]/more/settings" options={{ href: null }} />
      <Tabs.Screen name="[institute]/more/help" options={{ href: null }} />
      <Tabs.Screen name="[institute]/more/privacy" options={{ href: null }} />
    </Tabs>
  );
}
