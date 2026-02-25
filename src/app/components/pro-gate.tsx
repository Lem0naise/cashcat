'use client';

import { ProGateOverlay } from './pro-gate-overlay';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabase } from '@/app/contexts/supabase-provider';

interface ProGateProps {
    children: React.ReactNode;
    /** Name of the Pro feature, shown in the gate overlay */
    featureName?: string;
    /** Short description of what the user gets with Pro */
    featureDescription?: string;
    /** Blurred preview element rendered behind the gate overlay */
    preview?: React.ReactNode;
}

/**
 * ProGate — a Client Component that gates its children behind a CashCat Pro subscription.
 *
 * Usage:
 * ```tsx
 * <ProGate featureName="Money Flow Diagram">
 *   <SankeyPageClient />
 * </ProGate>
 * ```
 *
 * It uses the `useSubscription` client hook so that the Next.js static build 
 * (used for Capacitor mobile apps) does not attempt to read cookies at build time.
 */
export function ProGate({
    children,
    featureName = 'This Feature',
    featureDescription = 'Upgrade to CashCat Pro to unlock advanced analytics and more.',
    preview,
}: ProGateProps) {
    const { user, loading: userLoading } = useSupabase();
    const { subscription, loading: subLoading } = useSubscription();

    // Show nothing while resolving auth/subscription status to prevent flash of gated UI
    if (userLoading || subLoading) {
        return (
            <div className="relative w-full min-h-[400px] rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
        );
    }

    // No user or no active subscription -> show overlay
    if (!user || !subscription?.isActive) {
        return <ProGateOverlay featureName={featureName} featureDescription={featureDescription} preview={preview} />;
    }

    // Subscribed -> render wrapped content
    return <>{children}</>;
}
