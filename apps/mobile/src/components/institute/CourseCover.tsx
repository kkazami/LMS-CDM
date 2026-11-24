import React, { useState } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageSource, type ImageContentPosition } from 'expo-image';
import { BookOpen } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { API_BASE_URL } from '../../lib/constants';
import { courseCoverSource } from '../../lib/course-cover';

import { bundledCourseBannerSource } from '../../lib/mobile-course-banners';

type CoverOptions = { style?: StyleProp<ViewStyle>; fallback?: React.ReactNode; contentPosition?: ImageContentPosition };

export function CourseCover({ value, localUri, ...options }: CoverOptions & { value?: string | null; localUri?: string }) {
  const token = useAuthStore(s => s.token);
  const source = localUri ? { uri: localUri } : bundledCourseBannerSource(value) ?? courseCoverSource(value, API_BASE_URL, token);
  return <CoverImage key={localUri ?? value ?? ''} source={source} {...options} />;
}

function CoverImage({ source, style, contentPosition, fallback = <BookOpen size={28} color="#FFFFFF" /> }: CoverOptions & { source: ImageSource | number | null }) {
  const [failed, setFailed] = useState(false);
  return <View style={[styles.cover, style]} aria-hidden>
    {source && !failed
      ? <Image source={source} contentFit="cover" contentPosition={contentPosition} style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />
      : fallback}
  </View>;
}
const styles = StyleSheet.create({ cover: { backgroundColor: '#243B4B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' } });
