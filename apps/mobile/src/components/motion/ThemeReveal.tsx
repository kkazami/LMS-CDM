import type { ComponentRef, RefObject } from 'react';
import type { LayoutRectangle, View } from 'react-native';

export type ThemeRevealProps = {
  route: string;
  contentRef: RefObject<ComponentRef<typeof View> | null>;
  contentLayout: LayoutRectangle | null;
};

export function ThemeReveal(_props: ThemeRevealProps) {
  return null;
}
