'use client';

import { createClient } from '@/app/utils/supabase';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Database } from '@/types/supabase';

type FeedbackModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

type FeedbackType = 'feedback' | 'feature' | 'bug' | 'deletion_reason';

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const supabase = createClient();
    const [type, setType] = useState<FeedbackType>('feedback');
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setType('feedback');
            setText('');
            setIsSubmitting(false);
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
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!text.trim()) {
            toast.error('Please enter your feedback');
            return;
        }

        setIsSubmitting(true);

        const submitPromise = async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('feedback')
                .insert({
                    type,
                    text: text.trim(),
                    user_id: user.id
                });

            if (error) throw error;
        };

        try {
            await toast.promise(submitPromise(), {
                loading: 'Submitting feedback...',
                success: 'Thank you for your feedback!',
                error: 'Failed to submit feedback'
            });

            handleClose();
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const getTypeLabel = (feedbackType: FeedbackType) => {
        switch (feedbackType) {
            case 'feedback': return 'General Feedback';
            case 'feature': return 'Feature Request';
            case 'bug': return 'Bug Report';
            case 'deletion_reason': return 'Account Deletion';
            default: return 'Feedback';
        }
    };

    const getTypeDescription = (feedbackType: FeedbackType) => {
        switch (feedbackType) {
            case 'feedback': return 'Share your thoughts about CashCat';
            case 'feature': return 'Suggest a new feature or improvement';
            case 'bug': return 'Report a problem or issue';
            case 'deletion_reason': return 'Tell us why you want to delete your account';
            default: return '';
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
                className={`bg-white/[.03] md:rounded-lg border-b-4 w-full md:max-w-md md:p-6 min-h-[100dvh] md:min-h-0 ${
                    isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'
                }`}
            >
                <div className="flex justify-between items-center p-4 md:p-0 md:mb-6 border-b border-white/[.15] md:border-0">
                    <h2 className="text-xl font-bold">Send Feedback</h2>
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-white/[.05] rounded-full transition-colors text-white"
                    >
                        <Image
                            src="/plus.svg"
                            alt="Close"
                            width={16}
                            height={16}
                            className="opacity-100 invert rotate-45"
                        />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100dvh-4rem)] md:h-auto">
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-0">
                        <div className="space-y-3">
                            <label className="block text-sm text-white/50 mb-2">What type of feedback is this?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['feedback', 'feature', 'bug', 'deletion_reason'] as FeedbackType[]).map((feedbackType) => (
                                    <button
                                        key={feedbackType}
                                        type="button"
                                        onClick={() => setType(feedbackType)}
                                        className={`p-3 rounded-lg border transition-colors text-sm ${
                                            type === feedbackType
                                                ? (feedbackType==='bug' || feedbackType==='deletion_reason' ? 'bg-reddy/20 text-reddy border-reddy' : 'bg-green/20 border-green text-green')
                                                : 'bg-white/[.05] border-white/[.15] hover:bg-white/[.1]'
                                        }`}
                                    >
                                        {getTypeLabel(feedbackType)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-white/60 mt-2">
                                {getTypeDescription(type)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm text-white/50">Your feedback</label>
                            <textarea
                                ref={textareaRef}
                                required
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={
                                    type === 'bug' 
                                        ? "Please describe the issue, what you expected to happen, and steps to reproduce it..."
                                        : type === 'feature'
                                        ? "Tell us about the feature you'd like to see..."
                                        : type === 'deletion_reason'
                                        ? "We're sorry to see you go. What could we have done better?"
                                        : "Tell us what you think about CashCat..."
                                }
                                className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors resize-none h-32 text-sm"
                                maxLength={1000}
                            />
                            <div className="flex justify-between text-xs text-white/50">
                                <span>Your feedback helps us improve CashCat</span>
                                <span>{text.length}/1000</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-0 md:pt-4 border-t border-white/[.15] md:border-0">
                        <button
                            type="submit"
                            disabled={isSubmitting || !text.trim()}
                            className="w-full py-4 bg-green text-black font-medium rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Feedback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
