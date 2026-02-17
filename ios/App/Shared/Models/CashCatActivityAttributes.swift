import ActivityKit
import Foundation

struct CashCatActivityAttributes: ActivityAttributes {
    /// Static context that doesn't change during the activity
    struct ContentState: Codable, Hashable {
        var totalSpent: Double
        var transactionCount: Int
        var lastCategoryName: String
        var lastAmount: Double
        var dailyBudget: Double
    }

    /// The date the tracking started
    let startDate: Date
}
