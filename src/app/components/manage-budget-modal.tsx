'use client';

import { createClient } from '@/app/utils/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MoneyInput from './money-input';
import Dropdown, { DropdownOption } from './dropdown';
import type { Category, Group } from '@/types/supabase';

type ManageBudgetModalProps = {
    isOpen: boolean;
    onClose: () => void;
    isOnboarding?: boolean;
};

// ─── Onboarding wizard types ────────────────────────────────────────────────

type WizardGroup = {
    id: string; // temp client-side id
    name: string;
    categories: WizardCategory[];
};

type WizardCategory = {
    id: string;
    name: string;
    goal: string;
};

const TEMPLATES: { label: string; groups: { name: string; categories: string[] }[] }[] = [
    {
        label: 'Essential Budget',
        groups: [
            { name: 'Housing', categories: ['Rent / Mortgage', 'Council Tax', 'Utilities', 'Internet'] },
            { name: 'Food', categories: ['Groceries', 'Eating Out'] },
            { name: 'Transport', categories: ['Fuel', 'Public Transport', 'Car Insurance'] },
            { name: 'Savings', categories: ['Emergency Fund', 'General Savings'] },
        ],
    },
    {
        label: 'Lifestyle Budget',
        groups: [
            { name: 'Entertainment', categories: ['Subscriptions', 'Hobbies', 'Nights Out'] },
            { name: 'Health', categories: ['Gym', 'Healthcare', 'Pharmacy'] },
            { name: 'Shopping', categories: ['Clothing', 'Electronics', 'Personal Care'] },
            { name: 'Savings', categories: ['Holiday Fund', 'Investments'] },
        ],
    },
    {
        label: 'Student Budget',
        groups: [
            { name: 'Essentials', categories: ['Rent', 'Groceries', 'Bills'] },
            { name: 'Study', categories: ['Books & Supplies', 'Software'] },
            { name: 'Social', categories: ['Eating Out', 'Nights Out', 'Hobbies'] },
            { name: 'Savings', categories: ['Emergency Fund'] },
        ],
    },
];

function uid() {
    return Math.random().toString(36).slice(2);
}

// ─── Onboarding Wizard ───────────────────────────────────────────────────────

function OnboardingWizard({ onClose }: { onClose: () => void }) {
    const supabase = createClient();
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 4;

    // Step 2 & 3 state
    const [wizardGroups, setWizardGroups] = useState<WizardGroup[]>([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [saving, setSaving] = useState(false);

    const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
        const groups: WizardGroup[] = tpl.groups.map(g => ({
            id: uid(),
            name: g.name,
            categories: g.categories.map(c => ({ id: uid(), name: c, goal: '' })),
        }));
        setWizardGroups(groups);
        setStep(3);
    };

    const addGroup = () => {
        if (!newGroupName.trim()) return;
        setWizardGroups(prev => [...prev, { id: uid(), name: newGroupName.trim(), categories: [] }]);
        setNewGroupName('');
    };

    const removeGroup = (gid: string) => setWizardGroups(prev => prev.filter(g => g.id !== gid));

    const updateGroupName = (gid: string, name: string) =>
        setWizardGroups(prev => prev.map(g => g.id === gid ? { ...g, name } : g));

    const addCategory = (gid: string) =>
        setWizardGroups(prev => prev.map(g =>
            g.id === gid ? { ...g, categories: [...g.categories, { id: uid(), name: '', goal: '' }] } : g
        ));

    const updateCategory = (gid: string, cid: string, field: 'name' | 'goal', value: string) =>
        setWizardGroups(prev => prev.map(g =>
            g.id === gid ? {
                ...g,
                categories: g.categories.map(c => c.id === cid ? { ...c, [field]: value } : c)
            } : g
        ));

    const removeCategory = (gid: string, cid: string) =>
        setWizardGroups(prev => prev.map(g =>
            g.id === gid ? { ...g, categories: g.categories.filter(c => c.id !== cid) } : g
        ));

    const saveAndFinish = async () => {
        setSaving(true);
        try {
            for (const group of wizardGroups) {
                if (!group.name.trim()) continue;
                const { data: groupData, error: groupErr } = await supabase
                    .from('groups')
                    .insert({ name: group.name.trim() })
                    .select()
                    .single();
                if (groupErr) throw groupErr;

                const validCats = group.categories.filter(c => c.name.trim());
                if (validCats.length > 0) {
                    const { error: catErr } = await supabase
                        .from('categories')
                        .insert(validCats.map(c => ({
                            name: c.name.trim(),
                            group: groupData.id,
                            goal: c.goal ? parseFloat(c.goal) : null,
                            timeframe: { type: 'monthly' as const },
                        })));
                    if (catErr) throw catErr;
                }
            }
            setStep(4);
        } catch (err) {
            console.error(err);
            toast.error('Failed to save budget. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

    return (
        <div className="flex flex-col h-full">
            {/* Progress bar */}
            <div className="flex-none px-6 pt-6 pb-4 border-b border-white/[.1]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green/20 border border-green/40 flex items-center justify-center">
                            <span className="text-green text-xs font-bold">{step}</span>
                        </div>
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wide">Step {step} of {TOTAL_STEPS}</p>
                            <p className="text-sm font-medium text-white">
                                {step === 1 && 'How CashCat Works'}
                                {step === 2 && 'Choose a Template'}
                                {step === 3 && 'Customise Your Budget'}
                                {step === 4 && "You're All Set!"}
                            </p>
                        </div>
                    </div>
                    {step < 4 && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/[.05] rounded-full transition-colors text-white/50 hover:text-white text-xs"
                        >
                            Skip for now
                        </button>
                    )}
                </div>
                <div className="h-1.5 bg-white/[.08] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-scroll">

                {/* ── Step 1: Zero-based budgeting explainer ── */}
                {step === 1 && (
                    <div className="p-6 space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green/10 border border-green/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Zero-Based Budgeting</h2>
                            <p className="text-white/60 text-sm max-w-sm mx-auto">
                                The method that puts <span className="text-green font-semibold">you</span> in control of every penny.
                            </p>
                        </div>

                        {/* Core concept */}
                        <div className="bg-green/[.06] border border-green/20 rounded-xl p-5">
                            <h3 className="font-semibold text-green mb-2">The Core Idea</h3>
                            <p className="text-white/80 text-sm leading-relaxed">
                                Give <strong className="text-white">every pound you earn a specific job</strong> before you spend it.
                                Your income minus your assigned spending should equal <strong className="text-green">zero</strong>. Not because you spend everything,
                                but because every pound is <em>intentionally allocated</em> somewhere.
                            </p>
                        </div>

                        {/* Visual analogy */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">How it works</h3>
                            <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                <div className="bg-white/[.04] rounded-xl p-4 border border-white/[.08]">


                                    <div className=''> <svg className="block mx-auto mb-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><title>cash-multiple</title><path d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z" /></svg>
                                    </div>
                                    <div className="font-semibold text-white mb-1">Income arrives</div>
                                    <div className="text-white/50">Your salary, freelance, etc.</div>
                                </div>
                                <div className="flex items-center justify-center text-white/30">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </div>
                                <div className="bg-white/[.04] rounded-xl p-4 border border-white/[.08]">
                                    <div className=''> <svg className="block mx-auto mb-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><title>cash-multiple</title><path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21M15.8 16V8.9L13.7 11L9.8 7.2L7 10L10.8 13.9L8.7 16H15.8Z" /></svg>


                                    </div>
                                    <div className="font-semibold text-white mb-1">Assign it all</div>
                                    <div className="text-white/50">Rent, food, savings…</div>
                                </div>
                            </div>
                            <div className="bg-white/[.04] rounded-xl p-4 border border-white/[.08] text-center text-xs">
                                <div className=''> <svg className="block mx-auto mb-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><title>cash-multiple</title><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>check-decagram</title><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" /></svg></svg>
                                </div>
                                <div className="font-semibold text-white mb-1">Zero left to assign</div>
                                <div className="text-white/50">Every pound has a purpose — no surprises at month end</div>
                            </div>
                        </div>

                        {/* Key benefits */}
                        <div className="space-y-2">
                            {[
                                { text: 'Spend intentionally — no more mystery spending' },
                                { text: 'Build savings faster by planning ahead' },
                                { text: 'Reduce financial stress with full visibility' },
                            ].map(({ text }) => (
                                <div key={text} className="flex items-center gap-3 text-sm text-white/80">

                                    <span>{text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 py-3 bg-green hover:bg-green-dark text-black font-bold rounded-xl transition-colors"
                            >
                                Let's Build My Budget →
                            </button>
                        </div>
                        <p className="text-center text-xs text-white/40">
                            Want to learn more first?{' '}
                            <Link href="/docs/zero-based-budgeting" target="_blank" className="text-green hover:underline">
                                Read the full guide
                            </Link>
                        </p>
                    </div>
                )}

                {/* ── Step 2: Template picker ── */}
                {step === 2 && (
                    <div className="p-6 space-y-5">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Pick a Starting Point</h2>
                            <p className="text-white/60 text-sm">
                                Choose a template to get started quickly, or build from scratch. You can customise everything in the next step.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {TEMPLATES.map(tpl => (
                                <button
                                    key={tpl.label}
                                    onClick={() => applyTemplate(tpl)}
                                    className="w-full text-left p-4 bg-white/[.04] hover:bg-white/[.08] border border-white/[.1] hover:border-green/40 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-semibold text-white group-hover:text-green transition-colors">{tpl.label}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tpl.groups.map(g => (
                                            <span key={g.name} className="text-xs px-2 py-0.5 bg-white/[.06] rounded-full text-white/60">
                                                {g.name}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="relative flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/[.1]" />
                            <span className="text-xs text-white/40">or</span>
                            <div className="flex-1 h-px bg-white/[.1]" />
                        </div>

                        <button
                            onClick={() => setStep(3)}
                            className="w-full py-3 border border-white/20 hover:bg-white/[.05] text-white/80 hover:text-white rounded-xl transition-all text-sm font-medium"
                        >
                            Start from Scratch
                        </button>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors"
                        >
                            ← Back
                        </button>
                    </div>
                )}

                {/* ── Step 3: Customise groups & categories ── */}
                {step === 3 && (
                    <div className="p-6 space-y-5 pb-32">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Customise Your Budget</h2>
                            <p className="text-white/60 text-sm">
                                Groups are like envelopes. Categories are the specific jobs inside each envelope.
                                Set optional monthly goals for each category.
                            </p>
                        </div>

                        {wizardGroups.length === 0 && (
                            <div className="text-center py-8 text-white/40 text-sm">
                                No groups yet. Add one below to get started.
                            </div>
                        )}

                        <div className="space-y-4">
                            {wizardGroups.map(group => (
                                <div key={group.id} className="bg-white/[.03] border border-white/[.08] rounded-xl">
                                    {/* Group header */}
                                    <div className="flex items-center gap-2 p-3 border-b border-white/[.06] bg-white/[.02]">
                                        <input
                                            type="text"
                                            value={group.name}
                                            onChange={e => updateGroupName(group.id, e.target.value)}
                                            placeholder="Group name"
                                            className="flex-1 bg-transparent text-sm font-semibold text-green placeholder-white/30 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => removeGroup(group.id)}
                                            className="p-1 rounded hover:bg-white/[.08] text-white/30 hover:text-reddy transition-colors"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    {/* Categories */}
                                    <div className="p-3 space-y-2">
                                        {group.categories.map(cat => (
                                            <div key={cat.id} className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green/40 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    value={cat.name}
                                                    onChange={e => updateCategory(group.id, cat.id, 'name', e.target.value)}
                                                    placeholder="Category name"
                                                    className="flex-1 text-sm bg-white/[.04] border border-white/[.08] focus:border-green/40 rounded-lg px-2 py-1.5 focus:outline-none transition-colors placeholder-white/30"
                                                />
                                                <div className="w-24 flex-shrink-0">
                                                    <MoneyInput
                                                        value={cat.goal}
                                                        onChange={v => updateCategory(group.id, cat.id, 'goal', v)}
                                                        placeholder="Goal"
                                                        currencySymbol={true}
                                                        className="text-xs"
                                                        inline={true}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeCategory(group.id, cat.id)}
                                                    className="p-1 rounded hover:bg-white/[.08] text-white/20 hover:text-reddy transition-colors flex-shrink-0"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addCategory(group.id)}
                                            className="w-full text-xs text-white/40 hover:text-green py-1.5 border border-dashed border-white/[.1] hover:border-green/30 rounded-lg transition-all flex items-center justify-center gap-1"
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                                            Add category
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add group */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addGroup()}
                                placeholder="New group name…"
                                className="flex-1 text-sm bg-white/[.04] border border-white/[.1] focus:border-green/40 rounded-xl px-3 py-2.5 focus:outline-none transition-colors placeholder-white/30"
                            />
                            <button
                                onClick={addGroup}
                                disabled={!newGroupName.trim()}
                                className="px-4 py-2.5 bg-green/20 hover:bg-green/30 text-green rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Add Group
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setStep(2)}
                                className="px-4 py-2.5 border border-white/20 hover:bg-white/[.05] text-white/70 rounded-xl text-sm transition-colors"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={saveAndFinish}
                                disabled={saving || wizardGroups.length === 0}
                                className="flex-1 py-2.5 bg-green hover:bg-green-dark text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    'Save & Finish →'
                                )}
                            </button>
                        </div>
                        {wizardGroups.length === 0 && (
                            <button
                                onClick={() => setStep(4)}
                                className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                                Skip for now (add categories later)
                            </button>
                        )}
                    </div>
                )}

                {/* ── Step 4: Done ── */}
                {step === 4 && (
                    <div className="p-6 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-green/10 border border-green/30 rounded-full flex items-center justify-center mt-4">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-green">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
                            <p className="text-white/60 text-sm max-w-xs mx-auto">
                                Your budget is ready. Start by assigning money to your categories, then log transactions as you spend.
                            </p>
                        </div>

                        {wizardGroups.length > 0 && (
                            <div className="w-full bg-white/[.03] rounded-xl p-4 text-left space-y-2">
                                <p className="text-xs text-white/50 uppercase tracking-wide mb-3">Created</p>
                                {wizardGroups.filter(g => g.name.trim()).map(g => (
                                    <div key={g.id} className="flex items-center justify-between text-sm">
                                        <span className="text-green font-medium">{g.name}</span>
                                        <span className="text-white/50">{g.categories.filter(c => c.name.trim()).length} categories</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="w-full space-y-3">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-green hover:bg-green-dark text-black font-bold rounded-xl transition-colors"
                            >
                                Go to My Budget →
                            </button>
                            <Link
                                href="/docs/getting-started"
                                onClick={onClose}
                                className="block w-full py-3 border border-white/20 hover:bg-white/[.05] text-white/80 hover:text-white rounded-xl transition-all text-sm font-medium"
                            >
                                Read the Getting Started Guide
                            </Link>
                            <Link
                                href="/docs"
                                onClick={onClose}
                                className="block text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                                Browse all documentation →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Normal Edit Mode ────────────────────────────────────────────────────────

function EditMode({ onClose }: { onClose: () => void }) {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'categories' | 'settings'>('categories');
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideBudgetValues, setHideBudgetValues] = useState(false);

    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [editingGoalAsString, setEditingGoalAsString] = useState('');
    const [showAddCategoryForGroup, setShowAddCategoryForGroup] = useState<string | null>(null);
    const [newGroupCategoryData, setNewGroupCategoryData] = useState({
        name: '',
        goal: '',
        timeframe: 'monthly' as const,
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHideBudgetValues(localStorage.getItem('hideBudgetValues') === 'true');
        }
    }, []);

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setEditingGoalAsString(category.goal?.toFixed(2) || '');
    };

    const toggleHideBudgetValues = () => {
        const newValue = !hideBudgetValues;
        setHideBudgetValues(newValue);
        if (typeof window !== 'undefined') {
            localStorage.setItem('hideBudgetValues', newValue.toString());
            window.dispatchEvent(new CustomEvent('hideBudgetValuesChanged', { detail: { hideBudgetValues: newValue } }));
        }
    };

    const fetchGroups = async () => {
        const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: true });
        if (error) { setError('Failed to load groups'); return; }
        setGroups(data || []);
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('*, groups(id, name)')
            .order('created_at', { ascending: true });
        if (error) { setError('Failed to load categories'); return; }
        setCategories((data as any) || []);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchGroups(), fetchCategories()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => { setError(''); }, [activeTab]);

    const createGroup = async (name: string) => {
        await toast.promise(
            (async () => {
                const { error } = await supabase.from('groups').insert({ name });
                if (error) throw error;
            })(),
            { loading: 'Creating group…', success: 'Group created!', error: 'Failed to create group' }
        );
        await fetchGroups();
        setNewGroupName('');
    };

    const updateGroup = async (id: string, name: string) => {
        await toast.promise(
            (async () => {
                const { error } = await supabase.from('groups').update({ name }).eq('id', id);
                if (error) throw error;
            })(),
            { loading: 'Updating…', success: 'Group updated!', error: 'Failed to update group' }
        );
        await fetchGroups();
        setEditingGroup(null);
    };

    const deleteGroup = async (id: string) => {
        await toast.promise(
            (async () => {
                const { error } = await supabase.from('groups').delete().eq('id', id);
                if (error) throw error;
            })(),
            { loading: 'Deleting…', success: 'Group deleted!', error: 'Failed to delete group — reassign categories first' }
        );
        await fetchGroups();
        await fetchCategories();
    };

    const createCategoryForGroup = async (groupId: string, data: typeof newGroupCategoryData) => {
        await toast.promise(
            (async () => {
                const { error } = await supabase.from('categories').insert({
                    name: data.name,
                    group: groupId,
                    goal: data.goal ? parseFloat(data.goal) : null,
                    timeframe: { type: 'monthly' as const },
                });
                if (error) throw error;
            })(),
            { loading: 'Creating category…', success: 'Category created!', error: 'Failed to create category' }
        );
        await fetchCategories();
        setNewGroupCategoryData({ name: '', goal: '', timeframe: 'monthly' });
        setShowAddCategoryForGroup(null);
    };

    const updateCategory = async (id: string, data: Partial<Category>) => {
        await toast.promise(
            (async () => {
                const { error } = await supabase.from('categories').update(data as any).eq('id', id);
                if (error) throw error;
            })(),
            { loading: 'Updating…', success: 'Category updated!', error: 'Failed to update category' }
        );
        await fetchCategories();
        setEditingCategory(null);
    };

    const deleteCategory = async (id: string) => {
        await toast.promise(
            (async () => {
                const { error } = await supabase.from('categories').delete().eq('id', id);
                if (error) throw error;
            })(),
            { loading: 'Deleting…', success: 'Category deleted!', error: 'Failed to delete category — reassign transactions first' }
        );
        await fetchCategories();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-none p-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b border-white/[.1]">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage Budget</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/[.05] rounded-full transition-colors text-white">
                        <Image src="/plus.svg" alt="Close" width={16} height={16} className="opacity-100 invert rotate-45" />
                    </button>
                </div>
                <div className="flex gap-4 mt-6">
                    {(['categories', 'settings'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 transition-all duration-200 capitalize ${activeTab === tab ? 'text-green border-b-2 border-green' : 'text-white/60 hover:text-white'}`}
                        >
                            {tab === 'categories' ? 'Categories & Groups' : 'Other Settings'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 pb-30">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && <div className="bg-reddy/20 text-reddy p-3 rounded-lg text-sm mb-4">{error}</div>}

                        {activeTab === 'settings' ? (
                            <div className="space-y-6">
                                <div className="bg-white/[.03] rounded-lg p-6">
                                    <h3 className="text-lg font-medium text-green mb-4">Display</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-white/[.03] rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-white">Hide Budget Values</h4>
                                                <p className="text-sm text-white/60 mt-1">Replace all monetary values with asterisks for screen sharing</p>
                                            </div>
                                            <button
                                                onClick={toggleHideBudgetValues}
                                                className={`relative min-w-10 h-6 rounded-full transition-colors duration-200 ${hideBudgetValues ? 'bg-green' : 'bg-white/20'}`}
                                            >
                                                <div className={`absolute w-5 h-5 bg-white rounded-full transition-transform duration-200 top-0.5 ${hideBudgetValues ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                        </div>
                                        <div className="flex justify-between p-4 bg-white/[.03] rounded-lg flex-col">
                                            <p className="block font-medium text-white mb-2">Currency</p>
                                            <Dropdown
                                                value="GBP"
                                                onChange={() => { }}
                                                options={[
                                                    { value: 'GBP', label: '£ GBP (Coming Soon)', disabled: true },
                                                    { value: 'USD', label: '$ USD (Coming Soon)', disabled: true },
                                                    { value: 'EUR', label: '€ EUR (Coming Soon)', disabled: true },
                                                ]}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/[.03] rounded-lg p-6">
                                    <h3 className="text-lg font-medium text-green mb-4">Import</h3>
                                    <div className="flex text-left justify-between p-4 bg-white/[.03] rounded-lg flex-col">
                                        <p className="block font-medium text-white mb-2">Import Transactions</p>
                                        <button disabled className="w-full px-4 py-2 bg-white/[.05] rounded-lg text-white/70 disabled:opacity-50">
                                            Import from CSV (Coming Soon)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Add new group */}
                                <div className="bg-white/[.03] rounded-lg overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddGroup(!showAddGroup)}
                                        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[.02] transition-colors"
                                    >
                                        <h3 className="text-lg font-medium text-green">Add New Group</h3>
                                        <Image
                                            src={showAddGroup ? '/minus.svg' : '/plus.svg'}
                                            alt={showAddGroup ? 'Collapse' : 'Expand'}
                                            width={16} height={16}
                                            className="opacity-70 invert"
                                        />
                                    </button>
                                    {showAddGroup && (
                                        <div className="px-4 pb-4 border-t border-white/[.05]">
                                            <form onSubmit={e => { e.preventDefault(); createGroup(newGroupName); setShowAddGroup(false); }} className="space-y-4 mt-4">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newGroupName}
                                                        onChange={e => setNewGroupName(e.target.value)}
                                                        placeholder="Enter group name"
                                                        className="flex-1 p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                        autoFocus={showAddGroup}
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!newGroupName.trim()}
                                                        className="bg-green text-black px-4 py-2 rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 text-sm font-medium"
                                                    >
                                                        Add Group
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>

                                {/* Groups list */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-white/80">Your Groups & Categories</h3>
                                    {groups.map(group => {
                                        const groupCategories = categories.filter(cat => cat.group === group.id);
                                        return (
                                            <div key={group.id} className="bg-white/[.03] rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[.1]">
                                                    {editingGroup?.id === group.id ? (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <input
                                                                type="text"
                                                                value={editingGroup.name}
                                                                onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                                                                className="flex-1 p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                            />
                                                            <button onClick={() => updateGroup(group.id, editingGroup.name)} className="px-3 py-1 rounded-lg bg-green/20 hover:bg-green/30 text-green text-sm">Save</button>
                                                            <button onClick={() => setEditingGroup(null)} className="px-3 py-1 rounded-lg hover:bg-white/[.05] text-sm">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                <h4 className="font-medium text-lg text-green">{group.name}</h4>
                                                                <p className="text-sm text-white/50">{groupCategories.length} categories</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setEditingGroup(group)} className="p-2 rounded-lg hover:bg-white/[.05] text-sm">Edit</button>
                                                                <button onClick={() => deleteGroup(group.id)} className="p-2 rounded-lg hover:bg-reddy/20 text-reddy text-sm">Delete</button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="mb-3">
                                                        {showAddCategoryForGroup === group.id ? (
                                                            <div className="p-3 rounded-lg bg-white/[.03] border border-white/[.1]">
                                                                <form onSubmit={e => { e.preventDefault(); createCategoryForGroup(group.id, newGroupCategoryData); }} className="space-y-3">
                                                                    <input
                                                                        type="text"
                                                                        value={newGroupCategoryData.name}
                                                                        onChange={e => setNewGroupCategoryData({ ...newGroupCategoryData, name: e.target.value })}
                                                                        placeholder="Category name"
                                                                        className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none text-sm"
                                                                        autoFocus
                                                                    />
                                                                    <div>
                                                                        <label className="block text-sm text-white/50 mb-1">Monthly Goal (Optional)</label>
                                                                        <MoneyInput
                                                                            value={newGroupCategoryData.goal}
                                                                            onChange={v => setNewGroupCategoryData({ ...newGroupCategoryData, goal: v })}
                                                                            placeholder="0.00"
                                                                            currencySymbol={true}
                                                                            className="text-lg"
                                                                            inline={true}
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-end gap-2">
                                                                        <button type="button" onClick={() => { setShowAddCategoryForGroup(null); setNewGroupCategoryData({ name: '', goal: '', timeframe: 'monthly' }); }} className="px-3 py-1 rounded-lg hover:bg-white/[.05] text-sm text-white/70">Cancel</button>
                                                                        <button type="submit" disabled={!newGroupCategoryData.name.trim()} className="px-3 py-1 rounded-lg bg-green/20 hover:bg-green/30 text-green text-sm disabled:opacity-50">Add Category</button>
                                                                    </div>
                                                                </form>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setShowAddCategoryForGroup(group.id)}
                                                                className="w-full p-2 rounded-lg bg-white/[.02] hover:bg-white/[.05] border border-dashed border-white/[.15] text-sm text-white/70 hover:text-white flex items-center justify-center gap-2"
                                                            >
                                                                <Image src="/plus.svg" alt="Add" width={12} height={12} className="opacity-70 invert" />
                                                                Add category to {group.name}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {groupCategories.length === 0 ? (
                                                        <p className="text-white/40 text-sm italic">No categories in this group yet</p>
                                                    ) : (
                                                        groupCategories.map(category => (
                                                            <div key={category.id} className="p-3 rounded-lg bg-white/[.05] group border-l-2 border-green/30">
                                                                {editingCategory?.id === category.id ? (
                                                                    <form onSubmit={e => {
                                                                        e.preventDefault();
                                                                        if (!editingCategory.group) return;
                                                                        updateCategory(category.id, {
                                                                            name: editingCategory.name,
                                                                            group: editingCategory.group,
                                                                            goal: parseFloat(editingGoalAsString) || null,
                                                                        });
                                                                    }} className="space-y-3">
                                                                        <div className="flex gap-4">
                                                                            <div className="flex-1">
                                                                                <input
                                                                                    type="text"
                                                                                    value={editingCategory.name}
                                                                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                                                    className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none text-sm"
                                                                                />
                                                                            </div>
                                                                            <Dropdown
                                                                                value={editingCategory.group || ''}
                                                                                onChange={v => setEditingCategory({ ...editingCategory, group: v })}
                                                                                options={groups.map((g): DropdownOption => ({ value: g.id, label: g.name }))}
                                                                                required
                                                                                className="w-1/3"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm text-white/50 mb-1">Monthly Goal</label>
                                                                            <MoneyInput
                                                                                value={editingGoalAsString}
                                                                                onChange={v => setEditingGoalAsString(v)}
                                                                                placeholder="0.00"
                                                                                currencySymbol={true}
                                                                                className="text-lg"
                                                                                inline={true}
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-end gap-2">
                                                                            <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-1 rounded-lg hover:bg-white/[.05] text-sm">Cancel</button>
                                                                            <button type="submit" disabled={!editingCategory.name.trim() || !editingCategory.group} className="px-3 py-1 rounded-lg bg-green/20 hover:bg-green/30 text-green text-sm disabled:opacity-50">Save Changes</button>
                                                                        </div>
                                                                    </form>
                                                                ) : (
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <span className="block font-medium">{category.name}</span>
                                                                            <span className="text-sm text-white/50">Goal: £{category.goal || 0}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => handleEditCategory(category)} className="p-2 rounded-lg hover:bg-white/[.05] text-sm">Edit</button>
                                                                            <button onClick={() => deleteCategory(category.id)} className="p-2 rounded-lg hover:bg-reddy/20 text-reddy text-sm">Delete</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {groups.length === 0 && (
                                        <p className="text-white/40 text-center py-8">No groups yet. Add your first group above to get started.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ManageBudgetModal({ isOpen, onClose, isOnboarding = false }: ManageBudgetModalProps) {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflowY = 'hidden';
            setIsClosing(false);
        } else {
            document.body.style.overflowY = 'unset';
        }
        return () => { document.body.style.overflowY = 'unset'; };
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) handleClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 bg-black md:bg-black/70 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center font-[family-name:var(--font-suse)] overflow-hidden ${isClosing ? 'animate-[fadeOut_0.2s_ease-out_forwards]' : 'animate-[fadeIn_0.2s_ease-out]'}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`relative bg-[#111] md:bg-white/[.09] md:rounded-lg md:border-b-4 w-full md:max-w-xl h-screen md:h-auto md:max-h-[90vh] flex flex-col ${isClosing ? 'animate-[slideOut_0.2s_ease-out_forwards]' : 'animate-[slideIn_0.2s_ease-out]'}`}
            >
                {isOnboarding ? (
                    <OnboardingWizard onClose={handleClose} />
                ) : (
                    <EditMode onClose={handleClose} />
                )}
            </div>
        </div>
    );
}
