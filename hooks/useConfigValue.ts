import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useConfigValue(key: string, defaultValue: string): string {
    const row = useLiveQuery(() => db.config.get(key), [key]);
    return row?.value ?? defaultValue;
}
