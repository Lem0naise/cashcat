'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRef } from 'react';
import type { Database } from '@/types/supabase';

export function useSupabaseClient() {
    const supabase = useRef(createClientComponentClient<Database>());
    return supabase.current;
}
