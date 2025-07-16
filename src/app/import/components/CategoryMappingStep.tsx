'use client';

import { useState, useEffect, useMemo } from 'react';
import { SourceCategoryGroup, CategoryMapping } from '@/lib/import-presets/types';
import { useSupabaseClient } from '@/app/hooks/useSupabaseClient';
import CategoryDropdown from './CategoryDropdown';
import toast from 'react-hot-toast';

interface Category {
    id: string;
    name: string;
    group: string;
    created_at: string;
    user_id: string;
    goal: number | null;
    goal_type: string;
    rollover_enabled: boolean;
    timeframe: any;
    groups?: {
        id: string;
        name: string;
    } | null;
}

interface Group {
    id: string;
    name: string;
    created_at: string;
    user_id: string;
}

interface CategoryMappingStepProps {
    sourceCategoryGroups: SourceCategoryGroup[];
    onComplete: (mappings: CategoryMapping[]) => void;
    onBack: () => void;
}

export default function CategoryMappingStep({ 
    sourceCategoryGroups, 
    onComplete, 
    onBack 
}: CategoryMappingStepProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [mappings, setMappings] = useState<CategoryMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = useSupabaseClient();

    // Flatten source categories with their group info - memoized to prevent infinite loops
    const sourceCategories = useMemo(() => 
        sourceCategoryGroups.flatMap(group =>
            group.categories.map(category => ({
                ...category,
                groupName: group.name
            }))
        ), [sourceCategoryGroups]
    );

    useEffect(() => {
        Promise.all([fetchCategories(), fetchGroups()]);
    }, []); // Only run once on mount

    useEffect(() => {
        initializeMappings();
    }, [sourceCategories]); // Run when source data changes

    const fetchCategories = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('categories')
                .select(`
                    *,
                    groups (
                        id,
                        name
                    )
                `)
                .eq('user_id', user.id)
                .order('name');

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('groups')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            setGroups(data || []);
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error('Failed to fetch groups');
        }
    };

    const initializeMappings = () => {
        const initialMappings = sourceCategories.map(sourceCategory => ({
            sourceCategory: sourceCategory.name,
            sourceCategoryGroup: sourceCategory.groupName,
            targetCategoryId: ''
        }));
        setMappings(initialMappings);
    };

    const updateMapping = (index: number, categoryId: string) => {
        setMappings(prev => {
            const newMappings = [...prev];
            newMappings[index] = { 
                ...newMappings[index], 
                targetCategoryId: categoryId 
            };
            return newMappings;
        });
    };

    const handleComplete = async () => {
        // Validate all mappings are complete
        const isValid = mappings.every(mapping => {
            return mapping.targetCategoryId && mapping.targetCategoryId.length > 0;
        });

        if (!isValid) {
            toast.error('Please complete all category mappings before continuing.');
            return;
        }

        onComplete(mappings);
    };

    const handleNewCategoryCreated = () => {
        // Refresh categories when a new one is created
        fetchCategories();
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Loading categories...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Map Categories</h2>
                <p className="text-white/70">
                    Link your source categories to existing CashCat categories or create new ones.
                </p>
            </div>

            <div className="space-y-4">
                {sourceCategories.map((sourceCategory, index) => (
                    <div key={`${sourceCategory.groupName}-${sourceCategory.name}`} className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">{sourceCategory.name}</h3>
                                <p className="text-white/60 text-sm">
                                    From group: {sourceCategory.groupName} • {sourceCategory.transactionCount} transactions
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Select CashCat Category</label>
                            <CategoryDropdown
                                value={mappings[index]?.targetCategoryId || ''}
                                onChange={(categoryId) => updateMapping(index, categoryId)}
                                placeholder="Select or create a category..."
                                categories={categories}
                                groups={groups}
                                onNewCategoryCreated={handleNewCategoryCreated}
                                className="w-full"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-4 pt-6">
                <button
                    onClick={onBack}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleComplete}
                    className="flex-1 px-4 py-2 bg-green text-black rounded-lg hover:bg-green-dark transition-colors"
                >
                    Continue to Summary
                </button>
            </div>
        </div>
    );
}
