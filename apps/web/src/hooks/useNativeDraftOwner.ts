'use client';
import { useEffect, useState } from 'react';
export function useNativeDraftOwner() {
  const [owner, setOwner] = useState('');
  useEffect(() => {
    const update = () => setOwner((window as Window & { __LMS_NATIVE_OWNER__?: string }).__LMS_NATIVE_OWNER__ ?? '');
    update();
    window.addEventListener('lms:native-ready', update);
    return () => window.removeEventListener('lms:native-ready', update);
  }, []);
  return owner;
}
