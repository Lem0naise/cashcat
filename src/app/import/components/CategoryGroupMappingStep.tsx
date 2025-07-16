'use client';

import { useState, useEffect } from 'react';
import { SourceCategoryGroup, CategoryGroupMapping } from '@/lib/import-presets/types';
import { useSupabaseClient } from '@/app/hooks/useSupabaseClient';
import toast from 'react-hot-toast';

interface CategoryGroup {
    id: string;
    name: string;
    created_at: string;
    user_id: string;
}

interface CategoryGroupMappingStepProps {
    sourceCategoryGroups: SourceCategoryGroup[];
    onComplete: (mappings: CategoryGroupMapping[]) => void;
    onBack: () => void;
}

export default function CategoryGroupMappingStep({ 
    sourceCategoryGroups, 
    onComplete, 
    onBack 
}: CategoryGroupMappingStepProps) {
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
    const [mappings, setMappings] = useState<CategoryGroupMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const supabase = useSupabaseClient();

    useEffect(() => {
        fetchCategoryGroups();
        initializeMappings();
    }, [sourceCategoryGroups]);

    const fetchCategoryGroups = async () => {
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
            
            setCategoryGroups(data || []);
        } catch (error) {
            console.error('Error fetching category groups:', error);
            toast.error('Failed to fetch category groups');
        } finally {
            setLoading(false);
        }
    };

    const initializeMappings = () => {
        const initialMappings = sourceCategoryGroups.map(sourceGroup => ({
            sourceCategoryGroup: sourceGroup.name,
            targetGroupId: '',
            shouldCreateNew: false,
            newGroupName: sourceGroup.name
        }));
        setMappings(initialMappings);
    };

    const updateMapping = (index: number, field: keyof CategoryGroupMapping, value: any) => {
        setMappings(prev => {
            const newMappings = [...prev];
            newMappings[index] = { ...newMappings[index], [field]: value };
            
            // Reset related fields when switching between create new and existing
            if (field === 'shouldCreateNew') {
                if (value) {
                    newMappings[index].targetGroupId = '';
                } else {
                    newMappings[index].newGroupName = '';
                }
            }
            
            return newMappings;
        });
    };

    const handleComplete = async () => {
        // Validate all mappings are complete
        const isValid = mappings.every(mapping => {
            if (mapping.shouldCreateNew) {
                return mapping.newGroupName && mapping.newGroupName.trim().length > 0;
            } else {
                return mapping.targetGroupId && mapping.targetGroupId.length > 0;
            }
        });

        if (!isValid) {
            toast.error('Please complete all category group mappings before continuing.');
            return;
        }

        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Create new groups if needed
            const updatedMappings = [...mappings];
            
            for (let i = 0; i < updatedMappings.length; i++) {
                const mapping = updatedMappings[i];
                
                if (mapping.shouldCreateNew && mapping.newGroupName) {
                    // Create the group
                    const { data: newGroup, error } = await supabase
                        .from('groups')
                        .insert({
                            name: mapping.newGroupName,
                            user_id: user.id
                        })
                        .select()
                        .single();

                    if (error) throw error;

                    // Update the mapping to use the new group ID
                    updatedMappings[i] = {
                        ...mapping,
                        targetGroupId: newGroup.id
                    };

                    toast.success(`Created category group: ${mapping.newGroupName}`);
                }
            }

            onComplete(updatedMappings);
        } catch (error) {
            console.error('Error creating category groups:', error);
            toast.error('Failed to create category groups. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Loading category groups...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Map Category Groups</h2>
                <p className="text-white/70">
                    Link your source category groups to existing CashCat groups or create new ones.
                </p>
            </div>

            <div className="space-y-4">
                {sourceCategoryGroups.map((sourceGroup, index) => (
                    <div key={sourceGroup.name} className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">{sourceGroup.name}</h3>
                                <p className="text-white/60 text-sm">
                                    {sourceGroup.categories.length} categories
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {sourceGroup.categories.slice(0, 3).map(category => (
                                        <span key={category.name} className="text-xs bg-white/10 px-2 py-1 rounded">
                                            {category.name}
                                        </span>
                                    ))}
                                    {sourceGroup.categories.length > 3 && (
                                        <span className="text-xs text-white/60">
                                            +{sourceGroup.categories.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`group-${index}`}
                                        checked={!mappings[index]?.shouldCreateNew}
                                        onChange={() => updateMapping(index, 'shouldCreateNew', false)}
                                        className="text-green focus:ring-green"
                                    />
                                    <span>Use existing group</span>
                                </label>
                                
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`group-${index}`}
                                        checked={mappings[index]?.shouldCreateNew || false}
                                        onChange={() => updateMapping(index, 'shouldCreateNew', true)}
                                        className="text-green focus:ring-green"
                                    />
                                    <span>Create new group</span>
                                </label>
                            </div>

                            {mappings[index]?.shouldCreateNew ? (
                                <div>
                                    <label className="block text-sm font-medium mb-2">New Group Name</label>
                                    <input
                                        type="text"
                                        value={mappings[index]?.newGroupName || ''}
                                        onChange={(e) => updateMapping(index, 'newGroupName', e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:border-green"
                                        placeholder="Enter group name"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Select Existing Group</label>
                                    <select
                                        value={mappings[index]?.targetGroupId || ''}
                                        onChange={(e) => updateMapping(index, 'targetGroupId', e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white focus:outline-none focus:border-green"
                                    >
                                        <option value="">Select a group...</option>
                                        {categoryGroups.map(group => (
                                            <option key={group.id} value={group.id}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-green text-black rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {creating ? 'Creating Groups...' : 'Continue to Categories'}
                </button>
            </div>
        </div>
    );
}
