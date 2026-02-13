'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';

const SYNC_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const LS_KEY = 'cashcat-lunchflow-last-sync';

export type SyncResult = {
    synced: number;
    accounts: number;
    skipped: number;
    errors: string[];
    message?: string;
};

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useLunchFlowSync() {
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [lastResult, setLastResult] = useState<SyncResult | null>(null);
    const queryClient = useQueryClient();
    const hasAutoSynced = useRef(false);

    const syncLunchFlow = useCallback(async (options?: { silent?: boolean }): Promise<SyncResult | null> => {
        const supabase = createClientComponentClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            if (!options?.silent) {
                toast.error('Not authenticated');
            }
            return null;
        }

        setStatus('syncing');

        try {
            const res = await fetch('/api/v1/lunchflow/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Sync failed');
            }

            const result: SyncResult = data;
            setLastResult(result);
            setStatus('success');

            // Update last sync timestamp
            localStorage.setItem(LS_KEY, Date.now().toString());

            // Invalidate queries to refresh UI
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['accounts'] });

            // Show result toast
            if (!options?.silent) {
                if (result.message) {
                    // No linked accounts message
                    toast(result.message, { icon: 'ℹ️', duration: 4000 });
                } else if (result.synced > 0) {
                    toast.success(
                        `Synced ${result.synced} transaction${result.synced !== 1 ? 's' : ''} from ${result.accounts} account${result.accounts !== 1 ? 's' : ''}`,
                        { duration: 4000 }
                    );
                } else {
                    toast.success('Lunch Flow: already up to date', { duration: 2000 });
                }
            }

            if (result.errors.length > 0) {
                for (const err of result.errors) {
                    toast.error(err, { duration: 5000 });
                }
            }

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sync failed';
            setStatus('error');

            if (!options?.silent) {
                // Don't show error for "no API key" - it just means LF isn't configured
                if (!message.includes('No Lunch Flow API key')) {
                    toast.error(`Lunch Flow sync: ${message}`);
                }
            }

            return null;
        }
    }, [queryClient]);

    // Auto-sync on mount if cooldown has elapsed
    useEffect(() => {
        if (hasAutoSynced.current) return;
        hasAutoSynced.current = true;

        const lastSyncStr = localStorage.getItem(LS_KEY);
        const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
        const elapsed = Date.now() - lastSync;

        if (elapsed >= SYNC_COOLDOWN_MS) {
            // Auto-sync silently
            syncLunchFlow({ silent: true });
        }
    }, [syncLunchFlow]);

    return {
        syncLunchFlow,
        status,
        isSyncing: status === 'syncing',
        lastResult,
    };
}
