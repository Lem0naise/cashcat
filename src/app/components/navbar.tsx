'use client';

import Image from "next/image";
import Link from "next/link";
import Logo from "./logo";
import { useSupabase } from "../contexts/supabase-provider";

export default function Navbar() {
    const { user } = useSupabase();

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-black/[.09] dark:border-white/[.15] px-4 flex items-center justify-between z-50 fade-in font-[family-name:var(--font-suse)]">
        
            <div className="flex items-center gap-4">
                <div className="scale-50 origin-left transition-transform hover:scale-[0.52] cursor-pointer">
                    <Logo />
                </div>
            </div>
        </nav>
    );
}
