'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Logo from '../components/logo'

const docsSections = [
	{
		title: 'Getting Started',
		items: [
			{ name: 'Overview', href: '/docs' },
			{ name: 'Quick Start', href: '/docs/getting-started' },
			{ name: 'First Budget', href: '/docs/first-budget' },
		],
	},
	{
		title: 'Core Concepts',
		items: [
			{ name: 'Zero-Based Budgeting', href: '/docs/zero-based-budgeting' },
			{ name: 'Bank Accounts', href: '/docs/bank-accounts' },
			{ name: 'Categories & Groups', href: '/docs/categories-groups' },
			{ name: 'Transactions', href: '/docs/transactions' },
		],
	},
	{
		title: 'Features',
		items: [
			{ name: 'Budget Management', href: '/docs/budget-management' },
			{ name: 'Statistics & Reports', href: '/docs/statistics' },
			{ name: 'Account Settings', href: '/docs/account-settings' },
		],
	},
	{
		title: 'Tips & Tricks',
		items: [
			{ name: 'Best Practices', href: '/docs/best-practices' },
			{ name: 'Common Questions', href: '/docs/common-questions' },
			{ name: 'Troubleshooting', href: '/docs/troubleshooting' },
			{ name: 'API Access and Automation', href: '/docs/api' },

		],
	},
]

export default function DocsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const pathname = usePathname()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	return (
		<div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
			{/* Navbar */}
			<nav className="z-50 px-6 py-4 glass-card-blue border-b border-white/5 rounded-none bg-black/20 backdrop-blur-md">
				<div className="max-w-7xl mx-auto flex items-center justify-between">
					{/* Mobile menu button */}
					<button
						onClick={() => setIsMobileMenuOpen(true)}
						className="md:hidden p-2 text-white/70 hover:text-white"
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
						>
							<path
								d="M3 12H21M3 6H21M3 18H21"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</button>
					<div className="w-32 pl-8 hidden sm:block">
						<Logo />
					</div>
					<div className="flex items-center gap-4">
						<Link
							href="/login"
							className="text-white/80 hover:text-white font-medium transition-colors hidden sm:block"
						>
							Log In
						</Link>
						<Link
							href="/signup"
							className="bg-green text-black px-4 py-2 rounded-lg font-bold hover:bg-green-dark transition-all text-sm"
						>
							Get Started
						</Link>
					</div>
				</div>
			</nav>



			{/* Mobile sidebar backdrop */}
			{isMobileMenuOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* Mobile sidebar */}
			<div
				className={`fixed top-0 left-0 min-h-full w-80 bg-background border-r border-white/10 z-50 transform transition-transform duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
					}`}
			>
				<div className="p-6 overflow-y-auto max-h-screen">
					<div className="flex items-right align-right mb-0">
						<button
							onClick={() => setIsMobileMenuOpen(false)}
							className="p-2 text-white/70 hover:text-white ml-auto"
						>
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
							>
								<path
									d="M18 6L6 18M6 6L18 18"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</svg>
						</button>
					</div>

					<nav className="space-y-6">
						{docsSections.map((section) => (
							<div key={section.title}>
								<h3 className="text-sm font-semibold text-green uppercase tracking-wide mb-3">
									{section.title}
								</h3>
								<ul className="space-y-2">
									{section.items.map((item) => (
										<li key={item.href}>
											<Link
												href={item.href}
												onClick={() => setIsMobileMenuOpen(false)}
												className={`block px-3 py-2 rounded-lg text-sm transition-colors ${pathname === item.href
													? 'bg-green/20 text-green font-medium'
													: 'text-white/70 hover:text-white hover:bg-white/[.05]'
													}`}
											>
												{item.name}
											</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>

					{/* Help section */}
					<div className="mt-8 p-4 glass-card-blue rounded-lg">
						<h4 className="font-semibold text-green mb-2">
							Need More Help?
						</h4>
						<p className="text-sm text-white/70 mb-3">
							Can't find what you're looking for?
						</p>


						<Link
							href="https://discord.gg/C9mYnEdAQA"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white font-medium rounded-lg hover:bg-[#4752C4] transition-all text-sm"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
							</svg>
							Ask in our Discord
						</Link>
						<Link
							href="mailto:lemonaise.dev@gmail.com"
							className="block mt-4 text-sm text-green hover:text-green-dark underline"
						>
							Or email support here
						</Link>

					</div>
				</div>
			</div>

			<div className="">
				<div className="flex gap-8">
					{/* Desktop Sidebar */}
					<aside className="pl-6 pr-4 py-8 w-64 flex-shrink-0 hidden md:block bg-[#131313]">
						<div className="sticky top-8">
							<nav className="space-y-6">
								{docsSections.map((section) => (
									<div key={section.title}>
										<h3 className="text-sm font-semibold text-green uppercase tracking-wide mb-3">
											{section.title}
										</h3>
										<ul className="space-y-2">
											{section.items.map((item) => (
												<li key={item.href}>
													<Link
														href={item.href}
														className={`block px-3 py-2 rounded-lg text-sm transition-colors ${pathname === item.href
															? 'bg-green/20 text-green font-medium'
															: 'text-white/70 hover:text-white hover:bg-white/[.05]'
															}`}
													>
														{item.name}
													</Link>
												</li>
											))}
										</ul>
									</div>
								))}
							</nav>

							{/* Help section */}
							<div className="mt-8 p-4 glass-card-blue rounded-lg">
								<h4 className="font-semibold text-green mb-2">
									Need More Help?
								</h4>
								<p className="text-sm text-white/70 mb-3">
									Can't find what you're looking for?
								</p>
								<Link
									href="https://discord.gg/C9mYnEdAQA"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white font-medium rounded-lg hover:bg-[#4752C4] transition-all text-sm"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
									</svg>
									Ask in our Discord
								</Link>
								<Link
									href="mailto:lemonaise.dev@gmail.com"
									className="block mt-4 text-sm text-green hover:text-green-dark underline"
								>
									Or email support here
								</Link>
							</div>
						</div>
					</aside>

					{/* Main content */}
					<main className="flex-1 min-w-0 py-8 px-3">
						<div className="">{children}</div>
					</main>
				</div>
			</div>
		</div>
	)
}