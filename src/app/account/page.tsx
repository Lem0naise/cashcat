'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import MobileNav from "../components/mobileNav";
import Navbar from "../components/navbar";
import ProtectedRoute from "../components/protected-route";
import Sidebar from "../components/sidebar";
import FeedbackModal from "../components/feedback-modal";
import DeleteAccountModal from "../components/delete-account-modal";
import { useSupabase } from '../contexts/supabase-provider';
import { createClient } from '../utils/supabase';
import Link from 'next/link';
import { usePwaPrompt } from '@/app/components/usePwaPrompt';
import { Capacitor } from '@capacitor/core';
import { currentVersion } from '../../lib/changelog';


export default function Account() {
    const router = useRouter();
    const supabase = createClient();
    const { user } = useSupabase();
    const { promptToInstall, isInstallable } = usePwaPrompt();
    const [isInstallDismissed, setIsInstallDismissed] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmStep, setDeleteConfirmStep] = useState(0); // 0: normal, 1: are you sure
    const [contactConfirmStep, setContactConfirmStep] = useState(0); // 0: normal, 1: click again to email

    // Load dismissed state from localStorage
    useEffect(() => {
        const dismissed = localStorage.getItem('install-instructions-dismissed');
        setIsInstallDismissed(dismissed === 'true');
    }, []);

    // Check if running in PWA mode
    const isPWA = typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true);

    const isNative = Capacitor.isNativePlatform();

    // Dynamically import ApiKeyManager if not native
    const [ApiKeyManager, setApiKeyManager] = useState<null | React.ComponentType>(null);

    useEffect(() => {
        if (!isNative) {
            import('../components/api-key-manager').then(mod => {
                setApiKeyManager(() => mod.default);
            });
        }
    }, [isNative]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const toggleInstallInstructions = () => {
        const newState = !isInstallDismissed;
        setIsInstallDismissed(newState);
        localStorage.setItem('install-instructions-dismissed', newState.toString());
    };

    const handleDeleteAccount = () => {
        if (deleteConfirmStep === 0) {
            setDeleteConfirmStep(1);
            // Reset confirmation after 5 seconds
            setTimeout(() => setDeleteConfirmStep(0), 5000);
        } else {
            setShowDeleteModal(true);
            setDeleteConfirmStep(0);
        }
    };

    const handleAccountDeleted = async () => {
        // Sign out the user and redirect to login
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleContactSupport = () => {
        if (contactConfirmStep === 0) {
            setContactConfirmStep(1);
            // Reset confirmation after 5 seconds
            setTimeout(() => setContactConfirmStep(0), 5000);
        } else {
            window.location.href = 'mailto:lemonaise.dev@gmail.com?subject=CashCat Support Request';
            setContactConfirmStep(0);
        }
    };

    const displayUser = user;

    return (

        <ProtectedRoute>

            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                <Navbar />
                <Sidebar />
                <MobileNav />

                {/* Toast notifications */}
                <Toaster
                    containerClassName='mb-[15dvh]'
                    position="bottom-center"
                    toastOptions={{
                        style: {
                            background: '#333',
                            color: '#fff',
                        },
                        success: {
                            iconTheme: {
                                primary: '#bac2ff',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#EF4444',
                                secondary: '#fff',
                            },
                        }
                    }}
                />

                <main className="pt-[env(safe-area-inset-top)] md:pt-16 pb-28 md:pb-6 p-6 sm:ml-20 lg:ml-[max(16.66%,100px)] fade-in">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8 mt-3 md:mt-6">
                            <h1 className="text-2xl font-bold tracking-[-.01em]">Account & Settings</h1>
                        </div>



                        <div className="p-4 bg-white/[.02] rounded-lg border-b-4">
                            <p className={`${displayUser ? 'inline' : 'hidden'}`}>
                                You're signed into CashCat! Your budget is saved to the cloud, you can rest safely.
                            </p>
                            <div className="mt-4 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-white/50">Email</p>
                                        <p className="font-medium">{displayUser?.email}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSignOut}
                                    className="px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>



                        {/* Discord Account */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Join Our Discord</h2>
                            </div>
                            <p className="text-sm text-white/70 mb-4">Join CashCat's Discord for easy access to our community and developers.</p>
                            <Link
                                href="https://discord.gg/C9mYnEdAQA"
                                target="_blank"
                                className="w-full block text-center px-4 py-2 bg-green text-black rounded-lg transition-all hover:bg-green-dark disabled:opacity-50"
                            >
                                Join Our Discord
                            </Link>
                        </div>


                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Docs & Knowledgebase</h2>
                            </div>
                            <p className="text-sm text-white/70 mb-4">The docs contain quickstart guides, explanations of how to budget, and common questions.</p>
                            <Link
                                href='/docs'
                                className="w-full block text-center px-4 py-2 bg-green text-black rounded-lg transition-all hover:bg-green-dark disabled:opacity-50"

                            >
                                Documentation
                            </Link>
                        </div>



                        {/* API Keys */}
                        {!isNative && ApiKeyManager && <ApiKeyManager />}


                        {/* Help & Resources */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <h2 className="text-lg font-semibold mb-4">Other Resources</h2>
                            <ul className="text-sm text-white/70 list-disc list-inside mb-4">
                                <li>To manage your budget settings, click the Manage button on the Budget page.</li>
                                <li>To manage your bank accounts, click the account selector on on the Transactions page.</li>
                            </ul>

                            <div className="flex flex-col gap-4">
                                <Link
                                    href="/learn"
                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white text-left"
                                >
                                    An Example Budget
                                </Link>
                                <Link
                                    href="/about"
                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white text-left"
                                >
                                    Meet the Team
                                </Link>
                                <button
                                    onClick={() => setShowFeedbackModal(true)}
                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white text-left"
                                >
                                    Give Feedback
                                </button>
                                <button
                                    onClick={handleContactSupport}
                                    className={`w-full px-4 py-2 rounded-lg transition-all text-left ${contactConfirmStep === 1
                                        ? 'bg-green/20 text-green hover:bg-green/30 border border-green/30'
                                        : 'bg-white/[.05] hover:bg-white/[.08] text-white/70 hover:text-white'
                                        }`}
                                >
                                    {contactConfirmStep === 1 ? 'Click again to email lemonaise.dev@gmail.com' : 'Contact Support'}
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className={`w-full px-4 py-2 rounded-lg transition-all text-left font-medium ${deleteConfirmStep === 1
                                        ? 'bg-reddy/20 text-reddy hover:bg-reddy/30 border border-reddy/30'
                                        : 'bg-white/[.05] hover:bg-white/[.08] text-white/70 hover:text-reddy'
                                        }`}
                                >
                                    {deleteConfirmStep === 1 ? 'Are you sure? Click again to confirm' : 'Delete Account'}
                                </button>

                            </div>


                        </div>

                        {/* Patch Notes*/}
                        {/*This is the CashCat semantic version number. It should be updated with each update.*/}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Update Notes</h2>
                                <Link href="/updates" className="text-sm text-green hover:underline">
                                    View all updates
                                </Link>
                            </div>
                            <div className="flex flex-col gap-4 text-sm text-white/70">
                                <p className="">
                                    You are on CashCat <span className="text-green font-medium">{currentVersion.version}</span>. The latest features include:
                                </p>
                                <ul className="list-disc ml-4 space-y-1">
                                    {currentVersion.features?.map((feature, i) => (
                                        <li key={i}>{feature}</li>
                                    ))}
                                    {currentVersion.bugfixes?.map((fix, i) => (
                                        <li key={`fix-${i}`}>{fix}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>


                        {/* Privacy Notice */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <h2 className="text-lg font-semibold mb-4">Privacy</h2>
                            <p className="text-sm text-white/70">
                                For any questions or queries related to privacy or terms of usage of the website, please use the contact form above, or email lemonaise.dev@gmail.com
                            </p>

                            <div className="flex flex-col gap-4 mt-4">
                                <Link
                                    href="/terms"
                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white text-left"
                                >
                                    Terms of Service & Privacy Policy
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>

                <FeedbackModal
                    isOpen={showFeedbackModal}
                    onClose={() => setShowFeedbackModal(false)}
                />

                <DeleteAccountModal
                    isOpen={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setDeleteConfirmStep(0);
                    }}
                    onAccountDeleted={handleAccountDeleted}
                />
            </div>
        </ProtectedRoute>
    );
}
