'use client';

interface OnboardingOverlayProps {
    onStartOnboarding: () => void;
}

/**
 * Shown when a user has zero categories (empty budget).
 * Minimal, action-oriented — no walls of text.
 */
export default function OnboardingOverlay({ onStartOnboarding }: OnboardingOverlayProps) {
    return (
        <div className="flex flex-col items-center justify-center text-center mt-16 max-w-sm mx-auto px-4">
            <div className="w-16 h-16 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Welcome to CashCat</h2>
            <p className="text-white/50 text-sm mb-8">
                Let's set up your budget. It only takes a couple of minutes.
            </p>

            <button
                onClick={onStartOnboarding}
                className="w-full bg-green hover:bg-green-dark text-black font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
                Get Started
            </button>
        </div>
    );
}
