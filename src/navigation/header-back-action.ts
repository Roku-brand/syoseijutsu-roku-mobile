import { createContext, type RefObject } from 'react';

export const HeaderBackAction = createContext<RefObject<(() => void) | null> | null>(null);
