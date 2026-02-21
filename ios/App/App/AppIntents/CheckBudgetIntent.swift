import AppIntents
import Foundation

@available(iOS 16.0, *)
struct CheckBudgetIntent: AppIntent {
    static var title: LocalizedStringResource = "Check Budget"
    static var description = IntentDescription("Check how your budget is doing this month.")

    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let authManager = AuthManager()
        guard let creds = await authManager.getValidCredentials() else {
            return .result(dialog: "You need to sign in to CashCat first.")
        }

        let client = SupabaseClient(
            baseUrl: creds.supabaseUrl,
            anonKey: creds.supabaseAnonKey,
            accessToken: creds.accessToken
        )

        let calendar = Calendar.current
        let now = Date()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        // Get current month range
        let monthStart = calendar.dateInterval(of: .month, for: now)?.start ?? now
        let endOfDay = calendar.startOfDay(for: now).addingTimeInterval(86399)
        let startStr = dateFormatter.string(from: monthStart)
        let endStr = dateFormatter.string(from: endOfDay)

        // Month string for assignments (yyyy-MM)
        let monthFormatter = DateFormatter()
        monthFormatter.locale = Locale(identifier: "en_US_POSIX")
        monthFormatter.timeZone = TimeZone.current
        monthFormatter.dateFormat = "yyyy-MM"
        let monthStr = monthFormatter.string(from: now)

        // Fetch data
        async let transactionsReq = client.fetchTransactions(
            userId: creds.userId, startDate: startStr, endDate: endStr
        )
        async let assignmentsReq = client.fetchAssignments(
            userId: creds.userId, startMonth: monthStr, endMonth: monthStr
        )
        async let categoriesReq = client.fetchCategories(userId: creds.userId)

        let (transactions, assignments, categories) = try await (transactionsReq, assignmentsReq, categoriesReq)
        let categoryMap = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0) })

        // Calculate totals
        let totalSpent = transactions.reduce(0.0) { $0 + abs($1.amount) }
        let totalAssigned = assignments.reduce(0.0) { $0 + $1.assigned }

        let remaining = totalAssigned - totalSpent
        let percentUsed = totalAssigned > 0 ? Int((totalSpent / totalAssigned) * 100) : 0

        // Find over-budget categories
        var spentByCategory: [String: Double] = [:]
        for tx in transactions {
            spentByCategory[tx.category_id, default: 0] += abs(tx.amount)
        }

        var assignedByCategory: [String: Double] = [:]
        for a in assignments {
            assignedByCategory[a.category_id, default: 0] += a.assigned
        }

        let overBudgetCategories = spentByCategory.compactMap { (catId, spent) -> String? in
            guard let assigned = assignedByCategory[catId], assigned > 0, spent > assigned else { return nil }
            let name = categoryMap[catId]?.name ?? "Unknown"
            return "\(name) (\(formatAmount(spent - assigned)) over)"
        }.prefix(3)

        let topSpendingCategories = spentByCategory
            .sorted { $0.value > $1.value }
            .prefix(2)
            .map { (catId, spent) in
                let name = categoryMap[catId]?.name ?? "Unknown"
                return "\(name): \(formatAmount(spent))"
            }

        let unbudgetedSpent = spentByCategory.reduce(0.0) { total, item in
            let assigned = assignedByCategory[item.key] ?? 0
            return assigned <= 0 ? total + item.value : total
        }

        var response: String
        if totalAssigned == 0 {
            response = "You've spent \(formatAmount(totalSpent)) this month, but you haven't set up a budget yet."
        } else if remaining >= 0 {
            response = "You've used \(percentUsed)% of your budget — \(formatAmount(totalSpent)) of \(formatAmount(totalAssigned)). You have \(formatAmount(remaining)) remaining."
        } else {
            response = "You're over budget! You've spent \(formatAmount(totalSpent)) against a budget of \(formatAmount(totalAssigned)) — that's \(formatAmount(abs(remaining))) over."
        }

        if !overBudgetCategories.isEmpty {
            response += " Over-budget: \(overBudgetCategories.joined(separator: ", "))."
        }
        if unbudgetedSpent > 0 {
            response += " Unbudgeted spending: \(formatAmount(unbudgetedSpent))."
        }
        if !topSpendingCategories.isEmpty {
            response += " Top spend: \(topSpendingCategories.joined(separator: ", "))."
        }

        return .result(dialog: "\(response)")
    }

    private func formatAmount(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "GBP"
        formatter.maximumFractionDigits = value >= 1000 ? 0 : 2
        return formatter.string(from: NSNumber(value: value)) ?? "£0"
    }
}
