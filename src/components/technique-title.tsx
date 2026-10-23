import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { layoutTechniqueTitle, type TitleLayout } from '@/lib/technique-title-layout';

export function TechniqueTitle({ title, minimumFontSize = 16, maxLines, style, onLayout, ...props }: Omit<TextProps, 'children' | 'numberOfLines'> & { title: string; minimumFontSize?: number; maxLines?: number }) {
  const ref = useRef<Text>(null);
  const [width, setWidth] = useState(0);
  const [layout, setLayout] = useState<(TitleLayout & { title: string }) | null>(null);
  const { fontScale } = useWindowDimensions();
  const flattened = StyleSheet.flatten(style) ?? {};
  const baseSize = flattened.fontSize ?? 20;
  const family = flattened.fontFamily ?? fonts.serif;
  const weight = flattened.fontWeight ?? '600';
  const letterSpacing = flattened.letterSpacing ?? 0;
  const lineRatio = (flattened.lineHeight ?? baseSize * 1.5) / baseSize;

  useEffect(() => {
    if (!width) return;
    let disposed = false;
    const update = () => {
      if (disposed) return;
      const context = Platform.OS === 'web' && typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
      const actualFamily = context && ref.current ? getComputedStyle(ref.current as unknown as HTMLElement).fontFamily : family;
      const scale = props.allowFontScaling === false ? 1 : fontScale;
      const next = layoutTechniqueTitle(title, width, baseSize, minimumFontSize, (text, size) => {
        if (context) {
          context.font = `${weight} ${size}px ${actualFamily}`;
          return context.measureText(text).width + Math.max(0, [...text].length - 1) * letterSpacing;
        }
        return [...text].reduce((sum, char) => sum + (/^[\x20-\x7e]$/.test(char) ? 0.6 : 1), 0) * size * scale + Math.max(0, [...text].length - 1) * letterSpacing;
      });
      setLayout(previous => previous?.title === title && previous.fontSize === next.fontSize && previous.lines.join('\n') === next.lines.join('\n') ? previous : { ...next, title });
    };
    update();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      void document.fonts?.ready.then(update);
      document.fonts?.addEventListener('loadingdone', update);
    }
    return () => {
      disposed = true;
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.fonts?.removeEventListener('loadingdone', update);
    };
  }, [baseSize, family, fontScale, letterSpacing, minimumFontSize, props.allowFontScaling, title, weight, width]);

  const current = layout?.title === title ? layout : null;
  const lines = current?.lines ?? [title];
  return <Text {...props} numberOfLines={maxLines} ref={ref} accessibilityLabel={props.accessibilityLabel ?? title} onLayout={event => { setWidth(event.nativeEvent.layout.width); onLayout?.(event); }} style={[{ color: colors.ink, fontFamily: fonts.serif, alignSelf: 'stretch' }, style, current && { fontSize: current.fontSize, lineHeight: Math.ceil(current.fontSize * lineRatio) }]}>
    {Platform.OS === 'web' ? current ? lines.map((line, index) => <Text key={index} style={webLineStyle}>{line}</Text>) : title : lines.join('\n')}
  </Text>;
}

const webLineStyle = { display: 'block', whiteSpace: 'nowrap' } as unknown as TextStyle;
