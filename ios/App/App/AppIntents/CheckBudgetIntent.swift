import AppIntents
import Foundation

struct IntentAssignmentRow: Decodable {
    let id: String?
    let category_id: String
    var month: String
    let assigned: Double?
    let rollover: Double?
}

@available(iOS 16.0, *)
struct AssignmentEntity: AppEntity {
    static var defaultQuery = AssignmentEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Assignment")

    let id: String
    @Property(title: "Month")
    var month: String
    @Property(title: "Category ID")
    var categoryId: String
    @Property(title: "Category")
    var categoryName: String
    @Property(title: "Assigned")
    var assigned: Double
    @Property(title: "Rollover")
    var rollover: Double
    @Property(title: "Activity")
    var activity: Double
    @Property(title: "Available")
    var available: Double

    init(
        id: String,
        month: String,
        categoryId: String,
        categoryName: String,
        assigned: Double,
        rollover: Double,
        activity: Double,
        available: Double
    ) {
        self.id = id
        self.month = month
        self.categoryId = categoryId
        self.categoryName = categoryName
        self.assigned = assigned
        self.rollover = rollover
        self.activity = activity
        self.available = available
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(categoryName)",
            subtitle: "\(month) • \(AppIntentSupport.formatAmount(available)) available"
        )
    }
}

@available(iOS 16.0, *)
struct CategoryBudgetLeftEntity: AppEntity {
    static var defaultQuery = CategoryBudgetLeftEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Category Budget Left")

    let id: String
    @Property(title: "Month")
    var month: String
    @Property(title: "Category ID")
    var categoryId: String
    @Property(title: "Category")
    var categoryName: String
    @Property(title: "Budget Left")
    var budgetLeft: Double
    @Property(title: "Assigned")
    var assigned: Double
    @Property(title: "Spent")
    var spent: Double
    @Property(title: "Over Budget")
    var isOverBudget: Bool

    init(
        id: String,
        month: String,
        categoryId: String,
        categoryName: String,
        budgetLeft: Double,
        assigned: Double,
        spent: Double,
        isOverBudget: Bool
    ) {
        self.id = id
        self.month = month
        self.categoryId = categoryId
        self.categoryName = categoryName
        self.budgetLeft = budgetLeft
        self.assigned = assigned
        self.spent = spent
        self.isOverBudget = isOverBudget
    }

    var displayRepresentation: DisplayRepresentation {
        let stateText = budgetLeft >= 0 ? "left" : "over"
        return DisplayRepresentation(
            title: "\(categoryName)",
            subtitle: "\(month) • \(AppIntentSupport.formatAmount(abs(budgetLeft))) \(stateText)"
        )
    }
}

@available(iOS 16.0, *)
struct AssignmentEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [AssignmentEntity] {
        guard !identifiers.isEmpty else { return [] }
        let current = try await fetchCurrentMonthAssignments()
        return current.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [AssignmentEntity] {
        try await fetchCurrentMonthAssignments()
    }

    private func fetchCurrentMonthAssignments() async throws -> [AssignmentEntity] {
        let ctx = try await AppIntentSupport.requireContext()
        let month = AppIntentSupport.currentMonthString()
        return try await assignmentEntities(ctx: ctx, selectedMonth: month)
    }
}

@available(iOS 16.0, *)
struct CategoryBudgetLeftEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CategoryBudgetLeftEntity] {
        guard !identifiers.isEmpty else { return [] }
        let all = try await fetchCurrentMonthBudgetLeft()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [CategoryBudgetLeftEntity] {
        try await fetchCurrentMonthBudgetLeft()
    }

    private func fetchCurrentMonthBudgetLeft() async throws -> [CategoryBudgetLeftEntity] {
        let ctx = try await AppIntentSupport.requireContext()
        let month = AppIntentSupport.currentMonthString()
        let assignments = try await assignmentEntities(ctx: ctx, selectedMonth: month)
        return categoryBudgetLeftEntities(from: assignments)
    }
}

@available(iOS 16.0, *)
struct ListGroupsIntent: AppIntent {
    static var title: LocalizedStringResource = "List Groups"
    static var description = IntentDescription("Return all category group objects.")
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ReturnsValue<[GroupEntity]> {
        let ctx = try await AppIntentSupport.requireContext()

        let groups: [IntentGroupRow] = try await ctx.client.fetch("groups", query: [
            URLQueryItem(name: "select", value: "id,name"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ])

        return .result(value: groups.map { GroupEntity(id: $0.id, name: $0.name) })
    }
}

@available(iOS 16.0, *)
struct ListCategoriesIntent: AppIntent {
    static var title: LocalizedStringResource = "List Categories"
    static var description = IntentDescription("Return category objects, optionally filtered by group.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Group")
    var group: GroupEntity?

    func perform() async throws -> some IntentResult & ReturnsValue<[CategoryEntity]> {
        let ctx = try await AppIntentSupport.requireContext()

        var query: [URLQueryItem] = [
            URLQueryItem(name: "select", value: "id,name,group"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ]
        if let group {
            query.append(URLQueryItem(name: "group", value: "eq.\(group.id)"))
        }

        let categories: [IntentCategoryRow] = try await ctx.client.fetch("categories", query: query)
        let entities = categories.map { CategoryEntity(id: $0.id, name: $0.name, groupId: $0.group) }
        return .result(value: entities)
    }
}

@available(iOS 16.0, *)
struct ListAssignmentsIntent: AppIntent {
    static var title: LocalizedStringResource = "List Assignments"
    static var description = IntentDescription("Return assignment objects for a month.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Month (YYYY-MM)")
    var month: String?

    func perform() async throws -> some IntentResult & ReturnsValue<[AssignmentEntity]> {
        let ctx = try await AppIntentSupport.requireContext()
        let selectedMonth = AppIntentSupport.parseMonth(month) ?? AppIntentSupport.currentMonthString()
        let entities = try await assignmentEntities(ctx: ctx, selectedMonth: selectedMonth)
        return .result(value: entities)
    }
}

@available(iOS 16.0, *)
struct ListCategoryBudgetLeftIntent: AppIntent {
    static var title: LocalizedStringResource = "List Budget Left"
    static var description = IntentDescription("Return remaining budget for each category in a month.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Month (YYYY-MM)")
    var month: String?

    func perform() async throws -> some IntentResult & ReturnsValue<[CategoryBudgetLeftEntity]> {
        let ctx = try await AppIntentSupport.requireContext()
        let selectedMonth = AppIntentSupport.parseMonth(month) ?? AppIntentSupport.currentMonthString()
        let assignments = try await assignmentEntities(ctx: ctx, selectedMonth: selectedMonth)
        let entities = categoryBudgetLeftEntities(from: assignments)
        return .result(value: entities)
    }
}

@available(iOS 16.0, *)
private func assignmentEntities(
    ctx: AppIntentSupport.Context,
    selectedMonth: String
) async throws -> [AssignmentEntity] {
    let monthStart = "\(selectedMonth)-01"
    let monthEnd = endOfMonthDateString(monthStart)

    let allAssignments: [IntentAssignmentRow] = try await fetchAllRows(
        ctx: ctx,
        path: "assignments",
        baseQuery: [
            URLQueryItem(name: "select", value: "id,category_id,month,assigned,rollover"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "month.asc,category_id.asc"),
        ]
    )
    let selectedAssignments = allAssignments.filter { $0.month == selectedMonth }
    guard !selectedAssignments.isEmpty else { return [] }

    let selectedAssignmentByCategory = selectedAssignments.reduce(into: [String: IntentAssignmentRow]()) { partial, assignment in
        partial[assignment.category_id] = assignment
    }
    let selectedCategoryIds = Set(selectedAssignmentByCategory.keys)
    guard !selectedCategoryIds.isEmpty else { return [] }

    let categories: [IntentCategoryRow] = try await ctx.client.fetch("categories", query: [
        URLQueryItem(name: "select", value: "id,name,group"),
        URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
    ])
    let categoryMap = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.name) })

    var currentMonthTxQuery: [URLQueryItem] = [
        URLQueryItem(name: "select", value: "id,amount,date,description,category_id,account_id,type"),
        URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        URLQueryItem(name: "type", value: "eq.payment"),
        URLQueryItem(name: "date", value: "gte.\(monthStart)"),
        URLQueryItem(name: "date", value: "lte.\(monthEnd)"),
        URLQueryItem(name: "order", value: "date.asc,id.asc"),
    ]
    if let categoryFilter = categoryInFilterQueryItem(for: selectedCategoryIds) {
        currentMonthTxQuery.append(categoryFilter)
    }
    let monthTransactions: [IntentTransactionRow] = try await fetchAllRows(
        ctx: ctx,
        path: "transactions",
        baseQuery: currentMonthTxQuery
    )

    var historicalTxQuery: [URLQueryItem] = [
        URLQueryItem(name: "select", value: "id,amount,date,description,category_id,account_id,type"),
        URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        URLQueryItem(name: "type", value: "eq.payment"),
        URLQueryItem(name: "date", value: "lte.\(monthEnd)"),
        URLQueryItem(name: "order", value: "date.asc,id.asc"),
    ]
    if let categoryFilter = categoryInFilterQueryItem(for: selectedCategoryIds) {
        historicalTxQuery.append(categoryFilter)
    }
    let historicalTransactions: [IntentTransactionRow] = try await fetchAllRows(
        ctx: ctx,
        path: "transactions",
        baseQuery: historicalTxQuery
    )

    var spentByCategoryThisMonth: [String: Double] = [:]
    for tx in monthTransactions {
        guard let categoryId = tx.category_id else { continue }
        spentByCategoryThisMonth[categoryId, default: 0] += abs(tx.amount)
    }

    var assignmentsByCategoryMonth: [String: Double] = [:]
    var earliestMonthByCategory: [String: String] = [:]
    for assignment in allAssignments where selectedCategoryIds.contains(assignment.category_id) {
        let key = "\(assignment.category_id)|\(assignment.month)"
        assignmentsByCategoryMonth[key] = assignment.assigned ?? 0
        if let currentEarliest = earliestMonthByCategory[assignment.category_id] {
            if assignment.month < currentEarliest {
                earliestMonthByCategory[assignment.category_id] = assignment.month
            }
        } else {
            earliestMonthByCategory[assignment.category_id] = assignment.month
        }
    }

    var spentByCategoryMonth: [String: Double] = [:]
    for tx in historicalTransactions {
        guard let categoryId = tx.category_id, selectedCategoryIds.contains(categoryId) else { continue }
        guard let month = monthString(fromDateString: tx.date) else { continue }
        let key = "\(categoryId)|\(month)"
        spentByCategoryMonth[key, default: 0] += abs(tx.amount)
    }

    return selectedAssignmentByCategory.values
        .sorted {
            let lhs = categoryMap[$0.category_id] ?? "Unknown"
            let rhs = categoryMap[$1.category_id] ?? "Unknown"
            return lhs.localizedCaseInsensitiveCompare(rhs) == .orderedAscending
        }
        .map { assignment in
        let assigned = roundCurrency(assignment.assigned ?? 0)
        let spent = roundCurrency(spentByCategoryThisMonth[assignment.category_id] ?? 0)
        let rollover = roundCurrency(calculateRolloverForCategory(
            categoryId: assignment.category_id,
            targetMonth: selectedMonth,
            assignmentsByCategoryMonth: assignmentsByCategoryMonth,
            spentByCategoryMonth: spentByCategoryMonth,
            earliestMonthByCategory: earliestMonthByCategory
        ))
        let activity = -spent
        let available = roundCurrency(assigned + rollover - spent)
        return AssignmentEntity(
            id: assignment.id ?? "\(assignment.month)-\(assignment.category_id)",
            month: assignment.month,
            categoryId: assignment.category_id,
            categoryName: categoryMap[assignment.category_id] ?? "Unknown",
            assigned: assigned,
            rollover: rollover,
            activity: activity,
            available: available
        )
    }
}

@available(iOS 16.0, *)
private func categoryBudgetLeftEntities(from assignments: [AssignmentEntity]) -> [CategoryBudgetLeftEntity] {
    assignments
        .map { assignment in
            let spent = abs(assignment.activity)
            let budgetLeft = assignment.available
            return CategoryBudgetLeftEntity(
                id: assignment.id,
                month: assignment.month,
                categoryId: assignment.categoryId,
                categoryName: assignment.categoryName,
                budgetLeft: budgetLeft,
                assigned: assignment.assigned + assignment.rollover,
                spent: spent,
                isOverBudget: budgetLeft < 0
            )
        }
        .sorted { lhs, rhs in
            if lhs.isOverBudget != rhs.isOverBudget {
                return lhs.isOverBudget && !rhs.isOverBudget
            }
            return lhs.categoryName.localizedCaseInsensitiveCompare(rhs.categoryName) == .orderedAscending
        }
}

private func roundCurrency(_ value: Double) -> Double {
    (value * 100).rounded() / 100
}

private func monthString(fromDateString value: String) -> String? {
    guard value.count >= 7 else { return nil }
    return String(value.prefix(7))
}

private func nextMonthString(_ month: String) -> String? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone.current
    formatter.dateFormat = "yyyy-MM"

    guard let date = formatter.date(from: month) else { return nil }
    guard let nextMonth = Calendar.current.date(byAdding: .month, value: 1, to: date) else { return nil }
    return formatter.string(from: nextMonth)
}

private func categoryInFilterQueryItem(for categoryIds: Set<String>) -> URLQueryItem? {
    guard !categoryIds.isEmpty else { return nil }
    let list = categoryIds.sorted().joined(separator: ",")
    return URLQueryItem(name: "category_id", value: "in.(\(list))")
}

private func calculateRolloverForCategory(
    categoryId: String,
    targetMonth: String,
    assignmentsByCategoryMonth: [String: Double],
    spentByCategoryMonth: [String: Double],
    earliestMonthByCategory: [String: String]
) -> Double {
    guard var month = earliestMonthByCategory[categoryId], month < targetMonth else { return 0 }

    var rollover = 0.0
    while month < targetMonth {
        let key = "\(categoryId)|\(month)"
        let assigned = assignmentsByCategoryMonth[key] ?? 0
        let spent = spentByCategoryMonth[key] ?? 0
        rollover += assigned - spent

        guard let next = nextMonthString(month) else { break }
        month = next
    }
    return rollover
}

@available(iOS 16.0, *)
private func fetchAllRows<T: Decodable>(
    ctx: AppIntentSupport.Context,
    path: String,
    baseQuery: [URLQueryItem],
    batchSize: Int = 1000
) async throws -> [T] {
    var allRows: [T] = []
    var offset = 0

    while true {
        var query = baseQuery
        query.append(URLQueryItem(name: "limit", value: "\(batchSize)"))
        query.append(URLQueryItem(name: "offset", value: "\(offset)"))

        let batch: [T] = try await ctx.client.fetch(path, query: query)
        allRows.append(contentsOf: batch)

        if batch.count < batchSize {
            break
        }
        offset += batchSize
    }

    return allRows
}

private func endOfMonthDateString(_ monthStart: String) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone.current
    formatter.dateFormat = "yyyy-MM-dd"

    guard let start = formatter.date(from: monthStart) else {
        return monthStart
    }
    let calendar = Calendar.current
    guard let nextMonth = calendar.date(byAdding: .month, value: 1, to: start),
          let end = calendar.date(byAdding: .day, value: -1, to: nextMonth) else {
        return monthStart
    }
    return formatter.string(from: end)
}
