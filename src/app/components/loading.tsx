'use client';

export default function LoadingScreen() {
    return (
        <div className="min-h-screen bg-background font-[family-name:var(--font-suse)] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/50">Loading...</p>
            </div>
        </div>
    );
}
