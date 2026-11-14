import React, { useState } from 'react';
import { View } from 'react-native';
import { Video } from 'lucide-react-native';
import { Button } from '../common/Button';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { googleMeetLinks } from '../../lib/links';
import { openSafeUrl } from '../../lib/open-link';

export function CourseMeetingLinks({ content }: { content: string }) {
  const theme = useTheme();
  const [error, setError] = useState('');
  const links = googleMeetLinks(content);
  if (!links.length) return null;
  return <View style={{ marginTop: 12, gap: 8 }}>
    {links.map((url, index) => <Button key={url} title={links.length === 1 ? 'Join Google Meet' : `Join Google Meet ${index + 1}`} icon={Video} variant="outline" onPress={() => {
      setError('');
      void openSafeUrl(url, setError);
    }} />)}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>}
  </View>;
}
