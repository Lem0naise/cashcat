'use client';

import { createClient } from '@/app/utils/supabase';
import { useRef } from 'react';
import type { Database } from '@/types/supabase';

export function useSupabaseClient() {
    const supabase = useRef(createClient());
    return supabase.current;
}
