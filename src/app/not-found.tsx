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
        </div>
      </div>
    </div>
  )
}