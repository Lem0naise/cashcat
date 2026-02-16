import WidgetKit
import Foundation

struct SpendingEntry: TimelineEntry {
    let date: Date
    let totalSpent: Double
    let dailyAverage: Double
    let periodLabel: String
    let topCategories: [CategorySpending]
    let spendingChange: Double?
    let previousPeriodLabel: String?
    let state: EntryState

    enum EntryState {
        case loaded
        case notSignedIn
        case noData
        case error(String)
    }

    static func placeholder() -> SpendingEntry {
        SpendingEntry(
            date: Date(),
            totalSpent: 1234.56,
            dailyAverage: 41.15,
            periodLabel: "This Month",
            topCategories: [
                CategorySpending(id: "1", name: "Groceries", groupName: "Essentials", amount: 450.00, percentage: 0.36),
                CategorySpending(id: "2", name: "Dining Out", groupName: "Fun", amount: 280.00, percentage: 0.23),
                CategorySpending(id: "3", name: "Transport", groupName: "Essentials", amount: 180.00, percentage: 0.15),
                CategorySpending(id: "4", name: "Shopping", groupName: "Fun", amount: 150.00, percentage: 0.12),
                CategorySpending(id: "5", name: "Utilities", groupName: "Bills", amount: 120.00, percentage: 0.10),
            ],
            spendingChange: 0.03,
            previousPeriodLabel: "last month",
            state: .loaded
        )
    }

    static func notSignedIn() -> SpendingEntry {
        SpendingEntry(
            date: Date(),
            totalSpent: 0,
            dailyAverage: 0,
            periodLabel: "",
            topCategories: [],
            spendingChange: nil,
            previousPeriodLabel: nil,
            state: .notSignedIn
        )
    }

    static func noData(periodLabel: String) -> SpendingEntry {
        SpendingEntry(
            date: Date(),
            totalSpent: 0,
            dailyAverage: 0,
            periodLabel: periodLabel,
            topCategories: [],
            spendingChange: nil,
            previousPeriodLabel: nil,
            state: .noData
        )
    }

    static func error(_ message: String) -> SpendingEntry {
        SpendingEntry(
            date: Date(),
            totalSpent: 0,
            dailyAverage: 0,
            periodLabel: "",
            topCategories: [],
            spendingChange: nil,
            previousPeriodLabel: nil,
            state: .error(message)
        )
    }
}
