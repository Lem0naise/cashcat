'use client';

import Image from 'next/image';
import { Capacitor } from '@capacitor/core';
import { UpgradeButton } from './upgrade-button';

interface ProGateOverlayProps {
    featureName: string;
    featureDescription: string;
    /** If false (inline/embedded usage), hides the X button */
    dismissible?: boolean;
    onClose?: () => void;
}

const PRO_FEATURES = [
    { label: 'Money Flow diagram — see where every dollar goes at a glance' },
    { label: 'Full history beyond 3 months, custom date ranges' },
    { label: '100x higher API limits for power users' },
    { label: 'Priority support & early access to new features' },
];

/**
 * ProGateOverlay — renders the upgrade card content.
 * Positioning (fixed fullscreen vs absolute inline) is handled by the parent ProGate.
 *
 * On native Capacitor (Android/iOS): shows a polite message — NO payment links.
 * On web: shows the full upgrade UI with UpgradeButton.
 */
export function ProGateOverlay({ featureName, featureDescription, dismissible = true, onClose }: ProGateOverlayProps) {
    const isNative = Capacitor.isNativePlatform();

    return (
        <div className="relative w-full max-w-md mx-auto">

            {/* Dismissible X button */}
            {dismissible && (
                <button
                    onClick={onClose}
                    className="absolute -top-4 -left-4 w-8 h-8 rounded-full border border-white/20 bg-black/50 text-white/40 hover:text-white/70 hover:bg-black/70 transition-colors flex items-center justify-center z-20"
                    aria-label="Close"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            )}

            <div className="glass-card-blue p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-2xl">

                {/* CashCat logo */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-green/30 shadow-lg shadow-green/10">
                    <Image
                        src="/favicons/ccpwa96.png"
                        alt="CashCat"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        priority
                    />
                </div>

                {/* Heading */}
                <div className="flex flex-col items-center gap-1.5">
                    <span className="text-xs font-semibold tracking-[.14em] uppercase text-green/80">
                        CashCat Pro
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
                        Unlock {featureName}
                    </h2>
                    <p className="text-sm text-white/55 leading-relaxed max-w-xs">
                        {featureDescription}
                    </p>
                </div>

                {/* Feature list */}
                <ul className="w-full space-y-2.5 text-sm text-left">
                    {PRO_FEATURES.map(({ label }) => (
                        <li key={label} className="flex items-start gap-3 text-white/75">
                            <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green/20 border border-green/40 flex items-center justify-center">
                                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" className="text-green">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            {label}
                        </li>
                    ))}
                </ul>

                {/* Pricing hook */}
                <div className="w-full bg-green/[.08] border border-green/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-green font-semibold text-base">Less than a coffee a month</p>
                    <p className="text-white/50 text-xs mt-0.5">Even less with yearly or lifetime plans</p>
                </div>

                {isNative ? (
                    /* ── Native: no payment/upgrade links ── */
                    <div className="w-full space-y-2">
                        <p className="text-sm text-white/60 leading-relaxed">
                            Visit{' '}
                            <span className="text-green font-semibold">cashcat.app</span>
                            {' '}in your browser to subscribe.
                        </p>
                        <p className="text-xs text-white/30">
                            Already subscribed? Your access appears here automatically.
                        </p>
                    </div>
                ) : (
                    /* ── Web: full upgrade CTA ── */
                    <div className="w-full space-y-2.5">
                        <UpgradeButton />
                        <p className="text-xs text-white/30 text-center">
                            Cancel anytime · No commitment
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
