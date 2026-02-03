'use server';

import { createClient } from '@/app/utils/supabase/server';
import { randomBytes, createHash } from 'crypto';

export type ApiKey = {
    id: string;
    name: string;
    key_prefix: string;
    last_used_at: string | null;
    created_at: string;
};

export type CreateApiKeyResult = {
    key: string; // The raw key, shown only once
    apiKey: ApiKey;
    error?: string;
};

export async function createApiKey(name: string): Promise<CreateApiKeyResult | { error: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: 'Unauthorized' };
    }

    // 1. Generate secure random key
    const rawBytes = randomBytes(32);
    const rawKeyBase64 = rawBytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const key = `cc_live_${rawKeyBase64}`;

    // 2. Hash the key for storage
    const keyHash = createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 15); // Store enough to identify, but not enough to compromise

    // 3. Insert into DB
    const { data, error } = await (supabase
        .from('api_keys' as any)
        .insert({
            user_id: user.id,
            name,
            key_prefix: keyPrefix,
            key_hash: keyHash,
        })
        .select('id, name, key_prefix, last_used_at, created_at')
        .single());

    if (error) {
        console.error('Error creating API key:', error);
        return { error: 'Failed to create API key' };
    }

    return {
        key, // Return raw key ONLY here
        apiKey: data as unknown as ApiKey
    };
}

export async function revokeApiKey(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await (supabase
        .from('api_keys' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)); // RLS handles this, but explicit check is good

    if (error) {
        console.error('Error revoking API key:', error);
        return { success: false, error: 'Failed to revoke API key' };
    }

    return { success: true };
}

export async function getApiKeys(): Promise<{ data?: ApiKey[], error?: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: 'Unauthorized' };
    }

    const { data, error } = await (supabase
        .from('api_keys' as any)
        .select('id, name, key_prefix, last_used_at, created_at')
        .order('created_at', { ascending: false }));

    if (error) {
        return { error: 'Failed to fetch API keys' };
    }

    return { data: data as unknown as ApiKey[] };
}
