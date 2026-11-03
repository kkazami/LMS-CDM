import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, AppHeader } from '../../../../src/components/ui';
import { Button } from '../../../../src/components/common/Button';
import { ProfileEditModal } from '../../../../src/components/profile/ProfileEditModal';
import { useMoreMenu } from '../../../../src/components/navigation/MoreMenuDrawer';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useThemeStore } from '../../../../src/stores/theme-store';
export default function StudentProfile() {
  const user = useAuthStore(s => s.user), theme = useTheme(), router = useRouter();
  const [editing, setEditing] = useState(false);
  const { openMenu } = useMoreMenu();
  return <Screen scroll withBottomInset contentContainerStyle={{ padding: 20 }}><AppHeader title="Profile" />
    <View style={{ gap: 8, marginBottom: 24 }}><Text style={{ color: theme.colors.text, fontSize: 24, lineHeight: 32, fontWeight: '700' }}>{user?.name}</Text><Text style={{ color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24 }}>{user?.email}</Text><Text style={{ color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24 }}>{[user?.department, user?.yearLevel].filter(Boolean).join(' · ') || user?.institute.name}</Text>{!!user?.bio && <Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24 }}>{user.bio}</Text>}</View>
    <Button title="Edit profile" onPress={() => setEditing(true)} />
    <Button title="Grades and feedback" variant="ghost" onPress={() => router.push('/student/grades' as any)} />
    <Button title="Inbox" variant="ghost" onPress={() => router.push('/student/alerts' as any)} />
    <Button title="Achievements" variant="ghost" onPress={() => router.push('/student/achievements' as any)} />
    <Button title={theme.isDark ? 'Use light appearance' : 'Use dark appearance'} variant="ghost" onPress={() => { void useThemeStore.getState().toggleTheme(); }} />
    <Button title="Use device appearance" variant="ghost" onPress={() => { void useThemeStore.getState().setThemePreference('system'); }} />
    <Button title="More tools and settings" variant="ghost" onPress={openMenu} />
    <ProfileEditModal visible={editing} onClose={() => setEditing(false)} />
  </Screen>;
}
