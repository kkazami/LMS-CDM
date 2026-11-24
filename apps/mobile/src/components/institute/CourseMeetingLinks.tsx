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
  const isIcs = theme.code === 'ics';
  const [error, setError] = useState('');
  const links = googleMeetLinks(content);
  if (!links.length) return null;
  return <View style={{ marginTop: 12, gap: 8 }}>
    {links.map((url, index) => <Button key={url} title={links.length === 1 ? 'Join Google Meet' : `Join Google Meet ${index + 1}`} icon={Video} variant={isIcs ? "primary" : "outline"} textColor={isIcs ? '#FFFFFF' : undefined}
      style={isIcs && { alignSelf: 'flex-start', backgroundColor: '#B93406', borderColor: '#B93406', borderRadius: 10, paddingHorizontal: 13 }}
      textStyle={isIcs && { fontSize: 13 }} onPress={() => {
      setError('');
      void openSafeUrl(url, setError);
    }} />)}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>}
  </View>;
}
