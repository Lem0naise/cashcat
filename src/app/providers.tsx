'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/react-query-persist-client';

// Create a no-op persister for SSR (will be replaced on client)
const createNoopPersister = (): Persister => ({
    persistClient: async () => { },
    restoreClient: async () => undefined,
    removeClient: async () => { },
});

export function Providers({ children }: { children: React.ReactNode }) {
    const [isClient, setIsClient] = useState(false);
    const [persister, setPersister] = useState<Persister>(createNoopPersister());

    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 min
                        gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache for 24h
                        retry: 3,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    // Only initialize IndexedDB persister on client
    useEffect(() => {
        setIsClient(true);

        // Dynamically import idb-keyval to avoid SSR issues
        Promise.all([
            import('@tanstack/query-async-storage-persister'),
            import('idb-keyval')
        ]).then(([{ createAsyncStoragePersister }, { get, set, del }]) => {
            const idbStorage = {
                getItem: async (key: string) => {
                    try {
                        const value = await get(key);
                        return value ?? null;
                    } catch (e) {
                        console.warn('IndexedDB getItem error:', e);
                        return null;
                    }
                },
                setItem: async (key: string, value: string) => {
                    try {
                        await set(key, value);
                    } catch (e) {
                        console.warn('IndexedDB setItem error:', e);
                    }
                },
                removeItem: async (key: string) => {
                    try {
                        await del(key);
                    } catch (e) {
                        console.warn('IndexedDB removeItem error:', e);
                    }
                },
            };

            const asyncPersister = createAsyncStoragePersister({
                storage: idbStorage,
                key: 'cashcat-query-cache',
            });

            setPersister(asyncPersister);
        }).catch((e) => {
            console.warn('Failed to initialize IndexedDB persister:', e);
        });
    }, []);

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                dehydrateOptions: {
                    shouldDehydrateQuery: (query) => query.state.status === 'success',
                },
            }}
            onSuccess={() => {
                queryClient.resumePausedMutations().then(() => {
                    queryClient.invalidateQueries();
                });
            }}
        >
            {children}
            {isClient && <ReactQueryDevtools initialIsOpen={false} />}
        </PersistQueryClientProvider>
    );
}
