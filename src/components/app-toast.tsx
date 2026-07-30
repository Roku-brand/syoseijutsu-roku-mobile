import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { AppText } from './ui';

const ToastContext = createContext<(message: string) => void>(() => undefined);

export function AppToastProvider({ children }: { children: ReactNode }) {
  const { width } = useHydratedWindowDimensions();
  const [message, setMessage] = useState('');
  const [toastKey, setToastKey] = useState(0);

  const showToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    setToastKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 1800);
    return () => clearTimeout(timeout);
  }, [message, toastKey]);

  const value = useMemo(() => showToast, [showToast]);
  const desktop = width >= 1000;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <View
          accessibilityRole="alert"
          pointerEvents="none"
          style={[
            styles.toast,
            desktop ? styles.toastDesktop : styles.toastMobile,
          ]}
        >
          <AppText style={styles.mark}>◆</AppText>
          <AppText style={styles.message}>{message}</AppText>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    zIndex: 100,
    minHeight: 48,
    maxWidth: 420,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    backgroundColor: colors.charcoal,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 12,
  },
  toastMobile: { left: 24, right: 24, bottom: 86 },
  toastDesktop: { left: 116, bottom: 28 },
  mark: { color: colors.goldLight, fontSize: 11 },
  message: {
    color: colors.surface,
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
});
