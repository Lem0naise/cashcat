import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

import { useTransactions } from './useTransactions';
import { useCategories } from './useCategories';
import { useAssignments } from './useAssignments';
import { useTransfers } from './useTransfers';
import { useGroups } from './useGroups';
import { useAccounts, useAllAccounts } from './useAccounts';
import { useVendors } from './useVendors';

export const useSyncAll = () => {
    const [isSyncing, setIsSyncing] = useState(false);

    // We get the query results just to have access to their refetch methods
    // In TanStack Query v5 or with specific configurations, we could also use queryClient.invalidateQueries
    // but calling refetch explicitly ensures we trigger the fetch even if data is "fresh".
    const { refetch: refetchTransactions } = useTransactions();
    const { refetch: refetchCategories } = useCategories();
    const { refetch: refetchAssignments } = useAssignments();
    const { refetch: refetchTransfers } = useTransfers();
    const { refetch: refetchGroups } = useGroups();
    const { refetch: refetchAccounts } = useAccounts();
    const { refetch: refetchAllAccounts } = useAllAccounts();
    const { refetch: refetchVendors } = useVendors();

    const syncAll = useCallback(async () => {
        // 1. Check offline status
        if (!navigator.onLine) {
            toast.error('You are offline. Cannot sync.');
            return;
        }

        try {
            setIsSyncing(true);

            // 2. Trigger all refetches
            // We use Promise.all to run them in parallel
            await Promise.all([
                refetchTransactions(),
                refetchCategories(),
                refetchAssignments(),
                refetchTransfers(),
                refetchGroups(),
                refetchAccounts(),
                refetchAllAccounts(),
                refetchVendors()
            ]);

            // Optional: minimal success feedback or just stop spinning
            // User requested: "Make the sync button show the syncing progress... and THEN close... only once its done"
            // So we just finish here, and the caller handles the UI state via isSyncing.
            toast.success('Synced successfully');

        } catch (error) {
            console.error('Sync failed:', error);
            toast.error('Sync failed. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    }, [
        refetchTransactions,
        refetchCategories,
        refetchAssignments,
        refetchTransfers,
        refetchGroups,
        refetchAccounts,
        refetchAllAccounts,
        refetchVendors
    ]);

    return {
        syncAll,
        isSyncing
    };
};
