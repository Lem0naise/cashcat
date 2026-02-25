/**
 * ProBadge — a tiny inline badge indicating a Pro-only feature.
 * Uses the app's blue (#bac2ff / `text-green`) colour system.
 */
export function ProBadge({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green/10 text-green border border-green/20 font-[family-name:var(--font-suse)] ${className}`}
        >
            PRO
        </span>
    );
}
