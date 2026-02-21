import AppIntents
import ActivityKit
import Foundation

@available(iOS 16.0, *)
struct AddTransactionIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Transaction"
    static var description = IntentDescription("Add a new expense transaction to CashCat.")

    static var openAppWhenRun: Bool = false

    @Parameter(title: "Amount")
    var amount: Double

    @Parameter(title: "Category", optionsProvider: CategoryOptionsProvider())
    var categoryName: String

    @Parameter(title: "Description", default: "")
    var transactionDescription: String

    static var parameterSummary: some ParameterSummary {
        Summary("Add \(\.$amount) to \(\.$categoryName)") {
            \.$transactionDescription
        }
    }

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

        // Find matching category
        let categories: [SupabaseCategory] = try await client.fetchCategories(userId: creds.userId)
        guard let matchingCategory = categories.first(where: { $0.name.lowercased() == categoryName.lowercased() }) else {
            let available = categories.prefix(5).map(\.name).joined(separator: ", ")
            return .result(dialog: "I couldn't find a category called \"\(categoryName)\". Try one of: \(available).")
        }

        // Create the transaction
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: Date())

        let newTx = NewTransaction(
            amount: -abs(amount),  // expenses are negative
            date: today,
            category_id: matchingCategory.id,
            description: transactionDescription.isEmpty ? categoryName : transactionDescription,
            type: "payment",
            user_id: creds.userId
        )

        try await client.post("transactions", body: newTx)

        if #available(iOS 16.2, *) {
            await updateLiveActivity(
                client: client,
                userId: creds.userId,
                categoryName: matchingCategory.name,
                amount: abs(amount),
                today: today
            )
        }

        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "GBP"
        let formatted = formatter.string(from: NSNumber(value: abs(amount))) ?? "£\(amount)"

        return .result(dialog: "Done! Added \(formatted) to \(matchingCategory.name).")
    }

    @available(iOS 16.2, *)
    private func updateLiveActivity(
        client: SupabaseClient,
        userId: String,
        categoryName: String,
        amount: Double,
        today: String
    ) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        let monthFormatter = DateFormatter()
        monthFormatter.locale = Locale(identifier: "en_US_POSIX")
        monthFormatter.timeZone = TimeZone.current
        monthFormatter.dateFormat = "yyyy-MM"
        let monthKey = monthFormatter.string(from: Date())

        let daysInMonth = Calendar.current.range(of: .day, in: .month, for: Date())?.count ?? 30

        let todayTransactions = (try? await client.fetchTransactions(
            userId: userId,
            startDate: today,
            endDate: today
        )) ?? []
        let monthAssignments = (try? await client.fetchAssignments(
            userId: userId,
            startMonth: monthKey,
            endMonth: monthKey
        )) ?? []

        let totalSpentToday = todayTransactions.reduce(0.0) { $0 + abs($1.amount) }
        let transactionCountToday = todayTransactions.count
        let totalAssignedThisMonth = monthAssignments.reduce(0.0) { $0 + $1.assigned }
        let dailyBudget = totalAssignedThisMonth > 0
            ? (totalAssignedThisMonth / Double(max(daysInMonth, 1)))
            : 0

        let state = CashCatActivityAttributes.ContentState(
            totalSpent: totalSpentToday,
            transactionCount: transactionCountToday,
            lastCategoryName: categoryName,
            lastAmount: amount,
            dailyBudget: dailyBudget
        )
        let content = ActivityContent(state: state, staleDate: nil)

        if let activity = Activity<CashCatActivityAttributes>.activities.first {
            await activity.update(content)
        } else {
            let attributes = CashCatActivityAttributes(startDate: Date())
            _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
        }
    }
}
