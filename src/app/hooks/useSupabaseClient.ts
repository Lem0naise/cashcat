'use client';

import { useRef } from 'react';
import { createClient } from '../utils/supabase';

export function useSupabaseClient() {
    const supabase = useRef(createClient());
    return supabase.current;
}
