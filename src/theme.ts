import { Ionicons } from '@expo/vector-icons';
import type { ExpenseCategory } from './types';

export const C = {
  green: '#1B4D2E', greenDark: '#143A22', cream: '#F4F2EA', card: '#FFFFFF',
  lime: '#D8F06A', text: '#1E2A22', muted: '#7A8579', border: '#E3E0D3',
  red: '#D64545', redBg: '#FBECEC', amber: '#E8A33D', amberBg: '#FCF3E0', mint: '#E3EFE0',
};
export const CAT: Record<ExpenseCategory, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  Food: { color: '#2E7D4F', icon: 'restaurant' },
  Transportation: { color: '#E8A33D', icon: 'bus' },
  School: { color: '#4C8BC9', icon: 'school' },
  Personal: { color: '#B279C9', icon: 'person' },
  Savings: { color: '#7BC47F', icon: 'wallet' },
};
export const CATS = Object.keys(CAT) as ExpenseCategory[];
