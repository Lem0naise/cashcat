import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Note: In Next.js 13+ Server Actions, we need to pass cookies()
// This file standardizes the creation of the supabase client for server-side usage.

export const createClient = () => {
    const cookieStore = cookies();
    return createServerComponentClient<Database>({ cookies: () => cookieStore });
};
