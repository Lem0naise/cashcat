'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/react-query-persist-client';


export function Providers({ children }: { children: React.ReactNode }) {
    const [isClient, setIsClient] = useState(false);
    const [persister, setPersister] = useState<Persister | undefined>(undefined);

    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 10, // 5 minutes - data is fresh for 5 min
                        gcTime: 1000 * 60 * 60 * 48, // 24 hours - keep in cache for 24h
                        retry: 3,
                        refetchOnWindowFocus: false,
                        networkMode: 'offlineFirst',
                    },
                    mutations: {
                        networkMode: 'offlineFirst',
                    },
                },
            })
    );

    // Only initialize persister on client
    useEffect(() => {
        setIsClient(true);

        const localStoragePersister = createAsyncStoragePersister({
            storage: {
                getItem: async (key) => {
                    const res = window.localStorage.getItem(key);
                    return res;
                },
                setItem: async (key, value) => {
                    window.localStorage.setItem(key, value);
                },
                removeItem: async (key) => {
                    window.localStorage.removeItem(key);
                },
            },
            key: 'cashcat-query-cache',
        });

        setPersister(localStoragePersister);
    }, []);


    if (!persister) {
        return <div className="min-h-screen bg-black" />;
    }

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
