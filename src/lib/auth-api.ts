import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// We need a service role client to query api_keys table based on hash
// and to bypass RLS for the actual API operations if needed (acting as that user)
// OR we can just use it to verify validity and then rely on MANUAL user_id filtering.
// Since we don't have a session, standard RLS using auth.uid() won't work automatically
// unless we try to mint a token, which is complex.
// EASIEST SECURE PATH: Verify key -> Get User ID -> Manual WHERE user_id = ... in queries.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// NOTE: This client must ONLY be used for verifying keys and performing authorized actions.
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export type AuthResult =
    | { isValid: true; userId: string; error?: undefined }
    | { isValid: false; userId?: undefined; error: string };

export async function verifyApiKey(request: Request): Promise<AuthResult> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { isValid: false, error: 'Missing or malformed Authorization header' };
    }

    const key = authHeader.split(' ')[1];
    const keyHash = createHash('sha256').update(key).digest('hex');

    const { data, error } = await adminClient
        .from('api_keys')
        .select('user_id')
        .eq('key_hash', keyHash)
        .single();

    if (error || !data) {
        return { isValid: false, error: 'Invalid API Key' };
    }

    // Async update last_used_at (fire and forget to not block response significantly)
    // We use match on key_hash to find the row again
    adminClient
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', keyHash)
        .then(({ error }) => {
            if (error) console.error('Failed to update token usage:', error);
        });

    return { isValid: true, userId: data.user_id };
}

export function getAdminClient() {
    return adminClient;
}
