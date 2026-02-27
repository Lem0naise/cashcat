'use client';

import { createClient } from '@/app/utils/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import MoneyInput from './money-input';
import Dropdown, { DropdownOption } from './dropdown';
import type { Category, Group, GoalType } from '@/types/supabase';
import type { Database } from '@/types/supabase';
import { useTransactions } from '@/app/hooks/useTransactions';

// Category as returned by the query (includes joined groups row)
type CategoryWithGroup = Category & {
    groups: { id: string; name: string } | null;
};

type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

type ManageBudgetModalProps = {
    isOpen: boolean;
    onClose: (reason?: string) => void;
    isOnboarding?: boolean;
    onImportCSV?: () => void;
};

// ─── Onboarding wizard types ────────────────────────────────────────────────

type WizardGroup = {
    id: string; // temp client-side id
    name: string;
    categories: WizardCategory[];
    ratio?: number;
};

type WizardCategory = {
    id: string;
    name: string;
    goal: string;
    goal_type: GoalType;
};

// Per-category goal types for templates
type TemplateCategory = { name: string; goal_type: GoalType };
type TemplateGroup = { name: string; categories: TemplateCategory[]; ratio: number };
type Template = { label: string; groups: TemplateGroup[] };
const TEMPLATES: Template[] = [
    {
        label: 'Student',
        groups: [
            {
                name: 'Fixed Essentials', ratio: 0.45, categories: [
                    { name: 'Rent / Halls', goal_type: 'spending' },
                    { name: 'Tuition & Fees', goal_type: 'spending' },
                    { name: 'Phone Bill', goal_type: 'spending' },
                    { name: 'Utilities & Internet', goal_type: 'spending' },
                ]
            },
            {
                name: 'Daily Living', ratio: 0.15, categories: [
                    { name: 'Groceries', goal_type: 'spending' },
                    { name: 'Supplies & Tech', goal_type: 'spending' },
                    { name: 'Laundry & Household', goal_type: 'spending' },
                    { name: 'Transport (Bus/Train)', goal_type: 'spending' },
                ]
            },
            {
                name: 'Going Out & Social', ratio: 0.25, categories: [
                    { name: 'Nights Out & Drinks', goal_type: 'spending' },
                    { name: 'Dining & Campus Lunch', goal_type: 'spending' },
                    { name: 'Society Memberships', goal_type: 'spending' },
                    { name: 'Clothing & Subscriptions', goal_type: 'spending' },
                ]
            },
            {
                name: 'Savings & Future', ratio: 0.15, categories: [
                    { name: 'Emergency Fund', goal_type: 'emergency_fund' },
                    { name: 'Next Year Deposit', goal_type: 'savings' },
                    { name: 'Travel Home Fund', goal_type: 'savings' },
                ]
            },
        ],
    },
    {
        label: 'Young Professional',
        groups: [
            {
                name: 'Housing & Bills', ratio: 0.45, categories: [
                    { name: 'Rent', goal_type: 'spending' },
                    { name: 'Council Tax', goal_type: 'spending' },
                    { name: 'Electric, Gas & Water', goal_type: 'spending' },
                    { name: 'Internet & Phone', goal_type: 'spending' },
                ]
            },
            {
                name: 'Daily Essentials', ratio: 0.15, categories: [
                    { name: 'Groceries & Household', goal_type: 'spending' },
                    { name: 'Transport / Commute', goal_type: 'spending' },
                    { name: 'Car Maintenance & Fuel', goal_type: 'savings' },
                    { name: 'Personal Care', goal_type: 'spending' },
                ]
            },
            {
                name: 'Going Out & Lifestyle', ratio: 0.20, categories: [
                    { name: 'Dining Out & Drinks', goal_type: 'spending' },
                    { name: 'Gym & Wellness', goal_type: 'spending' },
                    { name: 'Hobbies & Entertainment', goal_type: 'spending' },
                    { name: 'Subscriptions', goal_type: 'spending' },
                ]
            },
            {
                name: 'Savings & Investments', ratio: 0.20, categories: [
                    { name: 'Emergency Fund', goal_type: 'emergency_fund' },
                    { name: 'LISA / ISA / Brokerage', goal_type: 'savings' },
                    { name: 'Student Loan Overpayment', goal_type: 'savings' },
                    { name: 'Vacation Fund', goal_type: 'savings' },
                ]
            },
        ],
    },
    {
        label: 'Family / Homeowner',
        groups: [
            {
                name: 'Housing & Utilities', ratio: 0.35, categories: [
                    { name: 'Mortgage', goal_type: 'spending' },
                    { name: 'Property Tax / Rates', goal_type: 'spending' },
                    { name: 'Home Insurance', goal_type: 'spending' },
                    { name: 'Energy & Water', goal_type: 'spending' },
                ]
            },
            {
                name: 'Family Essentials', ratio: 0.25, categories: [
                    { name: 'Groceries & Consumables', goal_type: 'spending' },
                    { name: 'Childcare / School Fees', goal_type: 'spending' },
                    { name: 'Clothing & Uniforms', goal_type: 'spending' },
                    { name: 'Transport & Fuel', goal_type: 'spending' },
                ]
            },
            {
                name: 'Health & Protection', ratio: 0.05, categories: [
                    { name: 'Life / Health Insurance', goal_type: 'spending' },
                    { name: 'Pharmacy & Medical', goal_type: 'spending' },
                    { name: 'Pet Care', goal_type: 'spending' },
                ]
            },
            {
                name: 'Going Out & Fun', ratio: 0.15, categories: [
                    { name: 'Family Outings & Dining', goal_type: 'spending' },
                    { name: 'Kids Activities / Clubs', goal_type: 'spending' },
                    { name: 'Takeaways', goal_type: 'spending' },
                    { name: 'Pocket Money', goal_type: 'spending' },
                ]
            },
            {
                name: 'Savings & Investments', ratio: 0.20, categories: [
                    { name: 'Home Maintenance Fund', goal_type: 'savings' },
                    { name: 'Car Service & MOT', goal_type: 'savings' },
                    { name: 'Kids University / ISA', goal_type: 'savings' },
                    { name: 'Family Holiday Fund', goal_type: 'savings' },
                ]
            },
        ],
    },
    {
        label: 'Debt Crusher',
        groups: [
            {
                name: 'Bare Essentials', ratio: 0.55, categories: [
                    { name: 'Rent / Mortgage', goal_type: 'spending' },
                    { name: 'Utilities & Council Tax', goal_type: 'spending' },
                    { name: 'Basic Groceries', goal_type: 'spending' },
                    { name: 'Health & Insurances', goal_type: 'spending' },
                ]
            },
            {
                name: 'Transport to Work', ratio: 0.05, categories: [
                    { name: 'Fuel / Public Transit', goal_type: 'spending' },
                    { name: 'Vehicle Maintenance', goal_type: 'savings' },
                ]
            },
            {
                name: 'Debt Payments', ratio: 0.30, categories: [
                    { name: 'Credit Card 1', goal_type: 'spending' },
                    { name: 'Credit Card 2', goal_type: 'spending' },
                    { name: 'Personal Loan', goal_type: 'spending' },
                    { name: 'Overdraft Payoff', goal_type: 'spending' },
                ]
            },
            {
                name: 'Modest Going Out', ratio: 0.05, categories: [
                    { name: 'Occasional Treat', goal_type: 'spending' },
                    { name: 'Internet / Phone', goal_type: 'spending' },
                    { name: 'Miscellaneous Buffer', goal_type: 'spending' },
                ]
            },
            {
                name: 'Savings & Safety Net', ratio: 0.05, categories: [
                    { name: 'Starter Emergency Fund', goal_type: 'emergency_fund' },
                    { name: 'Annual Fees Buffer', goal_type: 'savings' },
                ]
            },
        ],
    },
    {
        label: 'Freelancer / Gig Worker',
        groups: [
            {
                name: 'Business & Taxes', ratio: 0.30, categories: [
                    { name: 'Tax Set Aside (25-30%)', goal_type: 'savings' },
                    { name: 'Software & Tools', goal_type: 'spending' },
                    { name: 'Accountant Fees', goal_type: 'savings' },
                    { name: 'Workspace / Equipment', goal_type: 'spending' },
                ]
            },
            {
                name: 'Personal Essentials', ratio: 0.25, categories: [
                    { name: 'Rent / Mortgage', goal_type: 'spending' },
                    { name: 'Utilities & Phone', goal_type: 'spending' },
                    { name: 'Groceries', goal_type: 'spending' },
                    { name: 'Health Insurance', goal_type: 'spending' },
                ]
            },
            {
                name: 'Transport', ratio: 0.15, categories: [
                    { name: 'Business Travel & Fuel', goal_type: 'spending' },
                    { name: 'Personal Transport', goal_type: 'spending' },
                    { name: 'Vehicle Maintenance Fund', goal_type: 'savings' },
                ]
            },
            {
                name: 'Going Out & Lifestyle', ratio: 0.10, categories: [
                    { name: 'Dining Out', goal_type: 'spending' },
                    { name: 'Entertainment & Hobbies', goal_type: 'spending' },
                    { name: 'Personal Shopping', goal_type: 'spending' },
                ]
            },
            {
                name: 'Savings & Wealth', ratio: 0.20, categories: [
                    { name: 'Income Buffer (Next Month)', goal_type: 'savings' },
                    { name: 'Emergency Fund (3-6 Mos)', goal_type: 'emergency_fund' },
                    { name: 'Private Pension / SIPP', goal_type: 'savings' },
                    { name: 'Holiday & Sick Pay Fund', goal_type: 'savings' },
                ]
            },
        ],
    },
];

function uid() {
    return Math.random().toString(36).slice(2);
}

const GOAL_TYPE_OPTIONS = [
    { value: 'spending', label: 'Spending' },
    { value: 'emergency_fund', label: 'Emergency' },
    { value: 'savings', label: 'Savings' },
];

const GOAL_TYPE_DESCRIPTIONS: Record<string, string> = {
    spender: 'Fill to goal and spend throughout the month (e.g. Groceries, Rent).',
    emergency_fund: 'Save to a target and keep it there.',
    savings: 'Save a fixed amount each month.',
};

// ─── Onboarding Wizard ───────────────────────────────────────────────────────

function OnboardingWizard({ onClose, onImportCSV }: { onClose: (reason?: string) => void; onImportCSV?: () => void }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;

    // Step 1 & 2 state
    const [wizardGroups, setWizardGroups] = useState<WizardGroup[]>([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch transactions for historical insights
    const { data: transactions = [] } = useTransactions();

    const historicalStats = useMemo(() => {
        const incomeMonths = new Set<string>();
        const spendMonths = new Set<string>();
        let totalIncome = 0;
        let totalSpend = 0;

        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;

            if (t.type === 'income') {
                incomeMonths.add(key);
                totalIncome += t.amount;
            } else if (t.type === 'payment') {
                spendMonths.add(key);
                totalSpend += t.amount; // assuming payment is positive amount in DB
            }
        });

        const avgIncome = totalIncome / Math.max(1, incomeMonths.size);
        const avgSpend = totalSpend / Math.max(1, spendMonths.size);

        return { avgIncome, avgSpend, hasData: transactions.length > 0 };
    }, [transactions]);

    // New: Monthly income for auto-distribution
    const [monthlyIncome, setMonthlyIncome] = useState<string>('');
    const [incomeLocked, setIncomeLocked] = useState(false);

    const applyTemplate = (tpl: Template) => {
        const groups: WizardGroup[] = tpl.groups.map(g => ({
            id: uid(),
            name: g.name,
            categories: g.categories.map(c => ({ id: uid(), name: c.name, goal: '', goal_type: c.goal_type })),
            ratio: g.ratio
        }));
        setWizardGroups(groups);
        setStep(2);
    };

    const distributeIncome = (incomeStr: string) => {
        const income = parseFloat(incomeStr);
        if (isNaN(income) || income <= 0) return;

        setWizardGroups(prev => prev.map(group => {
            // If group has a ratio, calculate its share
            if (group.ratio && group.categories.length > 0) {
                const groupTotal = income * group.ratio;
                const perCategory = (groupTotal / group.categories.length).toFixed(2);

                return {
                    ...group,
                    categories: group.categories.map(cat => ({ ...cat, goal: perCategory }))
                };
            }
            return group;
        }));
    };

    const handleIncomeChange = (val: string) => {
        setMonthlyIncome(val);
        // Removed auto-distribution on every keystroke
    };

    const handleAutofill = () => {
        distributeIncome(monthlyIncome);
        setIncomeLocked(true);
    };

    const handleEditIncome = () => {
        setIncomeLocked(false);
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
            g.id === gid ? { ...g, categories: [...g.categories, { id: uid(), name: '', goal: '', goal_type: 'spending' as GoalType }] } : g
        ));

    const updateCategory = (gid: string, cid: string, field: 'name' | 'goal' | 'goal_type', value: string) =>
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
                            goal_type: c.goal_type || 'spending',
                            timeframe: { type: 'monthly' as const },
                        })));
                    if (catErr) throw catErr;
                }
            }
            // Invalidate so budget page sees new categories immediately
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['categories'] }),
                queryClient.invalidateQueries({ queryKey: ['groups'] }),
            ]);
            setStep(3); // CSV import prompt
        } catch (err) {
            console.error(err);
            toast.error('Failed to save budget. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

    return (
        <div className="flex flex-col h-full overflow-y-scroll">
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
                                {step === 1 && 'Choose a Template'}
                                {step === 2 && 'Customise Your Budget'}
                                {step === 3 && 'Import Transactions'}
                            </p>
                        </div>
                    </div>
                    {step < 3 && (
                        <button
                            onClick={() => onClose('skip')}
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

                {/* ── Step 1: Template picker ── */}
                {step === 1 && (
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
                            onClick={() => setStep(2)}
                            className="w-full py-3 border border-white/20 hover:bg-white/[.05] text-white/80 hover:text-white rounded-xl transition-all text-sm font-medium"
                        >
                            Start from Scratch
                        </button>
                    </div>
                )}

                {/* ── Step 2: Customise groups & categories ── */}
                {step === 2 && (
                    <div className="p-6 space-y-5 pb-32">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Customise Your Budget</h2>
                            <p className="text-white/60 text-sm">
                                Groups are like envelopes. Categories are the specific jobs inside each envelope.
                                Set optional monthly goals for each category.
                            </p>
                        </div>

                        {/* Monthly Income Input for Auto-Distribution */}
                        {/* Monthly Income Input for Auto-Distribution */}
                        <div className="bg-white/[.03] border border-white/[.08] rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium text-white/90">
                                    Est. Monthly Income / Expenses
                                </label>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="flex-1 relative">
                                    <MoneyInput
                                        value={monthlyIncome}
                                        onChange={handleIncomeChange}
                                        placeholder="0.00"
                                        currencySymbol={true}
                                        disabled={incomeLocked}
                                        className={`bg-black/20 border-white/[.15] focus:border-green ${incomeLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <button
                                    onClick={incomeLocked ? handleEditIncome : handleAutofill}
                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${incomeLocked
                                        ? 'border-white/20 text-white/70 hover:bg-white/[.05] hover:text-white'
                                        : 'border-green/20 bg-green/10 text-green hover:bg-green/20'
                                        }`}
                                >
                                    {incomeLocked ? 'Edit' : 'Autofill'}
                                </button>
                            </div>
                            <p className="text-xs text-white/40 mt-2">
                                {incomeLocked
                                    ? 'Income locked. Categories have been auto-filled.'
                                    : 'Enter your total income and click Autofill to distribute it across groups.'}
                            </p>
                        </div>

                        {/* Historical Insights */}
                        {historicalStats.hasData && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/[.03] border border-white/[.08] rounded-xl p-3">
                                    <p className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Avg. Monthly Income</p>
                                    <p className="text-sm font-bold text-green">£{historicalStats.avgIncome.toFixed(2)}</p>
                                </div>
                                <div className="bg-white/[.03] border border-white/[.08] rounded-xl p-3">
                                    <p className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Avg. Monthly Spend</p>
                                    <p className="text-sm font-bold text-white">£{historicalStats.avgSpend.toFixed(2)}</p>
                                </div>
                            </div>
                        )}

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
                                            <div key={cat.id} className="flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green/40 flex-shrink-0 mt-2.5" />
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={cat.name}
                                                            onChange={e => updateCategory(group.id, cat.id, 'name', e.target.value)}
                                                            placeholder="Category name"
                                                            className="flex-1 text-sm bg-white/[.04] border border-white/[.08] focus:border-green/40 rounded-lg px-2 py-1.5 focus:outline-none transition-colors placeholder-white/30"
                                                        />
                                                        <div className="w-20 flex-shrink-0">
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
                                                    <div className="flex gap-1 flex-wrap">
                                                        {GOAL_TYPE_OPTIONS.map(opt => (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => updateCategory(group.id, cat.id, 'goal_type', opt.value)}
                                                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${cat.goal_type === opt.value
                                                                    ? 'bg-green/20 border-green/40 text-green'
                                                                    : 'border-white/[.1] text-white/40 hover:text-white/70 hover:border-white/30'
                                                                    }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
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
                                onClick={() => setStep(1)}
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
                                onClick={() => setStep(3)}
                                className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                                Skip for now (add categories later)
                            </button>
                        )}
                    </div>
                )}

                {/* ── Step 3: CSV import prompt ── */}
                {step === 3 && (
                    <div className="p-6 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-green/10 border border-green/30 rounded-2xl flex items-center justify-center mt-4">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-green">
                                <path d="M12 15V3M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M3 17v1a3 3 0 003 3h12a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Import past transactions?</h2>
                            <p className="text-white/60 text-sm max-w-xs mx-auto leading-relaxed">
                                Most banks let you download your transaction history as a CSV file.
                            </p>
                        </div>

                        <div className="w-full bg-white/[.04] border border-white/[.1] rounded-xl p-4 text-left space-y-3">
                            <p className="text-xs text-white/50 uppercase tracking-wide font-medium">Why it's a great first move</p>
                            <div className="space-y-2 text-sm text-white/70">
                                <div className="flex items-start gap-2">
                                    <span className="text-green mt-0.5">✓</span>
                                    <span>See where your money actually goes, right away</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green mt-0.5">✓</span>
                                    <span>Helps you set realistic category goals based on real spending</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green mt-0.5">✓</span>
                                    <span>Takes about 2 minutes — and it's totally worth it</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full space-y-3">
                            <button
                                onClick={() => { onClose('import_csv'); onImportCSV?.(); }}
                                className="w-full py-3 bg-green hover:bg-green-dark text-black font-bold rounded-xl transition-colors"
                            >
                                Yes, import my bank CSV
                            </button>
                            <button
                                onClick={() => onClose('skip_import')}
                                className="w-full py-3 border border-white/20 hover:bg-white/[.05] text-white/70 hover:text-white rounded-xl transition-all text-sm font-medium"
                            >
                                Skip for now
                            </button>
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
    const [categories, setCategories] = useState<CategoryWithGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideBudgetValues, setHideBudgetValues] = useState(false);

    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editingCategory, setEditingCategory] = useState<CategoryWithGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [editingGoalAsString, setEditingGoalAsString] = useState('');
    const [showAddCategoryForGroup, setShowAddCategoryForGroup] = useState<string | null>(null);
    const [newGroupCategoryData, setNewGroupCategoryData] = useState({
        name: '',
        goal: '',
        goal_type: 'spending' as GoalType,
        timeframe: 'monthly' as const,
    });

    // Fetch transactions for stats comparison
    const { data: transactions = [], isLoading: loadingTransactions } = useTransactions();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHideBudgetValues(localStorage.getItem('hideBudgetValues') === 'true');
        }
    }, []);

    const handleEditCategory = (category: CategoryWithGroup) => {
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
        setCategories((data as unknown as CategoryWithGroup[]) || []);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchGroups(), fetchCategories()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => { setError(''); }, [activeTab]);

    const stats = useMemo(() => {
        // Only count 'spending' categories for goals vs spend comparison
        const spenderCategories = categories.filter(cat => (cat.goal_type || 'spending') === 'spending');
        const totalGoals = spenderCategories.reduce((sum, cat) => sum + (cat.goal || 0), 0);

        const incomeMonths = new Set();
        let totalIncome = 0;

        // 1. Collect all transaction months for payments
        const paymentMonths = new Set<string>();
        transactions.forEach(t => {
            if (t.type === 'payment') {
                const date = new Date(t.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                paymentMonths.add(key);
            }
        });

        // 2. Sort months and take the last 3
        const sortedMonths = Array.from(paymentMonths).sort();
        const last3Months = new Set(sortedMonths.slice(-4, -1));

        // 3. Calculate spend based on last 3 months
        let totalSpendLast3Months = 0;
        // Category specific stats (last 3 months)
        const categoryStats = new Map<string, number>();

        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (t.type === 'payment') {
                // Only include if in last 3 months
                if (last3Months.has(key)) {

                    totalSpendLast3Months += t.amount;
                    categoryStats.set(t.category_id, (categoryStats.get(t.category_id) || 0) + t.amount);

                }
            } else if (t.type === 'income') {
                // Income uses all history as base (or could do 3 months too, usually cleaner to use all for income avg)
                incomeMonths.add(key);
                totalIncome += t.amount;
            }
        });

        const numMonthsForSpend = Math.max(1, last3Months.size);
        const numIncomeMonths = Math.max(1, incomeMonths.size);

        const avgMonthlySpend = -(totalSpendLast3Months / numMonthsForSpend);
        const avgMonthlyIncome = totalIncome / numIncomeMonths;

        // Calculate avg per category
        const categoryAverages = new Map<string, number>();
        categoryStats.forEach((amount, catId) => {
            categoryAverages.set(catId, -(amount / numMonthsForSpend)); // Convert to positive for display
        });

        return {
            totalGoals,
            avgMonthlySpend,
            avgMonthlyIncome,
            numMonths: numMonthsForSpend,
            categoryAverages
        };
    }, [categories, transactions]);


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
                    goal_type: data.goal_type || 'spending',
                    timeframe: { type: 'monthly' as const },
                });
                if (error) throw error;
            })(),
            { loading: 'Creating category…', success: 'Category created!', error: 'Failed to create category' }
        );
        await fetchCategories();
        setNewGroupCategoryData({ name: '', goal: '', goal_type: 'spending', timeframe: 'monthly' });
        setShowAddCategoryForGroup(null);
    };

    const updateCategory = async (id: string, data: CategoryUpdate) => {
        await toast.promise(
            (async () => {
                const { error } = await supabase.from('categories').update(data).eq('id', id);
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
        <div className="flex flex-col h-full overflow-y-scroll">
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
                        {/* 
                        Todo, only count 'frequent spender' categories when  showing if each category in Category.tsx is over or under */}
                        {/* Budget vs Expenses Summary for Categories Tab */}
                        {activeTab === 'categories' && !loadingTransactions && (
                            <div className="flex sm:flex-row flex-col gap-2 mb-6">

                                <div className="bg-white/[.04] p-2 rounded-xl border border-white/[.08]">
                                    <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Avg. Monthly Income</p>
                                    <p className="text-xl font-bold text-white">£{stats.avgMonthlyIncome.toFixed(2)}</p>
                                </div>
                                <div className="bg-white/[.04] p-2 rounded-xl border border-white/[.08]">
                                    <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Current Monthly Goals</p>
                                    <p className="text-xl font-bold text-green">£{stats.totalGoals.toFixed(2)}</p>
                                </div>

                                <div className="bg-white/[.04] p-2 rounded-xl border border-white/[.08]">
                                    <p className="text-white/50 text-xs uppercase tracking-wide mb-1">3-Month Avg. Spend</p>
                                    <p className="text-xl font-bold text-reddy">£{stats.avgMonthlySpend.toFixed(2)}</p>
                                    {/* Over/Under spending indicator */}
                                    <p className={`text-xs mt-1 font-medium ${stats.avgMonthlySpend > stats.totalGoals ? 'text-reddy' : 'text-green'}`}>
                                        {stats.avgMonthlySpend > stats.totalGoals
                                            ? `£${(stats.avgMonthlySpend - stats.totalGoals).toFixed(0)} over goals`
                                            : `£${(stats.totalGoals - stats.avgMonthlySpend).toFixed(0)} under goals`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

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
                                                            <div className="flex-1">
                                                                <div className="flex items-baseline gap-3">
                                                                    <h4 className="font-medium text-lg text-green">{group.name}</h4>
                                                                    {(() => {
                                                                        const spenderCats = groupCategories.filter(c => (c.goal_type || 'spending') === 'spending');
                                                                        const groupGoal = spenderCats.reduce((sum, c) => sum + (c.goal || 0), 0);
                                                                        const groupAvgSpend = spenderCats.reduce((sum, c) => sum + (stats.categoryAverages.get(c.id) || 0), 0);

                                                                        if (groupGoal > 0) {
                                                                            const diff = groupAvgSpend - groupGoal;
                                                                            // Tolerance of 1 to avoid rounding noise
                                                                            if (Math.abs(diff) > 1) {
                                                                                const isOver = diff > 0;
                                                                                return (
                                                                                    <span className={`text-xs font-medium ${isOver ? 'text-reddy' : 'text-green'}`}>
                                                                                        £{Math.abs(diff).toFixed(0)} {isOver ? 'over/mo' : 'under/mo'}
                                                                                    </span>
                                                                                );
                                                                            }
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
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
                                                                    <div>
                                                                        <label className="block text-sm text-white/50 mb-1">Goal Type</label>
                                                                        <Dropdown
                                                                            value={newGroupCategoryData.goal_type}
                                                                            onChange={v => setNewGroupCategoryData({ ...newGroupCategoryData, goal_type: v as GoalType })}
                                                                            options={GOAL_TYPE_OPTIONS}
                                                                        />
                                                                        <p className="text-xs text-white/40 mt-1">{GOAL_TYPE_DESCRIPTIONS[newGroupCategoryData.goal_type]}</p>
                                                                    </div>
                                                                    <div className="flex justify-end gap-2">
                                                                        <button type="button" onClick={() => { setShowAddCategoryForGroup(null); setNewGroupCategoryData({ name: '', goal: '', goal_type: 'spending', timeframe: 'monthly' }); }} className="px-3 py-1 rounded-lg hover:bg-white/[.05] text-sm text-white/70">Cancel</button>
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
                                                                            goal_type: editingCategory.goal_type || 'spending',
                                                                        });
                                                                    }} className="space-y-3">
                                                                        <div className="flex gap-4">
                                                                            <div className="flex-1">
                                                                                <input
                                                                                    type="text"
                                                                                    value={editingCategory.name}
                                                                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                                                    className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
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
                                                                        <div>
                                                                            <label className="block text-sm text-white/50 mb-1">Goal Type</label>
                                                                            <Dropdown
                                                                                value={editingCategory.goal_type || 'spending'}
                                                                                onChange={v => setEditingCategory({ ...editingCategory, goal_type: v as GoalType })}
                                                                                options={GOAL_TYPE_OPTIONS}
                                                                            />
                                                                            <p className="text-xs text-white/40 mt-1">{GOAL_TYPE_DESCRIPTIONS[editingCategory.goal_type || 'spending']}</p>
                                                                        </div>
                                                                        <div className="flex justify-end gap-2">
                                                                            <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-1 rounded-lg hover:bg-white/[.05] text-sm">Cancel</button>
                                                                            <button type="submit" disabled={!editingCategory.name.trim() || !editingCategory.group} className="px-3 py-1 rounded-lg bg-green/20 hover:bg-green/30 text-green text-sm disabled:opacity-50">Save Changes</button>
                                                                        </div>
                                                                    </form>
                                                                ) : (
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <div className="flex items-baseline gap-2">
                                                                                <span className="block font-medium">{category.name}</span>

                                                                                {(category.goal_type || 'spending') === 'spending' && (() => {
                                                                                    const goal = category.goal || 0;
                                                                                    const avg = stats.categoryAverages.get(category.id) || 0;
                                                                                    if (goal > 0) {
                                                                                        const diff = avg - goal;
                                                                                        if (Math.abs(diff) > 1) {
                                                                                            const isOver = diff > 0;
                                                                                            return (
                                                                                                <span className={`text-[10px] uppercase tracking-wide font-bold ${isOver ? 'text-reddy' : 'text-green'}`}>
                                                                                                    {isOver ? 'Over' : 'Under'}
                                                                                                </span>
                                                                                            );
                                                                                        }
                                                                                    }
                                                                                    return null;
                                                                                })()}
                                                                            </div>
                                                                            <div className="flex gap-3 text-sm text-white/50">
                                                                                <span>Goal: £{category.goal || 0}</span>
                                                                                <span>Avg: £{(stats.categoryAverages.get(category.id) || 0).toFixed(0)}</span>
                                                                            </div>
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

import { useSyncAll } from '@/app/hooks/useSyncAll';



export default function ManageBudgetModal({ isOpen, onClose, isOnboarding = false, onImportCSV }: ManageBudgetModalProps) {
    const [isClosing, setIsClosing] = useState(false);
    const { syncAll } = useSyncAll();

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
        syncAll();
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
            className={`fixed inset-0 bg-black md:bg-black/60 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center font-[family-name:var(--font-suse)] overflow-hidden ${isClosing ? 'animate-[fadeOut_0.2s_ease-out_forwards]' : 'animate-[fadeIn_0.2s_ease-out]'}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`relative bg-black md:bg-black/[.95] md:rounded-lg md:border-b-4 w-full md:max-w-xl h-screen md:h-auto md:max-h-[90vh] flex flex-col ${isClosing ? 'animate-[slideOut_0.2s_ease-out_forwards]' : 'animate-[slideIn_0.2s_ease-out]'}`}
            >
                {isOnboarding ? (
                    <OnboardingWizard onClose={handleClose} onImportCSV={onImportCSV} />
                ) : (
                    <EditMode onClose={handleClose} />
                )}
            </div>
        </div>
    );
}
