import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="min-h-screen bg-background font-[family-name:var(--font-suse)] flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-block w-full bg-green hover:bg-green-dark text-black font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Go Back Home
          </Link>
          
          <Link 
            href="/budget"
            className="inline-block w-full bg-white/[.05] hover:bg-white/[.1] text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 border border-white/[.15]"
          >
            Go to Budget
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm">
            Need help? <a href="mailto:lemonaise.dev@gmail.com" className="text-green hover:underline">Contact support at lemonaise.dev@gmail.com</a>
          </p>
          <div className="sm:mt-4 mt-8">
            <Link
                href="https://discord.gg/C9mYnEdAQA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white font-medium rounded-lg hover:bg-[#4752C4] transition-all text-sm"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Or even better, join our Discord Community
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}