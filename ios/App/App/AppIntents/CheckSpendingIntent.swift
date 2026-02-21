import AppIntents
import Foundation

@available(iOS 16.0, *)
struct CheckSpendingIntent: AppIntent {
    static var title: LocalizedStringResource = "Check Spending"
    static var description = IntentDescription("Check how much you've spent over a time period.")

    static var openAppWhenRun: Bool = false

    @Parameter(title: "Time Period", default: .thisMonth)
    var timePeriod: SpendingTimePeriod

    @Parameter(title: "Category", optionsProvider: CategoryOptionsProvider())
    var category: String?

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

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let range = timePeriod.dateRange
        let startStr = dateFormatter.string(from: range.start)
        let endStr = dateFormatter.string(from: range.end)

        let transactions: [SupabaseTransaction] = try await client.fetchTransactions(
            userId: creds.userId, startDate: startStr, endDate: endStr
        )
        let categories: [SupabaseCategory] = try await client.fetchCategories(userId: creds.userId)
        let categoryMap = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0) })

        var filtered = transactions
        if let categoryName = category?.trimmingCharacters(in: .whitespacesAndNewlines), !categoryName.isEmpty {
            let matchingCategories = categories.filter {
                $0.name.localizedCaseInsensitiveContains(categoryName)
            }

            if matchingCategories.isEmpty {
                let suggestions = categories
                    .prefix(5)
                    .map(\.name)
                    .joined(separator: ", ")
                return .result(dialog: "I couldn't find a category matching \"\(categoryName)\". Try: \(suggestions).")
            }

            let matchingCatIds = Set(matchingCategories.map(\.id))
            filtered = filtered.filter { matchingCatIds.contains($0.category_id) }
        }

        let totalSpent = filtered.reduce(0.0) { $0 + abs($1.amount) }
        let dayCount = max(1, Calendar.current.dateComponents([.day], from: range.start, to: range.end).day ?? 1)
        let dailyAvg = totalSpent / Double(dayCount)

        if filtered.isEmpty {
            var response = "No spending recorded for \(timePeriod.label.lowercased())"
            if let catName = category, !catName.isEmpty {
                response += " in \(catName)"
            }
            response += "."
            return .result(dialog: "\(response)")
        }

        // Top 3 categories
        var categoryTotals: [String: Double] = [:]
        for tx in filtered {
            categoryTotals[tx.category_id, default: 0] += abs(tx.amount)
        }
        let topCategories = categoryTotals
            .sorted { $0.value > $1.value }
            .prefix(3)
            .map { "\(categoryMap[$0.key]?.name ?? "Unknown"): \(formatAmount($0.value))" }
            .joined(separator: ", ")

        let periodLabel = timePeriod.label.lowercased()
        var response = "You've spent \(formatAmount(totalSpent)) \(periodLabel)"
        if let catName = category {
            response += " on \(catName)"
        }
        response += ". That's \(formatAmount(dailyAvg)) per day."

        if !topCategories.isEmpty && category == nil {
            response += " Top categories: \(topCategories)."
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

// MARK: - Shared Time Period Enum for App Intents
@available(iOS 16.0, *)
enum SpendingTimePeriod: String, AppEnum {
    case thisWeek = "this_week"
    case thisMonth = "this_month"
    case last30Days = "last_30_days"
    case last90Days = "last_90_days"
    case thisYear = "this_year"

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Time Period")

    static var caseDisplayRepresentations: [SpendingTimePeriod: DisplayRepresentation] = [
        .thisWeek: "This Week",
        .thisMonth: "This Month",
        .last30Days: "Last 30 Days",
        .last90Days: "Last 90 Days",
        .thisYear: "This Year",
    ]

    var label: String {
        switch self {
        case .thisWeek: return "This Week"
        case .thisMonth: return "This Month"
        case .last30Days: return "Last 30 Days"
        case .last90Days: return "Last 90 Days"
        case .thisYear: return "This Year"
        }
    }

    var dateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let now = Date()
        let endOfDay = calendar.startOfDay(for: now).addingTimeInterval(86399)

        switch self {
        case .thisWeek:
            let start = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
            return (start, endOfDay)
        case .thisMonth:
            let start = calendar.dateInterval(of: .month, for: now)?.start ?? now
            return (start, endOfDay)
        case .last30Days:
            let start = calendar.date(byAdding: .day, value: -29, to: calendar.startOfDay(for: now))!
            return (start, endOfDay)
        case .last90Days:
            let start = calendar.date(byAdding: .day, value: -89, to: calendar.startOfDay(for: now))!
            return (start, endOfDay)
        case .thisYear:
            let start = calendar.dateInterval(of: .year, for: now)?.start ?? now
            return (start, endOfDay)
        }
    }
}

// MARK: - Category Options Provider
@available(iOS 16.0, *)
struct CategoryOptionsProvider: DynamicOptionsProvider {
    func results() async throws -> [String] {
        let authManager = AuthManager()
        guard let creds = await authManager.getValidCredentials() else { return [] }

        let client = SupabaseClient(
            baseUrl: creds.supabaseUrl,
            anonKey: creds.supabaseAnonKey,
            accessToken: creds.accessToken
        )

        let categories: [SupabaseCategory] = try await client.fetchCategories(userId: creds.userId)
        return categories.map(\.name).sorted()
    }
}
