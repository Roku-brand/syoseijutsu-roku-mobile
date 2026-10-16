import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

// Native Modal is outside the app shell's keyboard frame. Keep its own
// actions above the keyboard while retaining the existing Web layout.
export function KeyboardModalFrame({ children, style }: PropsWithChildren<{ style: StyleProp<ViewStyle> }>) {
  return Platform.OS === 'ios'
    ? <KeyboardAvoidingView behavior="padding" style={style}>{children}</KeyboardAvoidingView>
    : <View style={style}>{children}</View>;
}
