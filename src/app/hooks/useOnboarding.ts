import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import { useAuthUserId } from '@/app/hooks/useAuthUserId';

// ─── Onboarding steps ────────────────────────────────────────────────────────
// The onboarding flow progresses through these steps:
//   idle        -> User is onboarded OR we're still loading.
//   accounts    -> First step: set up bank accounts via AccountModal.
//   budget      -> Second step: create categories via ManageBudgetModal (OnboardingWizard).
//   tour        -> Third step: spotlight tour of the budget page.
//   complete    -> All done; flag is persisted and flow is dismissed.

export type OnboardingStep = 'idle' | 'accounts' | 'budget' | 'tour' | 'complete';

// ─── Fetch is_onboarded from settings ────────────────────────────────────────
const fetchIsOnboarded = async (userId: string): Promise<boolean> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('settings')
        .select('is_onboarded')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('[useOnboarding] fetch error:', error);
        // Default to true so we don't accidentally trap returning users
        return true;
    }

    // If no settings row exists yet, they are a new user -> not onboarded
    if (!data) return false;

    return data.is_onboarded ?? false;
};

// ─── Persist is_onboarded = true ─────────────────────────────────────────────
const markOnboarded = async (userId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('settings')
        .upsert(
            { id: userId, is_onboarded: true },
            { onConflict: 'id' }
        );

    if (error) {
        console.error('[useOnboarding] markOnboarded error:', error);
    }
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useOnboarding(hasCategoriesLoaded: boolean, categoriesCount: number) {
    const userId = useAuthUserId();
    const queryClient = useQueryClient();

    // Query the persistent flag
    const { data: isOnboarded, isLoading: flagLoading } = useQuery({
        queryKey: ['onboarding', userId],
        queryFn: () => fetchIsOnboarded(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 30, // 30 min — rarely changes
    });

    // Mutation to mark onboarding complete
    const completeMutation = useMutation({
        mutationFn: () => markOnboarded(userId!),
        onSuccess: () => {
            queryClient.setQueryData(['onboarding', userId], true);
        },
    });

    // ─── Local step state ────────────────────────────────────────────────
    const [step, setStep] = useState<OnboardingStep>('idle');
    const [hasTriggered, setHasTriggered] = useState(false);

    // Determine if we should show onboarding
    // Conditions: flag loaded, user is NOT onboarded, data has loaded, not yet triggered
    useEffect(() => {
        if (flagLoading || isOnboarded === undefined) return;
        if (isOnboarded) return; // Already onboarded
        if (!hasCategoriesLoaded) return; // Still loading categories
        if (hasTriggered) return; // Already triggered this session

        // New user detected: we don't start the flow automatically anymore.
        // It must be triggered manually via startOnboarding().
        setHasTriggered(true);
        // We stay in 'idle' until the user clicks the button.
    }, [flagLoading, isOnboarded, hasCategoriesLoaded, hasTriggered]);

    // ─── Step transitions ────────────────────────────────────────────────
    const startOnboarding = useCallback(() => {
        setStep('accounts');
    }, []);
    const advanceFromAccounts = useCallback(() => {
        // User closed the accounts modal; if they have no categories, show budget wizard
        if (categoriesCount === 0) {
            setStep('budget');
        } else {
            // They already have categories (maybe imported), go straight to tour
            setStep('tour');
        }
    }, [categoriesCount]);

    const advanceFromBudget = useCallback(() => {
        // After budget wizard closes, show the spotlight tour
        setStep('tour');
    }, []);

    const advanceFromTour = useCallback(() => {
        setStep('complete');
        completeMutation.mutate();
    }, [completeMutation]);

    const skipOnboarding = useCallback(() => {
        setStep('idle');
        completeMutation.mutate();
    }, [completeMutation]);

    // ─── Derived booleans for the parent component ───────────────────────
    const showAccountModal = step === 'accounts';
    const showBudgetWizard = step === 'budget';
    const showTour = step === 'tour';
    const isOnboardingActive = step === 'accounts' || step === 'budget' || step === 'tour';

    return {
        /** Current onboarding step */
        step,
        /** Whether the persistent flag is still loading */
        isLoading: flagLoading,
        /** Whether onboarding flow is currently active */
        isOnboardingActive,
        /** True when we should show the AccountModal for onboarding */
        showAccountModal,
        /** True when we should show ManageBudgetModal in onboarding/wizard mode */
        showBudgetWizard,
        /** True when we should show the spotlight tour */
        showTour,
        /** Start the onboarding flow manually */
        startOnboarding,
        /** Call when user closes the AccountModal during onboarding */
        advanceFromAccounts,
        /** Call when user closes the ManageBudgetModal during onboarding */
        advanceFromBudget,
        /** Call when user finishes or skips the spotlight tour */
        advanceFromTour,
        /** Call to skip onboarding entirely and persist the flag */
        skipOnboarding,
    };
}
