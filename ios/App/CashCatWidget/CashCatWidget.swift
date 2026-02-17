import WidgetKit
import SwiftUI

struct CashCatWidgetProvider: AppIntentTimelineProvider {
    typealias Entry = SpendingEntry
    typealias Intent = SpendingWidgetIntent

    func placeholder(in context: Context) -> SpendingEntry {
        .placeholder()
    }

    func snapshot(for configuration: SpendingWidgetIntent, in context: Context) async -> SpendingEntry {
        if context.isPreview {
            return .placeholder()
        }
        return await fetchEntry(for: configuration)
    }

    func timeline(for configuration: SpendingWidgetIntent, in context: Context) async -> Timeline<SpendingEntry> {
        let entry = await fetchEntry(for: configuration)

        let refreshMinutes: Int
        switch entry.state {
        case .loaded, .noData:
            refreshMinutes = 30
        default:
            refreshMinutes = 15
        }
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: refreshMinutes, to: Date())!

        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func fetchEntry(for configuration: SpendingWidgetIntent) async -> SpendingEntry {
        let authManager = AuthManager()
        guard let creds = await authManager.getValidCredentials() else {
            return .notSignedIn()
        }

        let period = configuration.timePeriod
        let client = SupabaseClient(
            baseUrl: creds.supabaseUrl,
            anonKey: creds.supabaseAnonKey,
            accessToken: creds.accessToken
        )

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let range = period.dateRange
        let startStr = dateFormatter.string(from: range.start)
        let endStr = dateFormatter.string(from: range.end)

        // Previous period for comparison
        let prevRange = period.previousDateRange
        let prevStartStr = dateFormatter.string(from: prevRange.start)
        let prevEndStr = dateFormatter.string(from: prevRange.end)

        do {
            async let transactionsReq = client.fetchTransactions(
                userId: creds.userId, startDate: startStr, endDate: endStr
            )
            async let prevTransactionsReq = client.fetchTransactions(
                userId: creds.userId, startDate: prevStartStr, endDate: prevEndStr
            )
            async let categoriesReq = client.fetchCategories(userId: creds.userId)

            let (transactions, prevTransactions, categories) = try await (transactionsReq, prevTransactionsReq, categoriesReq)

            // Build category lookup
            let categoryMap = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0) })

            // Filter by selected groups/categories
            let selectedGroupIds = Set(configuration.groups?.map(\.id) ?? [])
            let selectedCategoryIds = Set(configuration.categories?.map(\.id) ?? [])

            func filterTransactions(_ txs: [SupabaseTransaction]) -> [SupabaseTransaction] {
                txs.filter { tx in
                    guard let cat = categoryMap[tx.category_id] else { return false }
                    if !selectedGroupIds.isEmpty {
                        guard let groupId = cat.group?.id, selectedGroupIds.contains(groupId) else { return false }
                    }
                    if !selectedCategoryIds.isEmpty {
                        guard selectedCategoryIds.contains(cat.id) else { return false }
                    }
                    return true
                }
            }

            let filteredTransactions = filterTransactions(transactions)
            let filteredPrevTransactions = filterTransactions(prevTransactions)

            if filteredTransactions.isEmpty {
                return .noData(periodLabel: period.label)
            }

            // Calculate totals by category
            var categoryTotals: [String: Double] = [:]
            var totalSpent: Double = 0

            for tx in filteredTransactions {
                let amount = abs(tx.amount)
                totalSpent += amount
                categoryTotals[tx.category_id, default: 0] += amount
            }

            let dailyAvg = totalSpent / Double(period.dayCount)

            // Calculate previous period total for comparison
            let prevTotalSpent = filteredPrevTransactions.reduce(0.0) { $0 + abs($1.amount) }
            let spendingChange: Double? = prevTotalSpent > 0
                ? (totalSpent - prevTotalSpent) / prevTotalSpent
                : nil

            // Build top categories
            let topCategories = categoryTotals
                .sorted { $0.value > $1.value }
                .prefix(10)
                .map { (catId, amount) -> CategorySpending in
                    let cat = categoryMap[catId]
                    return CategorySpending(
                        id: catId,
                        name: cat?.name ?? "Unknown",
                        groupName: cat?.group?.name,
                        amount: amount,
                        percentage: totalSpent > 0 ? amount / totalSpent : 0
                    )
                }

            return SpendingEntry(
                date: Date(),
                totalSpent: totalSpent,
                dailyAverage: dailyAvg,
                periodLabel: period.label,
                topCategories: topCategories,
                spendingChange: spendingChange,
                previousPeriodLabel: period.previousLabel,
                state: .loaded
            )
        } catch {
            return .error(error.localizedDescription)
        }
    }
}

struct CashCatWidget: Widget {
    let kind = "CashCatWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SpendingWidgetIntent.self, provider: CashCatWidgetProvider()) { entry in
            CashCatWidgetEntryView(entry: entry)
                .containerBackground(WidgetColors.background, for: .widget)
        }
        .configurationDisplayName("Spending")
        .description("View your spending statistics.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct CashCatWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: SpendingEntry

    var body: some View {
        // Accessory families get their own compact views for all states
        switch family {
        case .accessoryCircular:
            AccessoryCircularView(entry: entry)
        case .accessoryRectangular:
            AccessoryRectangularView(entry: entry)
        case .accessoryInline:
            AccessoryInlineView(entry: entry)
        default:
            // System families use full-sized views
            switch entry.state {
            case .notSignedIn:
                NotSignedInView()
            case .noData:
                NoDataView(periodLabel: entry.periodLabel)
            case .error(let message):
                ErrorView(message: message)
            case .loaded:
                switch family {
                case .systemSmall:
                    SmallWidgetView(entry: entry)
                case .systemMedium:
                    MediumWidgetView(entry: entry)
                case .systemLarge:
                    LargeWidgetView(entry: entry)
                default:
                    SmallWidgetView(entry: entry)
                }
            }
        }
    }
}

#Preview(as: .systemSmall) {
    CashCatWidget()
} timeline: {
    SpendingEntry.placeholder()
}

#Preview(as: .systemMedium) {
    CashCatWidget()
} timeline: {
    SpendingEntry.placeholder()
}

#Preview(as: .systemLarge) {
    CashCatWidget()
} timeline: {
    SpendingEntry.placeholder()
}
