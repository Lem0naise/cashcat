'use client';

import React from 'react';
import { ProGateOverlay } from './pro-gate-overlay';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabase } from '@/app/contexts/supabase-provider';

interface ProGateProps {
    children: React.ReactNode;
    /** Name of the Pro feature, shown in the gate overlay */
    featureName?: string;
    /** Short description of what the user gets with Pro */
    featureDescription?: string;
    /**
     * When true (default), the overlay has an X and backdrop click to dismiss.
     * When false, the gate is non-dismissible and sits directly over the children
     * (used for inline embedded usage where dismissing would show gated content).
     */
    dismissible?: boolean;
}

/**
 * ProGate — gates its children behind a CashCat Pro subscription.
 *
 * Usage (inline, non-dismissible):
 * ```tsx
 * <ProGate featureName="Money Flow Diagram" dismissible={false}>
 *   <SankeyInline />
 * </ProGate>
 * ```
 *
 * Usage (modal popup, dismissible):
 * ```tsx
 * <ProGate featureName="Some Feature">
 *   <SomePage />
 * </ProGate>
 * ```
 */
export function ProGate({
    children,
    featureName = 'This Feature',
    featureDescription = 'Upgrade to CashCat Pro to unlock advanced analytics and more.',
    dismissible = true,
}: ProGateProps) {
    const { user, loading: userLoading } = useSupabase();
    const { subscription, loading: subLoading } = useSubscription();
    const [isOpen, setIsOpen] = React.useState(true);

    // Show nothing while resolving auth/subscription status to prevent flash of gated UI
    if (userLoading || subLoading) {
        return (
            <div className="relative w-full min-h-[400px] rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
        );
    }

    // No user or no active subscription -> render children behind the overlay
    if (!user || !subscription?.isActive) {
        // Dismissible: floating modal over children; can be closed
        // Non-dismissible: always-visible gate layered over blurred children
        const showOverlay = dismissible ? isOpen : true;

        return (
            <div className={`relative w-full ${!dismissible ? 'overflow-hidden rounded-xl' : ''}`}>
                {/* Render children — blurred when gate is showing */}
                <div className={showOverlay ? (dismissible ? '' : 'blur-sm pointer-events-none select-none') : ''}>
                    {children}
                </div>

                {/* Overlay */}
                {showOverlay && (
                    dismissible ? (
                        /* Dismissible: fixed fullscreen modal */
                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 font-[family-name:var(--font-suse)]"
                            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
                            <ProGateOverlay
                                featureName={featureName}
                                featureDescription={featureDescription}
                                dismissible={true}
                                onClose={() => setIsOpen(false)}
                            />
                        </div>
                    ) : (
                        /* Non-dismissible: absolute overlay over the blurred children */
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[2px] font-[family-name:var(--font-suse)]">
                            <ProGateOverlay
                                featureName={featureName}
                                featureDescription={featureDescription}
                                dismissible={false}
                            />
                        </div>
                    )
                )}
            </div>
        );
    }

    // Subscribed -> render wrapped content
    return <>{children}</>;
}
