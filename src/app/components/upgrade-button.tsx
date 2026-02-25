'use client';

import { useTransition } from 'react';
import { createCheckoutAction } from '@/app/actions/subscription';
import toast from 'react-hot-toast';

interface UpgradeButtonProps {
    className?: string;
    label?: string;
}

/**
 * UpgradeButton — calls the checkout server action and redirects the browser
 * to the Lemon Squeezy checkout page.
 */
export function UpgradeButton({
    className = '',
    label = 'Upgrade to Pro',
}: UpgradeButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleUpgrade = () => {
        startTransition(async () => {
            const result = await createCheckoutAction();
            if (result.success) {
                window.location.href = result.checkoutUrl;
            } else {
                toast.error(result.error ?? 'Something went wrong. Please try again.');
            }
        });
    };

    return (
        <button
            onClick={handleUpgrade}
            disabled={isPending}
            className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                bg-green text-black
                hover:bg-green-dark hover:text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]
                font-[family-name:var(--font-suse)]  w-full justify-center
                ${className}`}
        >
            {isPending ? (
                <>
                    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Preparing checkout…
                </>
            ) : (
                <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                    {label}
                </>
            )}
        </button>
    );
}
