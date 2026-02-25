import { createClient } from '@/app/utils/supabase/server';
import { checkSubscription } from '@/lib/subscription';
import { ProGateOverlay } from './pro-gate-overlay';

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
 * ProGate — a Server Component that gates its children behind a CashCat Pro subscription.
 *
 * Usage (server components only):
 * ```tsx
 * <ProGate featureName="Money Flow Diagram">
 *   <SankeyPageClient />
 * </ProGate>
 * ```
 *
 * To gate a NEW feature, wrap it with <ProGate>. To un-gate it, remove the wrapper.
 *
 * On native Capacitor (Android/iOS), the overlay automatically shows a
 * "visit cashcat.app" message instead of any payment/upgrade UI — this
 * keeps the app compliant with Google Play and App Store policies.
 */
export async function ProGate({
    children,
    featureName = 'This Feature',
    featureDescription = 'Upgrade to CashCat Pro to unlock advanced analytics and more.',
    preview,
}: ProGateProps) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // No user — show the overlay (it handles the native case itself)
    if (!user) {
        return <ProGateOverlay featureName={featureName} featureDescription={featureDescription} preview={preview} />;
    }

    const { isActive } = await checkSubscription(user.id);

    if (isActive) {
        return <>{children}</>;
    }

    return <ProGateOverlay featureName={featureName} featureDescription={featureDescription} preview={preview} />;
}
