# CdM typography

Manrope matches `apps/web/src/app/layout.tsx`; DM Serif Display matches the public display family in `apps/web/src/lib/public-fonts.ts`.

Sources: Google Fonts `google/fonts` repository, `ofl/manrope/Manrope[wght].ttf` and `ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf`. Original OFL licenses are bundled alongside the fonts. No remote font request is needed at runtime.

Manrope Regular (400), Medium (500), SemiBold (600), Bold (700), and ExtraBold (800) are static instances generated with fontTools 4.62.1 `instantiateVariableFont` at the corresponding `wght` values. Names 1/2/4/6 are set to Manrope / weight / Manrope weight / Manrope-weight. Expo SDK 57 uses these static files rather than relying on variable-font weight support. The files are registered under their explicit family/weight aliases by `MobilePresentationProvider`.

Fonts load only for the enabled authenticated ICS presentation. Existing screens outside that scope retain their font behavior. A local font-load failure falls back to system typography so coursework remains usable.
