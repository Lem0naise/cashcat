'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function joinWaitlist(email: string) {
    if (!email) {
        return { error: 'Email is required' };
    }

    try {
        const { data, error } = await resend.contacts.create({
            email,
            audienceId: process.env.RESEND_AUDIENCE_ID || 'YOUR_AUDIENCE_ID',
        });

        if (error) {
            console.error('Resend API Error:', error);
            return { error: 'Failed to join waitlist. Please try again later.' };
        }

        return { success: true };
    } catch (e: any) {
        console.error('Waitlist Error:', e);
        return { error: 'An unexpected error occurred.' };
    }
}
