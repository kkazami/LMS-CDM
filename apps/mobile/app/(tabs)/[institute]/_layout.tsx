import { useEffect } from 'react';
import { Tabs, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/stores/auth-store';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Megaphone,
  Menu as MenuIcon,
} from 'lucide-react-native';

export default function InstituteTabsLayout() {
  const router = useRouter();
  const { institute } = useLocalSearchParams<{ institute: string }>();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const role = (user?.role || 'STUDENT').toUpperCase();

  useEffect(() => {
    if (user?.institute?.code && institute) {
      const userInst = user.institute.code.toLowerCase();
      if (userInst !== institute.toLowerCase()) {
        router.replace(`/(tabs)/${userInst}`);
      }
    }
  }, [user, institute, router]);

  const isProfessor = role === 'PROFESSOR' || role === 'TEACHER';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <LayoutDashboard size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="courses/index"
        options={{
          title: isProfessor ? 'My Classes' : 'Courses',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <BookOpen size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="grades/index"
        options={{
          title: isProfessor ? 'Analytics' : 'Grades',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Trophy size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="announcements/index"
        options={{
          title: 'Announcements',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Megaphone size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="more/index"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MenuIcon size={size} color={color} />,
        }}
      />

      {/* Hidden Subroutes */}
      <Tabs.Screen name="assignments/index" options={{ href: null }} />
      <Tabs.Screen name="leaderboards/index" options={{ href: null }} />
      <Tabs.Screen name="tasks/index" options={{ href: null }} />
      <Tabs.Screen name="activities/index" options={{ href: null }} />
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="courses/[courseId]" options={{ href: null }} />
      <Tabs.Screen name="flashcards/index" options={{ href: null }} />
      <Tabs.Screen name="achievements/index" options={{ href: null }} />
      <Tabs.Screen name="materials/index" options={{ href: null }} />
      <Tabs.Screen name="more/settings" options={{ href: null }} />
      <Tabs.Screen name="more/help" options={{ href: null }} />
      <Tabs.Screen name="more/privacy" options={{ href: null }} />
    </Tabs>
  );
}
