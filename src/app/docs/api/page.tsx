import Link from "next/link";

export default function ApiDocs() {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <Link href="/docs" className="text-sm text-white/50 hover:text-white transition-colors">
                    &larr; Back to Docs
                </Link>
                <h1 className="text-4xl font-bold mt-4 mb-2">Public REST API</h1>
                <p className="text-xl text-white/70">
                    Programmatically access your CashCat data using secure API keys.
                </p>
            </div>

            <div className="space-y-12">
                {/* Authentication Section */}
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-green">Authentication</h2>
                    <div className="prose prose-invert max-w-none text-white/80">
                        <p className="mb-4">
                            CashCat uses <strong>Bearer Token</strong> authentication. You must include your API Key in the <code>Authorization</code> header of every request.
                        </p>
                        <div className="bg-black/30 p-4 rounded-lg border border-white/10 font-mono text-sm overflow-x-auto">
                            Authorization: Bearer cc_live_YOUR_API_KEY
                        </div>
                        <div className="mt-4 bg-yellow-500/10 border-l-4 border-yellow-500 p-4">
                            <p className="text-sm text-yellow-200">
                                <strong>Security Warning:</strong> Your API Key grants full access to your financial data.
                                Never share it or commit it to public repositories.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Endpoints Section */}
                <section>
                    <h2 className="text-2xl font-semibold mb-6 text-green">Endpoints</h2>

                    {/* GET Transactions */}
                    <div className="mb-10">
                        <h3 className="text-xl font-medium mb-2 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/transactions</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Retrieve a list of your most recent transactions.
                        </p>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Query Parameters</h4>
                        <div className="overflow-x-auto mb-6">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-white/60">
                                        <th className="py-2 px-4">Param</th>
                                        <th className="py-2 px-4">Type</th>
                                        <th className="py-2 px-4">Default</th>
                                        <th className="py-2 px-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">limit</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4">100</td>
                                        <td className="py-2 px-4 text-white/60">Number of records to return.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">offset</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4">0</td>
                                        <td className="py-2 px-4 text-white/60">Number of records to skip.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": [
    {
      "id": "uuid-string",
      "amount": -42.50,
      "description": "Grocery Store",
      "date": "2024-02-03",
      "category_id": "uuid-string",
      "account_id": "uuid-string"
    }
  ]
}`}
                        </pre>
                    </div>


                    {/* GET Assignments */}
                    <div className="mb-10">
                        <h3 className="text-xl font-medium mb-2 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/assignments</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Fetch budget assignments.
                        </p>
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Query Parameters</h4>
                        <div className="overflow-x-auto mb-6">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-white/60">
                                        <th className="py-2 px-4">Param</th>
                                        <th className="py-2 px-4">Type</th>
                                        <th className="py-2 px-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">month</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Format <code>YYYY-MM</code>. Filters assignments by month.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  "http://localhost:3000/api/v1/assignments?month=2024-02"`}
                        </pre>
                    </div>

                    {/* GET Accounts */}
                    <div className="mb-10">
                        <h3 className="text-xl font-medium mb-2 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/accounts</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            List all bank and cash accounts.
                        </p>
                    </div>

                    {/* GET Categories */}
                    <div className="mb-10">
                        <h3 className="text-xl font-medium mb-2 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/categories</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            List all budget categories.
                        </p>
                    </div>

                    {/* GET Groups */}
                    <div className="mb-10">
                        <h3 className="text-xl font-medium mb-2 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/groups</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            List all category groups.
                        </p>
                    </div>

                    {/* POST Transactions */}
                    <div>
                        <h3 className="text-xl font-medium mb-2 flex items-center gap-3">
                            <span className="bg-green/20 text-green px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">POST</span>
                            <code>/api/v1/transactions</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Create a new transaction. Useful for importing data from other tools.
                        </p>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Request Body (JSON)</h4>
                        <div className="overflow-x-auto mb-6">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-white/60">
                                        <th className="py-2 px-4">Field</th>
                                        <th className="py-2 px-4">Type</th>
                                        <th className="py-2 px-4">Required</th>
                                        <th className="py-2 px-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">amount</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">Value of transaction. Expenses are negative.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">date</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">Format: YYYY-MM-DD</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">description</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">Any details you want.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">category_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">UUID of the category.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">vendor</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">Name of the vendor.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">account_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-white/50">No</td>
                                        <td className="py-2 px-4 text-white/60">UUID of the account (will default to your default account).</td>
                                    </tr>

                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">type</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4 text-white/50">No</td>
                                        <td className="py-2 px-4 text-white/60">'income' or 'payment'. Defaults to 'payment'.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example cURL</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`curl -X POST https://cashcat.app/api/v1/transactions \\
  -H "Authorization: Bearer cc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": -25.50,
    "description": "API Test Purchase",
    "vendor": "Online Store",
    "date": "2026-02-02",
    "account_id": "c8070e66-7e5c-4048-b008-d0751d9a2775",
    "category_id": "2fb65eee-ab32-4299-b6d4-5ed61f829204"
  }'`}
                        </pre>
                    </div>
                </section>

                {/* Getting Keys */}
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-green">How to Get Keys</h2>
                    <ol className="list-decimal list-inside space-y-2 text-white/80">
                        <li>Go to <Link href="/account" className="text-green hover:underline">Account Settings</Link>.</li>
                        <li>Scroll down to the <strong>API Keys</strong> section.</li>
                        <li>Click <strong>Create New Key</strong> and give it a name (e.g., "Python Script").</li>
                        <li>Copy the key immediately. We only show it once!</li>
                    </ol>
                </section>
            </div>
        </div>
    );
}
