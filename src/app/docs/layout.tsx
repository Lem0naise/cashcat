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
			{/* Header */}
			<header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950">
				<div className="container min-w-screen px-4 md:pl-4 md:pr-20 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
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

							<Link href="/" className="hidden md:flex">
								<div className="scale-75">
									<Logo />
								</div>
                
							</Link><span className="hidden md:block scale-75 text-7xl"><strong>Docs</strong></span>
						</div>
						<div className="flex items-center gap-4">
							<Link
								href="/budget"
								className="px-4 py-2 bg-green text-black font-medium rounded-lg hover:bg-green-dark transition-all"
							>
								Open CashCat
							</Link>
						</div>
					</div>
				</div>
			</header>

			{/* Mobile sidebar backdrop */}
			{isMobileMenuOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* Mobile sidebar */}
			<div
				className={`fixed top-0 left-0 min-h-full w-80 bg-background border-r border-white/10 z-50 transform transition-transform duration-300 lg:hidden ${
					isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
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
												className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
													pathname === item.href
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
							href="mailto:lemonaise.dev@gmail.com"
							className="text-sm text-green hover:text-green-dark underline"
						>
							Contact Support
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
														className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
															pathname === item.href
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
									href="/about"
									className="text-sm text-green hover:text-green-dark underline"
								>
									Contact Support
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