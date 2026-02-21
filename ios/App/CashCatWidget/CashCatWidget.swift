import WidgetKit
import SwiftUI

struct CashCatWidgetProvider: AppIntentTimelineProvider {
    typealias Entry = SpendingEntry
    typealias Intent = SpendingWidgetIntent

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let monthFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM"
        return formatter
    }()

    private struct CategoryBudgetSnapshot {
        let budgetAmount: Double
        let remaining: Double
        let progress: Double
    }

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

        // Force monthly-only widget behavior even for stale persisted configurations.
        let period = TimePeriod.thisMonth
        let client = SupabaseClient(
            baseUrl: creds.supabaseUrl,
            anonKey: creds.supabaseAnonKey,
            accessToken: creds.accessToken
        )

        let range = period.dateRange
        let startStr = Self.dayFormatter.string(from: range.start)
        let endStr = Self.dayFormatter.string(from: range.end)

        // Previous period for comparison
        let prevRange = period.previousDateRange
        let prevStartStr = Self.dayFormatter.string(from: prevRange.start)
        let prevEndStr = Self.dayFormatter.string(from: prevRange.end)

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

            let topCategoryTuples = Array(
                categoryTotals
                    .sorted { $0.value > $1.value }
                    .prefix(10)
            )
            let topCategoryIds = Set(topCategoryTuples.map(\.key))

            let budgetSnapshots: [String: CategoryBudgetSnapshot]
            if !topCategoryIds.isEmpty {
                budgetSnapshots = try await calculateCategoryBudgetSnapshots(
                    client: client,
                    userId: creds.userId,
                    categoryIds: topCategoryIds,
                    period: period,
                    range: range,
                    periodSpendByCategory: categoryTotals
                )
            } else {
                budgetSnapshots = [:]
            }

            // Build top categories
            let topCategories = topCategoryTuples
                .map { (catId, amount) -> CategorySpending in
                    let cat = categoryMap[catId]
                    let budgetSnapshot = budgetSnapshots[catId]
                    return CategorySpending(
                        id: catId,
                        name: cat?.name ?? "Unknown",
                        groupName: cat?.group?.name,
                        amount: amount,
                        percentage: totalSpent > 0 ? amount / totalSpent : 0,
                        budgetAmount: budgetSnapshot?.budgetAmount,
                        budgetRemaining: budgetSnapshot?.remaining,
                        budgetProgress: budgetSnapshot?.progress
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

    private func calculateCategoryBudgetSnapshots(
        client: SupabaseClient,
        userId: String,
        categoryIds: Set<String>,
        period: TimePeriod,
        range: (start: Date, end: Date),
        periodSpendByCategory: [String: Double]
    ) async throws -> [String: CategoryBudgetSnapshot] {
        guard !categoryIds.isEmpty else { return [:] }

        let firstMonthInRange = Self.monthFormatter.string(from: range.start)
        let lastMonthInRange = Self.monthFormatter.string(from: range.end)
        let periodEndDay = Self.dayFormatter.string(from: range.end)

        let assignmentsForCategory = try await client.fetchAssignments(
            userId: userId,
            startMonth: "1970-01",
            endMonth: lastMonthInRange
        )
        .filter { categoryIds.contains($0.category_id) }

        let earliestMonthWithAssignment = assignmentsForCategory.map(\.month).min()
        let historicalTransactions: [SupabaseTransaction]
        if period == .thisMonth, let earliestMonthWithAssignment {
            historicalTransactions = try await client.fetchTransactions(
                userId: userId,
                startDate: "\(earliestMonthWithAssignment)-01",
                endDate: periodEndDay,
                categoryIds: Array(categoryIds)
            )
        } else {
            historicalTransactions = []
        }

        var spentByCategoryMonth: [String: [String: Double]] = [:]
        for tx in historicalTransactions {
            let month = String(tx.date.prefix(7))
            spentByCategoryMonth[tx.category_id, default: [:]][month, default: 0] += abs(tx.amount)
        }

        let assignmentsByCategory = Dictionary(grouping: assignmentsForCategory, by: \.category_id)
        var snapshots: [String: CategoryBudgetSnapshot] = [:]

        for categoryId in categoryIds {
            let categoryAssignments = assignmentsByCategory[categoryId] ?? []

            var assignedByMonth: [String: Double] = [:]
            for assignment in categoryAssignments {
                assignedByMonth[assignment.month, default: 0] += assignment.assigned
            }

            let spentInPeriod = periodSpendByCategory[categoryId] ?? 0
            let budgetAmount: Double

            if period == .thisMonth {
                let earliestCategoryMonth = categoryAssignments.map(\.month).min()
                var rollover: Double = 0

                if let earliestCategoryMonth {
                    for month in months(from: earliestCategoryMonth, until: firstMonthInRange) {
                        let assigned = assignedByMonth[month] ?? 0
                        let spent = spentByCategoryMonth[categoryId]?[month] ?? 0
                        rollover += assigned - spent
                    }
                }

                let assignedThisMonth = assignedByMonth[firstMonthInRange] ?? 0
                budgetAmount = rollover + assignedThisMonth
            } else {
                // Prorate each month assignment by the fraction of month days included in the selected range.
                budgetAmount = months(from: firstMonthInRange, through: lastMonthInRange)
                    .reduce(0.0) { partial, month in
                        partial + proratedAssignment(
                            assigned: assignedByMonth[month] ?? 0,
                            month: month,
                            range: range
                        )
                    }
            }

            let remaining = budgetAmount - spentInPeriod

            let progress: Double
            if budgetAmount > 0 {
                progress = spentInPeriod / budgetAmount
            } else if spentInPeriod > 0 {
                progress = 1.5
            } else {
                progress = 0
            }

            snapshots[categoryId] = CategoryBudgetSnapshot(
                budgetAmount: budgetAmount,
                remaining: remaining,
                progress: progress
            )
        }

        return snapshots
    }

    private func proratedAssignment(assigned: Double, month: String, range: (start: Date, end: Date)) -> Double {
        guard assigned != 0 else { return 0 }
        guard let monthDate = Self.monthFormatter.date(from: month) else { return 0 }

        let calendar = Calendar.current
        guard let monthInterval = calendar.dateInterval(of: .month, for: monthDate),
              let daysInMonth = calendar.range(of: .day, in: .month, for: monthDate)?.count else {
            return 0
        }

        let monthStart = monthInterval.start
        let monthEnd = monthInterval.end.addingTimeInterval(-1)
        let overlapStart = max(range.start, monthStart)
        let overlapEnd = min(range.end, monthEnd)

        guard overlapStart <= overlapEnd else { return 0 }

        let startDay = calendar.startOfDay(for: overlapStart)
        let endDay = calendar.startOfDay(for: overlapEnd)
        let overlapDays = (calendar.dateComponents([.day], from: startDay, to: endDay).day ?? 0) + 1

        guard overlapDays > 0 else { return 0 }
        return assigned * (Double(overlapDays) / Double(daysInMonth))
    }

    private func months(from startMonth: String, until targetMonth: String) -> [String] {
        guard let startDate = Self.monthFormatter.date(from: startMonth),
              let targetDate = Self.monthFormatter.date(from: targetMonth) else {
            return []
        }

        var result: [String] = []
        var cursor = startDate
        let calendar = Calendar(identifier: .gregorian)

        while cursor < targetDate {
            result.append(Self.monthFormatter.string(from: cursor))
            guard let nextMonth = calendar.date(byAdding: .month, value: 1, to: cursor) else {
                break
            }
            cursor = nextMonth
        }

        return result
    }

    private func months(from startMonth: String, through endMonth: String) -> [String] {
        guard let startDate = Self.monthFormatter.date(from: startMonth),
              let endDate = Self.monthFormatter.date(from: endMonth) else {
            return []
        }

        if startDate > endDate {
            return []
        }

        var result: [String] = []
        var cursor = startDate
        let calendar = Calendar(identifier: .gregorian)

        while cursor <= endDate {
            result.append(Self.monthFormatter.string(from: cursor))
            guard let nextMonth = calendar.date(byAdding: .month, value: 1, to: cursor) else {
                break
            }
            cursor = nextMonth
        }

        return result
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
