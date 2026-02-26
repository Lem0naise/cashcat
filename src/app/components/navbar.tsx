'use client';


import { useRouter } from 'next/navigation';
import Logo from "./logo";


export default function Navbar() {
    const router = useRouter();

    const goToAbout = async () => {
        router.push('/about');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-black/[.09] dark:border-white/[.15] px-4 hidden md:flex items-center justify-between z-50 fade-in font-[family-name:var(--font-suse)]">
            <div className="flex items-center gap-4">
                <div onClick={goToAbout} className="scale-35 md:scale-45 origin-left transition-transform hover:scale-[0.52] cursor-pointer">
                    <Logo />
                </div>

            </div>
        </nav>
    );
}
