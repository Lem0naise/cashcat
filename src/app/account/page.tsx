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
                
                <main className="pt-16 pb-28 md:pb-6 p-6 sm:ml-20 lg:ml-[max(16.66%,100px)] fade-in">
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

                        {!isPWA && (
                            isInstallable ? (
                                <div className="mb-6 p-4 bg-white/[.02] rounded-lg border-b-4 xl:hidden">
                                    <h2 className="text-lg font-semibold mb-4">Install CashCat</h2>
                                    <p className="text-sm text-white/70 mb-3">Install CashCat as an app for quick access.</p>
                                    <button
                                        onClick={promptToInstall}
                                        className="px-8 py-3 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all"
                                    >
                                        Install App
                                    </button>
                                </div>
                            ) : (
                                <div className="mb-6 p-4 bg-white/[.02] rounded-lg border-b-4 xl:hidden">
                                    <div className="flex items-center justify-between mb-0">
                                        <h2 className="text-lg font-semibold mb-4">Install CashCat</h2>
                                        <button
                                            onClick={toggleInstallInstructions}
                                            className="p-1 hover:bg-white/[.05] rounded transition-colors"
                                            aria-label={isInstallDismissed ? "Show install instructions" : "Hide install instructions"}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path 
                                                    d={isInstallDismissed ? "M9 18L15 12L9 6 " : "M15 18L9 12L15 6"} 
                                                    stroke="white" 
                                                    strokeWidth="1.5" 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round"
                                                    className="opacity-70 hover:opacity-100 transition-opacity"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                    {!isInstallDismissed && (
                                        <>
                                            <p className="text-sm text-white/70 mb-3">
                                                You can install CashCat as an app for quick access:
                                            </p>
                                            <ul className="text-sm text-white/70 mb-3 space-y-1 list-disc list-inside">
                                                <li><strong>Safari (iOS):</strong> Tap the share button → "Add to Home Screen"</li>
                                                <li><strong>Safari (Mac):</strong> File menu → "Add to Dock"</li>
                                                <li><strong>Firefox / Chrome: </strong> Menu (⋯) → "Install" or "Add to Home Screen"</li>
                                            </ul>
                                        </>
                                    )}
                                </div>
                            )
                        )}
                        

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
                                    className={`w-full px-4 py-2 rounded-lg transition-all text-left ${
                                        contactConfirmStep === 1 
                                            ? 'bg-green/20 text-green hover:bg-green/30 border border-green/30' 
                                            : 'bg-white/[.05] hover:bg-white/[.08] text-white/70 hover:text-white'
                                    }`}
                                >
                                    {contactConfirmStep === 1 ? 'Click again to email lemonaise.dev@gmail.com' : 'Contact Support'}
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className={`w-full px-4 py-2 rounded-lg transition-all text-left font-medium ${
                                        deleteConfirmStep === 1 
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
                            <h2 className="text-lg font-semibold mb-4">Update Notes</h2>
                            <div className="flex flex-col gap-4 text-sm text-white/70">
                                <p className="">
                                    You are on CashCat <span className="text-green font-medium">0.7.6</span>. The latest features include:
                                </p>
                                <ul className="list-disc ml-4">
                                    <li>A brand new Discord server</li>
                                    <li>A new documentation knowledgebase</li>
                                    <li>Updates to the statistics screen</li>
                                    <li>Support for multiple bank accounts</li>
                                    <li>A large collection of UI adjustments</li>
                                    <li>Routine bug fixes as always</li>
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
