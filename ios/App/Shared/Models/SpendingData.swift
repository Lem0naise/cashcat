import Foundation

struct SupabaseTransaction: Codable {
    let id: String
    let amount: Double
    let date: String
    let category_id: String
}

struct SupabaseCategory: Codable {
    let id: String
    let name: String
    let group: SupabaseGroup?
}

struct SupabaseGroup: Codable {
    let id: String
    let name: String
}

struct SupabaseAssignment: Codable {
    let category_id: String
    let month: String
    let assigned: Double
    let rollover: Double?
}

struct CategorySpending: Identifiable {
    let id: String
    let name: String
    let groupName: String?
    let amount: Double
    let percentage: Double
    let budgetAmount: Double?
    let budgetRemaining: Double?
    let budgetProgress: Double?

    var hasBudget: Bool { budgetAmount != nil }
    var isOverBudget: Bool {
        if let budgetRemaining {
            return budgetRemaining < 0
        }
        if let budgetAmount {
            return budgetAmount <= 0 && amount > 0
        }
        return false
    }
}

struct BudgetSummary {
    let totalAssigned: Double
    let totalSpent: Double

    var isOverBudget: Bool { totalSpent > totalAssigned }
    var remaining: Double { totalAssigned - totalSpent }
    var progress: Double {
        guard totalAssigned > 0 else { return 0 }
        return min(totalSpent / totalAssigned, 1.5)
    }
}

/// Payload used by shortcut intents to POST a new transaction
struct NewTransaction: Encodable {
    let amount: Double
    let date: String
    let category_id: String
    let description: String
    let type: String
    let user_id: String
}
