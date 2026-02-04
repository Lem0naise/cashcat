'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTransactions, TransactionWithDetails } from '@/app/hooks/useTransactions';
import { useCategories } from '@/app/hooks/useCategories';
import { useAssignments } from '@/app/hooks/useAssignments';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Get cached data from TanStack Query
    const { data: transactions } = useTransactions();
    const { data: categories } = useCategories();
    const { data: assignments } = useAssignments();

    // Prepare cached data to send with requests
    const getCachedData = useCallback(() => {
        // Only include essential fields to reduce payload size
        const cachedTransactions = transactions?.map((t: TransactionWithDetails) => ({
            id: t.id,
            amount: t.amount,
            date: t.date,
            vendor: t.vendor,
            description: t.description,
            type: t.type,
            category_id: t.category_id,
            category_name: t.categories?.name || null,
            group_id: t.categories?.group || null,
        })) || [];

        const cachedCategories = categories?.map((c) => ({
            id: c.id,
            name: c.name,
            group_id: c.group,
            group_name: c.groups?.name || null,
        })) || [];

        const cachedAssignments = assignments?.map((a) => ({
            id: a.id,
            category_id: a.category_id,
            month: a.month,
            assigned: a.assigned,
            rollover: a.rollover,
        })) || [];

        return {
            transactions: cachedTransactions,
            categories: cachedCategories,
            assignments: cachedAssignments,
        };
    }, [transactions, categories, assignments]);

    const { messages, sendMessage, status, error } = useChat({
        onFinish: (event) => {
            // Check if any tool was called that modifies data
            // The event.message contains the assistant message
            const msg = event.message;
            const hasAddTransaction = msg?.parts?.some(
                (part: { type: string; toolInvocation?: { toolName: string; state: string } }) =>
                    part.type === 'tool-invocation' &&
                    part.toolInvocation?.toolName === 'add_transaction' &&
                    part.toolInvocation?.state === 'result'
            );
            if (hasAddTransaction) {
                // Invalidate transactions query to refresh the UI
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
            }
        },
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        // Pass cached data with the message request
        sendMessage({ text: input }, { body: { cachedData: getCachedData() } });
        setInput('');
    };

    const formatToolResult = (part: any) => {
        if (part.type !== 'tool-invocation') return null;

        const toolInvocation = part.toolInvocation;
        if (!toolInvocation) return null;

        if (toolInvocation.state !== 'result') {
            return (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-green rounded-full animate-spin" />
                    <span>Fetching data...</span>
                </div>
            );
        }

        const { toolName, result } = toolInvocation;

        if (result?.error) {
            return (
                <div className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
                    ⚠️ {result.error}
                </div>
            );
        }

        switch (toolName) {
            case 'get_transactions':
                return (
                    <div className="text-sm bg-white/5 p-3 rounded-lg">
                        <div className="text-white/60 mb-2">📊 Found {result?.count || 0} transactions</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {result?.transactions?.slice(0, 5).map((tx: any) => (
                                <div key={tx.id} className="flex justify-between text-white/80">
                                    <span>{tx.vendor}</span>
                                    <span className={tx.type === 'income' ? 'text-green' : ''}>
                                        {tx.type === 'income' ? '+' : '-'}${tx.amount?.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            {(result?.count || 0) > 5 && (
                                <div className="text-white/40 text-xs">...and {result.count - 5} more</div>
                            )}
                        </div>
                    </div>
                );

            case 'search_transactions':
                return (
                    <div className="text-sm bg-white/5 p-3 rounded-lg">
                        <div className="text-white/60 mb-2">🔍 Search results: {result?.count || 0} matches</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {result?.transactions?.slice(0, 5).map((tx: any) => (
                                <div key={tx.id} className="flex flex-col text-white/80 py-1 border-b border-white/5 last:border-0">
                                    <div className="flex justify-between">
                                        <span className="font-medium">{tx.vendor}</span>
                                        <span className={tx.type === 'income' ? 'text-green' : ''}>
                                            {tx.type === 'income' ? '+' : '-'}${tx.amount?.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-white/50">
                                        <span>{tx.category}</span>
                                        <span>{tx.date}</span>
                                    </div>
                                </div>
                            ))}
                            {(result?.count || 0) > 5 && (
                                <div className="text-white/40 text-xs pt-1">...and {result.count - 5} more</div>
                            )}
                        </div>
                    </div>
                );

            case 'add_transaction':
                return (
                    <div className="text-sm bg-green/10 p-3 rounded-lg border border-green/20">
                        <div className="text-green flex items-center gap-2">
                            <span>✅</span>
                            <span>{result?.message}</span>
                        </div>
                    </div>
                );

            case 'summarize_budget':
                return (
                    <div className="text-sm bg-white/5 p-3 rounded-lg">
                        <div className="text-white/60 mb-2">📈 Budget Summary for {result?.month}</div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                                <div className="text-white/40 text-xs">Assigned</div>
                                <div className="text-white">£{result?.summary?.totalAssigned?.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-white/40 text-xs">Spent</div>
                                <div className="text-white">£{result?.summary?.totalSpent?.toFixed(2)}</div>
                            </div>
                            {result?.summary?.totalRollover !== undefined && result.summary.totalRollover !== 0 && (
                                <div>
                                    <div className="text-white/40 text-xs">Rollover</div>
                                    <div className={result.summary.totalRollover >= 0 ? 'text-green' : 'text-orange-400'}>
                                        £{result.summary.totalRollover?.toFixed(2)}
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="text-white/40 text-xs">Available</div>
                                <div className={result?.summary?.totalAvailable >= 0 ? 'text-green' : 'text-red-400'}>
                                    £{result?.summary?.totalAvailable?.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        {result?.alerts?.length > 0 && (
                            <div className="text-orange-400 text-xs mt-2">
                                ⚠️ {result.alerts.join(', ')}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green hover:bg-green/90 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                aria-label="Toggle chat"
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>

            {/* Chat Panel */}
            <div
                className={`fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] bg-background/95 backdrop-blur-sm border border-white/[.15] rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/[.15]">
                    <div className="w-10 h-10 rounded-full bg-green/20 flex items-center justify-center">
                        <span className="text-xl">🐱</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">CashCat Assistant</h3>
                        <p className="text-xs text-white/50">Your personal finance helper</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="h-80 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-white/40 py-8">
                            <p className="text-sm">👋 Hi! I&apos;m CashCat.</p>
                            <p className="text-xs mt-2">Ask me about your transactions, budget, or add new spending!</p>
                            <div className="mt-4 space-y-2">
                                <button
                                    onClick={() => setInput('Show my last 5 transactions')}
                                    className="text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                                >
                                    Show my last 5 transactions
                                </button>
                                <br />
                                <button
                                    onClick={() => setInput('How is my budget this month?')}
                                    className="text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                                >
                                    How is my budget this month?
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2 ${message.role === 'user'
                                    ? 'bg-green text-black rounded-br-md'
                                    : 'bg-white/10 text-white rounded-bl-md'
                                    }`}
                            >
                                {/* Message parts */}
                                {message.parts?.map((part, i) => {
                                    switch (part.type) {
                                        case 'text':
                                            return (
                                                <div
                                                    key={`${message.id}-${i}`}
                                                    className="prose prose-invert prose-sm max-w-none break-words prose-p:leading-relaxed prose-pre:bg-white/10 prose-pre:p-2 prose-pre:rounded-lg"
                                                >
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            // Override specific elements if needed
                                                            a: ({ href, children }) => (
                                                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
                                                                    {children}
                                                                </a>
                                                            ),
                                                            table: ({ children }) => (
                                                                <div className="overflow-x-auto my-2">
                                                                    <table className="min-w-full text-left text-xs bg-white/5 rounded-lg overflow-hidden">
                                                                        {children}
                                                                    </table>
                                                                </div>
                                                            ),
                                                            thead: ({ children }) => <thead className="bg-white/10 font-medium">{children}</thead>,
                                                            th: ({ children }) => <th className="p-2 border-b border-white/10">{children}</th>,
                                                            td: ({ children }) => <td className="p-2 border-b border-white/5">{children}</td>,
                                                        }}
                                                    >
                                                        {part.text}
                                                    </ReactMarkdown>
                                                </div>
                                            );
                                        case 'tool-invocation':
                                            return (
                                                <div key={`${message.id}-${i}`} className="mb-2">
                                                    {formatToolResult(part)}
                                                </div>
                                            );
                                        default:
                                            return null;
                                    }
                                })}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg">
                            ⚠️ {error.message || 'Something went wrong. Please try again.'}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-white/[.15]">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about your finances..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-green/50 transition-colors"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-green hover:bg-green/90 disabled:bg-white/10 disabled:cursor-not-allowed text-background px-4 py-2 rounded-xl transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
