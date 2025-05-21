'use client';
import ProtectedRoute from "../components/protected-route";

export default function Home() {
    // ...existing state definitions...

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                // ...existing content...
            </div>
        </ProtectedRoute>
    );
}