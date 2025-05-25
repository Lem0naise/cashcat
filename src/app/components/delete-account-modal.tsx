'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Database } from '../../types/supabase';

type DeleteAccountModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAccountDeleted: () => void;
};

export default function DeleteAccountModal({ isOpen, onClose, onAccountDeleted }: DeleteAccountModalProps) {
    const supabase = createClientComponentClient<Database>();
    const [reason, setReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setReason('');
            setIsDeleting(false);
            setConfirmDelete(false);
        }
    }, [isOpen]);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Auto focus textarea on open
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }

        if (!reason.trim()) {
            toast.error('Please tell us why you want to delete your account');
            return;
        }

        setIsDeleting(true);

        const deletePromise = async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            // First, submit the deletion reason as feedback
            const { error: feedbackError } = await supabase
                .from('feedback')
                .insert({
                    type: 'deletion_reason',
                    text: reason.trim(),
                    user_id: user.id
                });

            if (feedbackError) {
                console.warn('Failed to save deletion reason:', feedbackError);
                // Don't throw error here, continue with deletion
            }

            // Call the delete-user-account edge function
            const { data, error } = await supabase.functions.invoke('delete-user-account', {
                body: { userId: user.id }
            });

            if (error) throw error;
            
            return data;
        };

        try {
            await toast.promise(deletePromise(), {
                loading: 'Deleting your account...',
                success: 'Account deleted successfully',
                error: 'Failed to delete account - please contact support.'
            });

            // Account deletion successful
            setTimeout(onAccountDeleted, 500);
            
        } catch (error) {
            console.error('Error deleting account:', error);
            setConfirmDelete(false); // Reset confirmation on error
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div 
            className={`fixed inset-0 bg-black md:bg-black/50 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${
                isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'
            }`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`bg-white/[.03] md:rounded-lg border-b-4 border-b-reddy w-full md:max-w-md md:p-6 min-h-[100dvh] md:min-h-0 ${
                    isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'
                }`}
            >
                <div className="flex justify-between items-center p-4 md:p-0 md:mb-6 border-b border-white/[.15] md:border-0">
                    <h2 className="text-xl font-bold text-reddy">Delete Account</h2>
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-white/[.05] rounded-full transition-colors text-white"
                    >
                        <Image
                            src="/minus.svg"
                            alt="Close"
                            width={16}
                            height={16}
                            className="opacity-100 invert"
                        />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100dvh-4rem)] md:h-auto">
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-0">
                        {/* Warning Notice */}
                        <div className="p-4 bg-reddy/10 border border-reddy/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="text-reddy">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-reddy mb-2">This action cannot be undone</p>
                                    <p className="text-white/70">
                                        All your account data including budget categories, transactions, assignments, 
                                        and settings will be permanently deleted. You will need to create a new account 
                                        to use CashCat again.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm text-white/50">
                                Help us improve by telling us why you're leaving
                            </label>
                            <textarea
                                ref={textareaRef}
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="I'm deleting my account because..."
                                className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-reddy focus:outline-none transition-colors resize-none h-32 text-sm"
                                maxLength={1000}
                            />
                            <div className="flex justify-between text-xs text-white/50">
                                <span>Your feedback helps us improve CashCat</span>
                                <span>{reason.length}/1000</span>
                            </div>
                        </div>

                        {/* Final confirmation notice */}
                        {confirmDelete && (
                            <div className="p-3 bg-reddy/20 border border-reddy/30 rounded-lg">
                                <p className="text-sm text-reddy font-medium">
                                    Are you absolutely sure? This will permanently delete your CashCat account and all associated data.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 md:p-0 md:pt-4 border-t border-white/[.15] md:border-0">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 py-4 bg-white/[.05] text-white/70 font-medium rounded-lg hover:bg-white/[.08] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isDeleting || !reason.trim()}
                                className="flex-1 py-4 bg-reddy text-white font-medium rounded-lg hover:bg-old-reddy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting 
                                    ? 'Deleting...' 
                                    : confirmDelete 
                                        ? 'Yes, Delete Forever' 
                                        : 'Delete Account'
                                }
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
