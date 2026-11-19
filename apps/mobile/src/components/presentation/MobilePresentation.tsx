import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { View } from 'react-native';
import * as Font from 'expo-font';
import { useAuthStore } from '../../stores/auth-store';
import { studentScope } from '../../lib/student-scope';
import { selectMobilePresentation } from '../../lib/mobile-presentation';

const Context = createContext({ isIcsV2: false, fontsReady: false, toolsReturnFocus: { current: null as React.ComponentRef<typeof View> | null } });
let fontLoad: Promise<void> | undefined;

export function MobilePresentationProvider({ children, subtree }: { children: React.ReactNode; subtree: 'student' | 'teacher' }) {
  const auth = useAuthStore();
  const eligible = selectMobilePresentation(auth, subtree, process.env.EXPO_PUBLIC_ICS_UI_V2 === 'true') === 'ics';
  const isIcsV2 = eligible;
  const [fontsReady, setFontsReady] = useState(false);
  const toolsReturnFocus = useRef<React.ComponentRef<typeof View> | null>(null);
  useEffect(() => {
    if (!eligible) return;
    let current = true;
    fontLoad ??= Font.loadAsync({
      'Manrope-Regular': require('../../../assets/fonts/Manrope-Regular.ttf'),
      'Manrope-Medium': require('../../../assets/fonts/Manrope-Medium.ttf'),
      'Manrope-SemiBold': require('../../../assets/fonts/Manrope-SemiBold.ttf'),
      'Manrope-Bold': require('../../../assets/fonts/Manrope-Bold.ttf'),
      'Manrope-ExtraBold': require('../../../assets/fonts/Manrope-ExtraBold.ttf'),
      'DMSerifDisplay-Regular': require('../../../assets/fonts/DMSerifDisplay-Regular.ttf'),
    }).catch(error => { fontLoad = undefined; throw error; });
    void fontLoad.then(() => { if (current) setFontsReady(true); }).catch(() => {
      // Keep coursework usable with system fonts if local font loading fails.
    });
    return () => { current = false; };
  }, [eligible]);
  const identity = `${auth.user?.id}:${auth.user?.institute.code}:${auth.user?.role}:${studentScope().epoch}`;
  const value = useMemo(() => ({ isIcsV2, fontsReady: eligible && fontsReady, toolsReturnFocus }), [isIcsV2, eligible, fontsReady]);
  return <Context.Provider value={value}>
    <React.Fragment key={identity}>{children}</React.Fragment>
  </Context.Provider>;
}

export function useMobilePresentation() { return useContext(Context); }
