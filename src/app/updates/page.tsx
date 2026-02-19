'use client';

import { changelog } from '../../lib/changelog';
import Link from 'next/link';
import FloatingIconsBackground from '../components/floating-icon-background';
import Logo from '../components/logo';

export default function Updates() {
    return (
        <div className="min-h-screen font-[family-name:var(--font-suse)] selection:bg-green selection:text-black">
            <FloatingIconsBackground />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 glass-card-blue border-b border-white/5 rounded-none bg-black/20 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="w-32 pl-6">
                        <Logo />
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-white/80 hover:text-white font-medium transition-colors hidden sm:block"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/signup"
                            className="bg-green text-black px-4 py-2 rounded-lg font-bold hover:bg-green-dark transition-all text-sm"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-4 pt-32 pb-20 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black mb-12 text-center">
                        <span className="text-gradient">Update History</span>
                    </h1>

                    <div className="space-y-16">
                        {changelog.map((major) => (
                            <div key={major.version} className="space-y-12">
                                {/* Major Version Header (Optional if purely organizing) */}
                                {/* <h2 className="text-3xl font-bold text-white border-b border-white/10 pb-4">
                                    Version 0
                                </h2> */}

                                {major.minors.map((minor) => (
                                    <div key={minor.version} className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-2xl font-bold text-white/90">
                                                v0.{minor.version}
                                            </h3>
                                            <div className="h-px bg-white/10 flex-grow"></div>
                                        </div>

                                        <div className="grid gap-2">
                                            {minor.patches.map((patch, index) => (
                                                <div key={index} className="glass-card-blue p-4 rounded-2xl border border-white/10 ml-4 relative">
                                                    {/* Connector Line Logic could go here for a timeline look */}

                                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                                                        <h4 className="text-xl font-bold text-white flex items-center gap-3">
                                                            v{patch.version}
                                                            {patch.version === changelog[0].minors[0].patches[0].version && (
                                                                <span className="text-xs bg-green text-black px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                                                    Latest
                                                                </span>
                                                            )}
                                                        </h4>
                                                        {patch.date && (
                                                            <span className="text-white/50 text-sm font-medium">
                                                                {patch.date}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {patch.description && (
                                                        <div className="text-white/80 whitespace-pre-line leading-relaxed">
                                                            {patch.description}
                                                        </div>
                                                    )}

                                                    {(patch.features || patch.bugfixes) && (
                                                        <div className="space-y-6 mt-4">
                                                            {patch.features && patch.features.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-green font-bold text-sm uppercase tracking-wider mb-3">New Features</h5>
                                                                    <ul className="space-y-2">
                                                                        {patch.features.map((feature, i) => (
                                                                            <li key={i} className="flex items-start gap-3 text-white/80">
                                                                                <svg className="w-5 h-5 text-green mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                                {feature}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {patch.bugfixes && patch.bugfixes.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-blue font-bold text-sm uppercase tracking-wider mb-3">Bug Fixes</h5>
                                                                    <ul className="space-y-2">
                                                                        {patch.bugfixes.map((fix, i) => (
                                                                            <li key={i} className="flex items-start gap-3 text-white/80">
                                                                                <svg className="w-5 h-5 text-blue mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                {fix}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm py-12 relative z-10">
                <div className="container mx-auto px-6 text-center">
                    <div className="mb-8">
                        <Logo />
                    </div>
                    <div className="flex flex-wrap justify-center gap-8 mb-8 text-sm font-medium text-white/60">
                        <Link href="/about" className="hover:text-green transition-colors">About Us</Link>
                        <Link href="/learn" className="hover:text-green transition-colors">How it Works</Link>
                        <Link href="/docs" className="hover:text-green transition-colors">Documentation</Link>
                        <Link href="/terms" className="hover:text-green transition-colors">Terms & Privacy</Link>
                    </div>
                    <p className="text-white/30 text-xs">
                        &copy; {new Date().getFullYear()} CashCat. Built with ❤️ for financial freedom.
                    </p>
                </div>
            </footer>
        </div>
    );
}
