'use client';

import { Capacitor } from '@capacitor/core';
import { UpgradeButton } from './upgrade-button';

interface ProGateOverlayProps {
    featureName: string;
    featureDescription: string;
    preview?: React.ReactNode;
}

const PRO_FEATURES = [
    { icon: '◈', label: 'Money Flow Diagram' },
    { icon: '◈', label: 'Advanced spending insights' },
    { icon: '◈', label: 'More features coming soon' },
];

/**
 * ProGateOverlay — client component so it can detect native vs web.
 *
 * On native Capacitor (Android/iOS): shows a polite message — NO payment links.
 * On web: shows the full upgrade UI with UpgradeButton.
 */
export function ProGateOverlay({ featureName, featureDescription, preview }: ProGateOverlayProps) {
    const isNative = Capacitor.isNativePlatform();

    return (
        <div className="relative w-full min-h-[480px] rounded-xl overflow-hidden font-[family-name:var(--font-suse)]">
            {/* Blurred preview (optional) */}
            {preview && (
                <div className="absolute inset-0 blur-md opacity-20 pointer-events-none select-none scale-105">
                    {preview}
                </div>
            )}

            {/* Dark overlay base */}
            <div className="absolute inset-0 bg-background/80" />

            {/* Glass card */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[480px] p-8">
                <div className="w-full max-w-sm mx-auto glass-card-blue p-7 flex flex-col items-center text-center gap-5">

                    {/* Icon ring */}
                    <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-green">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>

                    {/* Eyebrow */}
                    <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-semibold tracking-[.12em] uppercase text-green/80">
                            CashCat Pro
                        </span>
                        <h2 className="text-xl font-bold tracking-tight text-white">
                            {featureName}
                        </h2>
                        <p className="text-sm text-white/50 leading-relaxed">
                            {featureDescription}
                        </p>
                    </div>

                    {/* Feature list */}
                    <ul className="w-full space-y-2 text-sm text-left">
                        {PRO_FEATURES.map(({ icon, label }) => (
                            <li key={label} className="flex items-center gap-2.5 text-white/70">
                                <span className="text-green text-xs shrink-0">✓</span>
                                {label}
                            </li>
                        ))}
                    </ul>

                    {isNative ? (
                        /* ── Native: no payment/upgrade links ── */
                        <div className="w-full space-y-2 pt-1">
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
                        <div className="w-full space-y-3 pt-1">
                            <UpgradeButton />
                            <p className="text-xs text-white/30 text-center">
                                Less than a coffee a month · Cancel anytime
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
