'use client';

import { useEffect } from 'react';
import { maybeRunDailyBackup } from '@/lib/backup';

export default function BackupProvider() {
    useEffect(() => {
        void maybeRunDailyBackup();
    }, []);

    return null;
}
