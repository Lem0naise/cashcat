'use client';

import Image from "next/image";
import Link from "next/link";
import Logo from "./logo";
import { useSupabase } from "../contexts/supabase-provider";
import { isDevelopment, mockUser } from "../utils/mocks";

export default function Navbar() {
    const { user } = useSupabase();
    const displayUser = isDevelopment ? mockUser : user;

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-black/[.09] dark:border-white/[.15] px-4 flex items-center justify-between z-50 fade-in font-[family-name:var(--font-suse)]">
            <div className="flex items-center gap-4">
                <div className="scale-35 md:scale-45 origin-left transition-transform hover:scale-[0.52] cursor-pointer">
                    <Logo />
                </div>
                {isDevelopment && (
                    <span className="text-xs text-green px-2 py-1 rounded-full bg-green/10">Dev Mode</span>
                )}
            </div>
        </nav>
    );
}
