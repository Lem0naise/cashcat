'use client';

import { useState, useEffect } from 'react';
import { createApiKey, revokeApiKey, getApiKeys, type ApiKey } from '@/app/actions/api-keys';
import toast from 'react-hot-toast';

export default function ApiKeyManager() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [keyName, setKeyName] = useState('');

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        const { data, error } = await getApiKeys();
        if (error) {
            toast.error(error);
        } else if (data) {
            setKeys(data);
        }
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!keyName.trim()) return;

        const result = await createApiKey(keyName);
        if ('error' in result) {
            toast.error(result.error || 'Failed to create key');
        } else {
            setNewKey(result.key); // Show the raw key
            setKeys([result.apiKey, ...keys]);
            setKeyName('');
            toast.success('API Key created');
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;

        const { success, error } = await revokeApiKey(id);
        if (success) {
            setKeys(keys.filter(k => k.id !== id));
            toast.success('API Key revoked');
        } else {
            toast.error(error || 'Failed to revoke key');
        }
    };

    const copyToClipboard = () => {
        if (newKey) {
            navigator.clipboard.writeText(newKey);
            toast.success('Copied to clipboard');
        }
    };

    return (
        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
            <h2 className="text-lg font-semibold mb-4">API Keys</h2>
            <p className="text-sm text-white/70 mb-4">
                Manage personal access tokens for the CashCat Public API.
                <a href="/docs/api" className="text-green hover:underline ml-2">Read the API Docs &rarr;</a>
            </p>

            <button
                onClick={() => setShowCreateModal(true)}
                className="mb-4 px-4 py-2 bg-green text-black rounded-lg hover:bg-green-dark transition-colors text-sm font-medium"
            >
                Create New Key
            </button>

            {loading ? (
                <div className="text-sm text-white/50">Loading keys...</div>
            ) : keys.length === 0 ? (
                <div className="text-sm text-white/50">No API keys found.</div>
            ) : (
                <div className="space-y-2">
                    {keys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-3 bg-white/[.05] rounded-md">
                            <div>
                                <div className="font-medium text-sm">{key.name}</div>
                                <div className="text-xs text-white/50 font-mono mt-1">
                                    Prefix: {key.key_prefix}...
                                </div>
                                <div className="text-xs text-white/40 mt-1">
                                    Created: {new Date(key.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRevoke(key.id)}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-white/[.1]"
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] p-6 rounded-xl max-w-sm w-full border border-white/10 shadow-2xl">
                        {!newKey ? (
                            <>
                                <h3 className="text-lg font-bold mb-4">Create API Key</h3>
                                <input
                                    type="text"
                                    placeholder="Key Name (e.g. My Script)"
                                    className="w-full bg-white/[.05] border border-white/10 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:border-green/50"
                                    value={keyName}
                                    onChange={e => setKeyName(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-white/60 hover:text-white text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!keyName.trim()}
                                        className="px-4 py-2 bg-green text-black rounded-lg hover:bg-green-dark disabled:opacity-50 text-sm font-medium"
                                    >
                                        Create
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold mb-2 text-green">Key Created!</h3>
                                <p className="text-sm text-white/70 mb-4">
                                    Copy this key now. You won't be able to see it again!
                                </p>
                                <div
                                    onClick={copyToClipboard}
                                    className="bg-black/50 p-3 rounded border border-green/30 font-mono text-xs break-all cursor-pointer hover:bg-black/70 mb-6 flex items-center justify-between group"
                                >
                                    <span>{newKey}</span>
                                    <span className="text-green opacity-0 group-hover:opacity-100 transition-opacity ml-2">Copy</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setNewKey(null);
                                        setShowCreateModal(false);
                                    }}
                                    className="w-full px-4 py-2 bg-white/[.1] hover:bg-white/[.15] rounded-lg text-sm"
                                >
                                    Done
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
