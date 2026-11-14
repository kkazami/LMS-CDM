import React, { useRef, useState } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { MobileCourse } from '@lms/types';
import { FormModal } from '../ui/FormModal';
import { Text } from '../ui/Text';
import { Button } from '../common/Button';
import { SurfacePressable } from '../motion/SurfacePressable';
import { CourseCover } from './CourseCover';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { scopeIsCurrent, studentScope } from '../../lib/student-scope';
import { useAnnouncement } from '../../hooks/useAnnouncement';
import { courseCoverSource, courseCoverUploadFile } from '../../lib/course-cover';
import { mobileCourseBanners, mobileCourseBannerSource } from '../../lib/mobile-course-banners';
import { API_BASE_URL } from '../../lib/constants';

const presets = [['programming', 'Programming'], ['database', 'Database'], ['networking', 'Networking'], ['webdev', 'Web development'], ['cybersecurity', 'Cybersecurity']] as const;
type Target = 'mobile' | 'web';
type Draft = { selected: string | null; photo: ImagePicker.ImagePickerAsset | null; changed: boolean };

export function CourseCoverEditor({ course, onClose }: { course: MobileCourse; onClose: () => void }) {
  const theme = useTheme(), client = useQueryClient();
  const { height, insets } = useResponsive();
  const api = useAuthStore(s => s.api), user = useAuthStore(s => s.user), token = useAuthStore(s => s.token);
  const scope = useRef(studentScope()).current;
  const [target, setTarget] = useState<Target>('mobile');
  const [drafts, setDrafts] = useState<Record<Target, Draft>>({
    mobile: { selected: course.mobileCoverImage || null, photo: null, changed: false },
    web: { selected: course.coverImage || null, photo: null, changed: false },
  });
  const [busy, setBusy] = useState(false), [picking, setPicking] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  const draft = drafts[target], changed = drafts.web.changed || drafts.mobile.changed;
  const mobileReady = Object.hasOwn(course, 'mobileCoverImage');
  const preview = target === 'mobile' && !draft.selected && !draft.photo ? drafts.web : draft;
  const previewSource = preview.photo ? { uri: preview.photo.uri } : mobileCourseBannerSource(preview.selected) || courseCoverSource(preview.selected, API_BASE_URL, token);
  useAnnouncement(error || (busy ? 'Saving class images' : undefined), true);
  function change(selected: string | null, photo: ImagePicker.ImagePickerAsset | null = null) {
    setDrafts(previous => ({ ...previous, [target]: { selected, photo, changed: true } })); setError('');
  }
  async function pick() {
    if (pending.current || picking) return;
    setPicking(true); setError('');
    const pickedTarget = target;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: pickedTarget === 'mobile' ? [1, 1] : [16, 5], quality: 0.85 });
      if (!scopeIsCurrent(scope) || result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) { setError('Choose an image smaller than 25 MB.'); return; }
      setDrafts(previous => ({ ...previous, [pickedTarget]: { selected: asset.uri, photo: asset, changed: true } }));
    } catch (cause) {
      if (scopeIsCurrent(scope)) setError(cause instanceof Error && cause.message.includes('unregistered ActivityResultLauncher')
        ? 'Close and reopen CdM LMS to reconnect the photo library. Your class images are unchanged.'
        : 'The photo library could not open. Check photo access and try again.');
    } finally { setPicking(false); }
  }
  async function save() {
    if (pending.current || picking || !changed || !scopeIsCurrent(scope)) return;
    if (drafts.mobile.changed && !mobileReady) { setError('Mobile image saving will be available after the LMS update.'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const images: { coverImage?: string | null; mobileCoverImage?: string | null } = {};
      for (const destination of ['web', 'mobile'] as const) {
        const next = drafts[destination];
        if (!next.changed) continue;
        let value = next.selected;
        if (next.photo) {
          const file = courseCoverUploadFile(next.photo);
          const uploaded = await api.upload.file(next.photo.uri, file.fileName, file.mimeType);
          if (!scopeIsCurrent(scope)) return;
          value = uploaded.url;
        }
        if (destination === 'web') images.coverImage = value;
        else images.mobileCoverImage = value;
      }
      if (!scopeIsCurrent(scope)) return;
      const saved = await api.courses.updateCoverImages(course.id, images);
      if (!scopeIsCurrent(scope)) return;
      if (Object.keys(images).some(key => saved[key as keyof typeof images] !== images[key as keyof typeof images])) throw new Error('Image changes were not confirmed. Refresh the class and try again.');
      await client.invalidateQueries({ queryKey: ['ics-dashboard', user?.id, user?.institute.code] });
      if (scopeIsCurrent(scope)) {
        if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility('Class images saved.');
        onClose();
      }
    } catch (cause) { if (scopeIsCurrent(scope)) setError(cause instanceof Error ? cause.message : 'The images could not save. Try again.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <FormModal visible title="Class images" style={{ maxHeight: Math.max(0, height - insets.top - insets.bottom - 32) }} onClose={() => { if (!pending.current && !picking) onClose(); }}
    actions={<>{!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger, marginBottom: 12 }}>{error}</Text>}<Button title={busy ? 'Saving images…' : 'Save changes'} loading={busy} disabled={picking || busy || !changed || (!mobileReady && drafts.mobile.changed)} onPress={() => { void save(); }} /><Button title="Cancel" variant="ghost" disabled={busy || picking} onPress={onClose} /></>}>
    <View style={{ gap: 16 }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>{(['mobile', 'web'] as const).map(value => <SurfacePressable key={value} accessibilityRole="tab" accessibilityState={{ selected: target === value }} disabled={busy || picking} onPress={() => { setTarget(value); setError(''); }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: target === value ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.cardSecondary }}><Text style={{ color: theme.colors.text, fontWeight: target === value ? '700' : '500' }}>{value === 'mobile' ? 'Mobile thumbnail' : 'Web cover'}</Text></SurfacePressable>)}</View>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22 }}>{target === 'mobile' ? 'Choose a square banner or photo for the mobile tile. Your wide web cover stays separate.' : 'Choose the wide cover shown in the web app. Your mobile thumbnail stays separate.'}</Text>
      {target === 'mobile' ? <>
        <View testID="course-mobile-image-preview" accessibilityLabel="Mobile course card preview" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: theme.colors.cardSecondary }}>
          <View style={{ width: 58, height: 64, borderRadius: 16, backgroundColor: '#243B4B', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={25} color="#FFFFFF" />
            {!!previewSource && <Image source={previewSource} contentFit={preview.selected?.startsWith('/course-banners/') ? 'contain' : 'cover'} style={{ position: 'absolute', inset: 0 }} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{course.courseCode || course.code}{course.section ? ` · ${course.section}` : ''}</Text><Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' }}>{course.title}</Text></View>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </View>
        {!draft.selected && <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Currently using the web cover.</Text>}
        {!mobileReady && <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Mobile image saving will be available after the LMS update.</Text>}
      </> : <View style={{ borderRadius: 16, overflow: 'hidden' }}>{draft.photo ? <Image source={{ uri: draft.photo.uri }} contentFit="cover" style={{ width: '100%', aspectRatio: 3.2 }} /> : <CourseCover value={draft.selected} />}</View>}
      <Button title={picking ? 'Opening photos…' : target === 'mobile' ? 'Choose mobile photo' : 'Choose web photo'} variant="outline" disabled={busy || picking} onPress={() => { void pick(); }} />
      {target === 'mobile' && <>
        <Text accessibilityRole="header" style={{ color: theme.colors.text, fontWeight: '700' }}>Mobile class banners</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{mobileCourseBanners.map(banner => {
          const selected = draft.selected === banner.value;
          return <SurfacePressable key={banner.id} accessibilityRole="button" accessibilityLabel={`${banner.label} mobile banner`} accessibilityState={{ selected }} disabled={busy || picking} onPress={() => change(banner.value)} style={{ width: '48%', padding: 10, gap: 8, alignItems: 'center', borderWidth: 1, borderRadius: 12, borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.cardSecondary }}>
            <Image source={banner.source} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 12 }} accessible={false} />
            <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{banner.label}</Text>
            <View style={{ height: 18 }}>{selected && <CheckCircle2 size={18} color={theme.colors.text} accessible={false} />}</View>
          </SurfacePressable>;
        })}</View>
      </>}
      {target === 'web' && <>
        <Text accessibilityRole="header" style={{ color: theme.colors.text, fontWeight: '700' }}>Class banners</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{presets.map(([id, label]) => {
          const value = `/course-banners/${id}.svg`;
          return <SurfacePressable key={id} accessibilityRole="button" accessibilityState={{ selected: draft.selected === value }} accessibilityLabel={`${label} banner`} disabled={busy || picking} onPress={() => change(value)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, borderColor: draft.selected === value ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.cardSecondary }}><Text style={{ color: theme.colors.text }}>{label}{draft.selected === value ? ' ✓' : ''}</Text></SurfacePressable>;
        })}</View>
      </>}
      <Button title={target === 'mobile' ? 'Use web cover on mobile' : 'Remove web cover'} variant="ghost" disabled={busy || picking} onPress={() => change(null)} />
    </View>
  </FormModal>;
}
