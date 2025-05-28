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
                
                <main className="pt-16 pb-28 md:pb-6 p-6 md:pl-64 fade-in md:ml-9">
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
                                <div className="mb-6 p-4 bg-white/[.02] rounded-lg border-b-4">
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
                                <div className="mb-6 p-4 bg-white/[.02] rounded-lg border-b-4">
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
                                            <ul className="text-sm text-white/70 mb-3 space-y-1">
                                                <li>• <strong>Safari (iOS):</strong> Tap the share button → "Add to Home Screen"</li>
                                                <li>• <strong>Safari (Mac):</strong> File menu → "Add to Dock"</li>
                                                <li>• <strong>Firefox / Chrome: </strong> Menu (⋯) → "Install" or "Add to Home Screen"</li>
                                            </ul>
                                        </>
                                    )}
                                </div>
                            )
                        )}
                        

                        {/* Premium Features */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Premium Features</h2>
                                <span className="px-2 py-1 bg-green/20 text-green text-xs rounded-full">Coming Soon</span>
                            </div>
                            <p className="text-sm text-white/70 mb-4">Get early access to new features and support CashCat's development.</p>
                            <button
                                className="w-full px-4 py-2 bg-green text-black rounded-lg transition-all hover:bg-green-dark disabled:opacity-50"
                                disabled
                            >
                                Upgrade to Premium
                            </button>
                        </div>

                        {/* Help & Resources */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <h2 className="text-lg font-semibold mb-4">Help & Resources</h2>
                            <div className="flex flex-col gap-4 text-sm text-white/70 mb-5"><p>To manage your budget settings, click the Manage button on the Budget page.</p></div>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => router.push('/learn')}
                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white text-left"
                                >
                                    About CashCat & Meet The Team
                                </button>
                                <button
                                    onClick={() => setShowFeedbackModal(true)}
                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white text-left"
                                >
                                    Give Feedback on CashCat
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
                                    You are on CashCat <span className="text-green font-medium">0.2.9</span>. The latest features include:
                                </p>
                                <ul className="list-disc ml-4">
                                    <li>Daily predictions</li>
                                    <li>A new feedback form</li>
                                    <li>An installable PWA for mobile</li>
                                    <li>A new collapsible budget UI</li>
                                </ul>
                            </div>
                        </div>


                        {/* Privacy Notice */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <h2 className="text-lg font-semibold mb-4">Privacy</h2>
                            <p className="text-sm text-white/70">
                                Your data is securely stored. If you are an early-access tester and wish to provide feedback or delete your account, please use the form provided above or get in touch with a member of the team at lemonaise.dev@gmail.com.
                            </p>
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
