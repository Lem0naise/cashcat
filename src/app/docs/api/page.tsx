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

                    {/* GET Accounts */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/accounts</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            List all bank and cash accounts associated with your user.
                        </p>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  https://cashcat.app/api/v1/accounts`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": [
    {
      "id": "c8070e66-7e5c-4048-b008-d0751d9a2775",
      "name": "Checking",
      "type": "checking",
      "balance": 1500.00,
      "is_default": true
    },
    {
      "id": "2fb65eee-ab32-4299-b6d4-5ed61f829204",
      "name": "Savings",
      "type": "savings",
      "balance": 5000.00
    }
  ]
}`}
                        </pre>
                    </div>

                    {/* GET Assignments */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/assignments</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Fetch budget assignments. Optionally filter by month.
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

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  "https://cashcat.app/api/v1/assignments?month=2024-02"`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": [
    {
      "id": "uuid-string",
      "category_id": "uuid-string",
      "month": "2024-02",
      "assigned": 100.00,
      "activity": -45.00,
      "available": 55.00
    }
  ]
}`}
                        </pre>
                    </div>

                    {/* GET Category Budget Left */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/categories/budget-left</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Returns the remaining budget in each category for a month, including rollover and spending.
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
                                        <td className="py-2 px-4 font-mono text-green">month</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">Current month</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Format <code>YYYY-MM</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">category_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4">All categories</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Return only one category.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">group_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4">All groups</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Return categories in one group.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">goal_type</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">All goal types</td>
                                        <td className="py-2 px-4 text-white/60">Optional. One of <code>spending</code>, <code>savings</code>, <code>emergency_fund</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">only_overspent</td>
                                        <td className="py-2 px-4">boolean</td>
                                        <td className="py-2 px-4">false</td>
                                        <td className="py-2 px-4 text-white/60">Optional. If true, only returns categories where <code>budget_left &lt; 0</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">include_zero</td>
                                        <td className="py-2 px-4">boolean</td>
                                        <td className="py-2 px-4">true</td>
                                        <td className="py-2 px-4 text-white/60">Optional. If false, hides categories with zero assigned, spent, and rollover.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">min_budget_left</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4">None</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Inclusive minimum for <code>budget_left</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">max_budget_left</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4">None</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Inclusive maximum for <code>budget_left</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">sort</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">None</td>
                                        <td className="py-2 px-4 text-white/60">Optional. One of <code>budget_left</code>, <code>spent</code>, <code>assigned</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">order</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">asc</td>
                                        <td className="py-2 px-4 text-white/60">Optional. <code>asc</code> or <code>desc</code>. Used with <code>sort</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">limit</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4">None</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Max records returned (1-1000).</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">offset</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4">0</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Records to skip before returning rows.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  "https://cashcat.app/api/v1/categories/budget-left?month=2026-02"`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": [
    {
      "category_id": "uuid-string",
      "category_name": "Groceries",
      "month": "2026-02",
      "assigned": 400,
      "rollover": 25,
      "spent": 130,
      "budget_left": 295
    }
  ],
  "meta": {
    "month": "2026-02",
    "start_date": "2026-02-01",
    "end_date": "2026-02-28"
  }
}`}
                        </pre>
                    </div>

                    {/* GET Categories */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/categories</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            List all budget categories.
                        </p>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  https://cashcat.app/api/v1/categories`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": [
    {
      "id": "uuid-string",
      "name": "Groceries",
      "group_id": "uuid-string",
      "target_type": "monthly",
      "target_amount": 400.00
    }
  ]
}`}
                        </pre>
                    </div>

                    {/* GET Groups */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/groups</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            List all category groups.
                        </p>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  https://cashcat.app/api/v1/groups`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": [
    {
      "id": "uuid-string",
      "name": "Essential Expenses",
      "hidden": false
    }
  ]
}`}
                        </pre>
                    </div>

                    {/* GET Transactions */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
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
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">start_date</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">None</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Format <code>YYYY-MM-DD</code>. Inclusive lower date bound.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">end_date</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">None</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Format <code>YYYY-MM-DD</code>. Inclusive upper date bound.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">month</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">None</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Format <code>YYYY-MM</code>. Applies a full-month date filter. Cannot be combined with <code>start_date</code>/<code>end_date</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">type</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4">All types</td>
                                        <td className="py-2 px-4 text-white/60">Optional. One of <code>income</code>, <code>payment</code>, <code>starting</code>.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">account_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4">All accounts</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Filter to a specific account.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">category_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4">All categories</td>
                                        <td className="py-2 px-4 text-white/60">Optional. Filter to a specific category.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  "https://cashcat.app/api/v1/transactions?start_date=2026-02-01&end_date=2026-02-15&limit=5"`}
                        </pre>

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
      "account_id": "uuid-string",
      "type": "payment"
    }
  ]
}`}
                        </pre>
                    </div>

                    {/* POST Transactions */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
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
                                        <td className="py-2 px-4 text-white/60">Transaction description.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">category_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">UUID of the category.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">account_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-white/50">No</td>
                                        <td className="py-2 px-4 text-white/60">UUID of the account. Defaults to your default account if omitted.</td>
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

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -X POST https://cashcat.app/api/v1/transactions \\
  -H "Authorization: Bearer cc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": -25.50,
    "description": "API Test Purchase",
    "date": "2026-02-02",
    "category_id": "2fb65eee-ab32-4299-b6d4-5ed61f829204"
  }'`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": {
    "id": "new-uuid-string",
    "amount": -25.50,
    "description": "API Test Purchase",
    "date": "2026-02-02",
    "category_id": "2fb65eee-ab32-4299-b6d4-5ed61f829204",
    "account_id": "default-account-uuid",
    "type": "expense",
    "created_at": "2026-02-02T12:00:00Z"
  }
}`}
                        </pre>
                    </div>

                    {/* GET Transfers */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">GET</span>
                            <code>/api/v1/transfers</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Retrieve a list of your most recent transfers between accounts.
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

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -H "Authorization: Bearer cc_live_..." \\
  https://cashcat.app/api/v1/transfers`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": [
    {
      "id": "uuid-string",
      "from_account_id": "uuid-string-from",
      "to_account_id": "uuid-string-to",
      "amount": 100.00,
      "date": "2024-02-04",
      "description": "Moving funds",
      "from_account": {
        "id": "uuid-string-from",
        "name": "Checking",
        "type": "checking"
      },
      "to_account": {
        "id": "uuid-string-to",
        "name": "Savings",
        "type": "savings"
      }
    }
  ]
}`}
                        </pre>
                    </div>

                    {/* POST Transfers */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-green/20 text-green px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">POST</span>
                            <code>/api/v1/transfers</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Create a new transfer between two of your accounts.
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
                                        <td className="py-2 px-4 font-mono text-green">from_account_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">UUID of the source account.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">to_account_id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">UUID of the destination account.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">amount</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">Positive value of the transfer.</td>
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
                                        <td className="py-2 px-4 text-white/50">No</td>
                                        <td className="py-2 px-4 text-white/60">Optional note for the transfer.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -X POST https://cashcat.app/api/v1/transfers \\
  -H "Authorization: Bearer cc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "from_account_id": "c8070e66-7e5c-4048-b008-d0751d9a2775",
    "to_account_id": "2fb65eee-ab32-4299-b6d4-5ed61f829204",
    "amount": 100.00,
    "date": "2026-02-04",
    "description": "Savings Goal"
  }'`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": {
    "id": "new-transfer-uuid",
    "from_account_id": "c8070e66-7e5c-4048-b008-d0751d9a2775",
    "to_account_id": "2fb65eee-ab32-4299-b6d4-5ed61f829204",
    "amount": 100.00,
    "date": "2026-02-04",
    "description": "Savings Goal",
    "created_at": "2026-02-04T12:00:00Z"
  }
}`}
                        </pre>
                    </div>

                    {/* PUT Transfers */}
                    <div className="mb-12 border-b border-white/5 pb-10">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">PUT</span>
                            <code>/api/v1/transfers</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Update an existing transfer.
                        </p>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Request Body (JSON)</h4>
                        <p className="text-sm text-white/60 mb-2">Include the <code>id</code> of the transfer you want to update, along with any fields you want to change.</p>
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
                                        <td className="py-2 px-4 font-mono text-green">id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-green">Yes</td>
                                        <td className="py-2 px-4 text-white/60">UUID of the transfer to update.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">amount</td>
                                        <td className="py-2 px-4">number</td>
                                        <td className="py-2 px-4 text-white/50">No</td>
                                        <td className="py-2 px-4 text-white/60">New amount.</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 px-4 font-mono text-green">description</td>
                                        <td className="py-2 px-4">string</td>
                                        <td className="py-2 px-4 text-white/50">No</td>
                                        <td className="py-2 px-4 text-white/60">New description.</td>
                                    </tr>
                                    {/* Add other fields as optional */}
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -X PUT https://cashcat.app/api/v1/transfers \\
  -H "Authorization: Bearer cc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "existing-transfer-uuid",
    "amount": 150.00
  }'`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "data": {
    "id": "existing-transfer-uuid",
    "amount": 150.00,
    "description": "Savings Goal",
    "date": "2026-02-04",
    ...
  }
}`}
                        </pre>
                    </div>

                    {/* DELETE Transfers */}
                    <div className="mb-12">
                        <h3 className="text-xl font-medium mb-3 flex items-center gap-3">
                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">DELETE</span>
                            <code>/api/v1/transfers</code>
                        </h3>
                        <p className="mb-4 text-white/70">
                            Delete a transfer permanently.
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
                                        <td className="py-2 px-4 font-mono text-green">id</td>
                                        <td className="py-2 px-4">string (uuid)</td>
                                        <td className="py-2 px-4 text-white/60">The ID of the transfer to delete.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Request</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80 mb-6">
                            {`curl -X DELETE "https://cashcat.app/api/v1/transfers?id=existing-transfer-uuid" \\
  -H "Authorization: Bearer cc_live_..."`}
                        </pre>

                        <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-2">Example Response</h4>
                        <pre className="bg-black/30 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm text-white/80">
                            {`{
  "success": true
}`}
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
