import { Platform, PixelRatio, TextStyle } from 'react-native';

const fontScale = PixelRatio.getFontScale();

export const typography = {
  // Display Hero
  displayLg: {
    fontSize: Math.round(28 * fontScale),
    lineHeight: Math.round(34 * fontScale),
    fontWeight: '700',
  } as TextStyle,
  displayMd: {
    fontSize: Math.round(24 * fontScale),
    lineHeight: Math.round(30 * fontScale),
    fontWeight: '700',
  } as TextStyle,

  // Headings
  headingLg: {
    fontSize: Math.round(20 * fontScale),
    lineHeight: Math.round(26 * fontScale),
    fontWeight: '600',
  } as TextStyle,
  headingMd: {
    fontSize: Math.round(18 * fontScale),
    lineHeight: Math.round(24 * fontScale),
    fontWeight: '600',
  } as TextStyle,
  headingSm: {
    fontSize: Math.round(16 * fontScale),
    lineHeight: Math.round(22 * fontScale),
    fontWeight: '600',
  } as TextStyle,

  // Body
  bodyLg: {
    fontSize: Math.round(16 * fontScale),
    lineHeight: Math.round(24 * fontScale),
    fontWeight: '400',
  } as TextStyle,
  bodyMd: {
    fontSize: Math.round(14 * fontScale),
    lineHeight: Math.round(20 * fontScale),
    fontWeight: '400',
  } as TextStyle,
  bodySm: {
    fontSize: Math.round(12 * fontScale),
    lineHeight: Math.round(16 * fontScale),
    fontWeight: '400',
  } as TextStyle,

  // Labels & Chips
  label: {
    fontSize: Math.round(12 * fontScale),
    lineHeight: Math.round(16 * fontScale),
    fontWeight: '500',
    letterSpacing: 0.5,
  } as TextStyle,

  // Tabular Numbers (Grades, EXP, Streaks, Points)
  tabular: {
    fontSize: Math.round(16 * fontScale),
    lineHeight: Math.round(22 * fontScale),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  tabularLg: {
    fontSize: Math.round(24 * fontScale),
    lineHeight: Math.round(30 * fontScale),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  tabularSm: {
    fontSize: Math.round(13 * fontScale),
    lineHeight: Math.round(18 * fontScale),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
};

export const TOUCH_TARGET = Platform.select({
  ios: 44,
  android: 48,
  default: 48,
});
