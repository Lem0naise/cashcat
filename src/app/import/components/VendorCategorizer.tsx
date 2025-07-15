'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { VendorCategorization } from '@/lib/import-presets/types';
import { Database } from '@/types/supabase';

interface VendorCategorizerProps {
    vendors: { vendor: string; count: number }[];
    onComplete: (categorizations: VendorCategorization[]) => void;
    onBack: () => void;
}

type Category = Database['public']['Tables']['categories']['Row'];

export default function VendorCategorizer({ vendors, onComplete, onBack }: VendorCategorizerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categorizations, setCategorizations] = useState<VendorCategorization[]>(
        vendors.map(v => ({ vendor: v.vendor, category_id: '', transactionCount: v.count }))
    );
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const supabase = createClientComponentClient<Database>();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateCategorization = (vendor: string, categoryId: string) => {
        setCategorizations(prev =>
            prev.map(cat =>
                cat.vendor === vendor
                    ? { ...cat, category_id: categoryId }
                    : cat
            )
        );
    };

    const handleComplete = () => {
        // Only include categorizations that have a category selected
        const validCategorizations = categorizations.filter(cat => cat.category_id);
        onComplete(validCategorizations);
    };

    const filteredVendors = vendors.filter(vendor =>
        vendor.vendor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryName = (categoryId: string) => {
        const category = categories.find(cat => cat.id === categoryId);
        return category?.name || '';
    };

    const categorizedCount = categorizations.filter(cat => cat.category_id).length;
    const totalTransactions = categorizations
        .filter(cat => cat.category_id)
        .reduce((sum, cat) => sum + cat.transactionCount, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading categories...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Categorize Vendors</h2>
                <p className="text-white/70">
                    Assign categories to vendors. Transactions will inherit their vendor's category.
                </p>
            </div>

            {/* Progress */}
            <div className="glass-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-white/70">
                        {categorizedCount} of {vendors.length} vendors
                    </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                        className="bg-green h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(categorizedCount / vendors.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-xs text-white/60 mt-2">
                    {totalTransactions} transactions will be categorized
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 rounded-lg bg-white/5 border border-white/15 focus:border-green focus:outline-none transition-colors"
                />
                <svg className="w-5 h-5 text-white/40 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* Vendor List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredVendors.map((vendor) => {
                    const categorization = categorizations.find(cat => cat.vendor === vendor.vendor);
                    return (
                        <div key={vendor.vendor} className="glass-card rounded-lg p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium truncate">{vendor.vendor}</h3>
                                    <p className="text-sm text-white/60">
                                        {vendor.count} transaction{vendor.count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                
                                <div className="flex-shrink-0 w-64">
                                    <select
                                        value={categorization?.category_id || ''}
                                        onChange={(e) => updateCategorization(vendor.vendor, e.target.value)}
                                        className="w-full p-2 rounded bg-white/5 border border-white/15 focus:border-green focus:outline-none transition-colors text-sm"
                                    >
                                        <option value="">Select category...</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredVendors.length === 0 && searchTerm && (
                <div className="text-center py-8 text-white/60">
                    No vendors found matching "{searchTerm}"
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
                >
                    ← Back
                </button>

                <div className="text-center">
                    <p className="text-sm text-white/60 mb-2">
                        Skip unassigned vendors - you can categorize those transactions later
                    </p>
                </div>

                <button
                    onClick={handleComplete}
                    disabled={categorizedCount === 0}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                        categorizedCount > 0
                            ? 'bg-green text-black hover:bg-green-dark'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                >
                    Continue to Summary →
                </button>
            </div>
        </div>
    );
}
