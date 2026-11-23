import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { API_BASE_URL } from '../../lib/constants';
import { courseCoverSource } from '../../lib/course-cover';

export function CourseCover({ value }: { value?: string | null }) {
  const token = useAuthStore(s => s.token);
  const source = courseCoverSource(value, API_BASE_URL, token);
  return <CoverImage key={`${value}:${token}`} source={source} />;
}
function CoverImage({ source }: { source: ReturnType<typeof courseCoverSource> }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.cover} aria-hidden>
    {source && !failed ? <Image source={source} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} /> : <BookOpen size={28} color="#FFFFFF" />}
  </View>;
}
const styles = StyleSheet.create({ cover: { width: '100%', aspectRatio: 3.2, backgroundColor: '#243B4B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' } });
