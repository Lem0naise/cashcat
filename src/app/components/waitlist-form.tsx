'use client';

import { useState } from 'react';
import { joinWaitlist } from '../actions/waitlist';

export default function WaitlistForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) return;

        setStatus('loading');
        setMessage('');

        const result = await joinWaitlist(email);

        if (result.error) {
            setStatus('error');
            setMessage(result.error);
        } else {
            setStatus('success');
            setMessage('You have been added to the waitlist!');
            setEmail('');
        }
    };

    return (
        <div className="w-full max-w-md mx-auto md:mx-0">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    disabled={status === 'loading' || status === 'success'}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-green focus:ring-1 focus:ring-green transition-all"
                />
                <button
                    type="submit"
                    disabled={status === 'loading' || status === 'success'}
                    className="px-6 py-3 bg-green text-black font-bold rounded-xl hover:bg-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                </button>
            </form>

            {status === 'success' && (
                <p className="mt-3 text-sm text-green font-medium animate-in fade-in slide-in-from-bottom-2">
                    {message}
                </p>
            )}
            {status === 'error' && (
                <p className="mt-3 text-sm text-red-400 font-medium animate-in fade-in slide-in-from-bottom-2">
                    {message}
                </p>
            )}
        </div>
    );
}
