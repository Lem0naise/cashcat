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
private func assignmentEntities(
    ctx: AppIntentSupport.Context,
    selectedMonth: String
) async throws -> [AssignmentEntity] {
    let monthStart = "\(selectedMonth)-01"
    let monthEnd = endOfMonthDateString(monthStart)

    let assignments: [IntentAssignmentRow] = try await ctx.client.fetch("assignments", query: [
        URLQueryItem(name: "select", value: "id,category_id,month,assigned,rollover"),
        URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        URLQueryItem(name: "month", value: "eq.\(selectedMonth)"),
    ])

    guard !assignments.isEmpty else { return [] }

    let categories: [IntentCategoryRow] = try await ctx.client.fetch("categories", query: [
        URLQueryItem(name: "select", value: "id,name,group"),
        URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
    ])
    let categoryMap = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.name) })

    let monthTransactions: [IntentTransactionRow] = try await ctx.client.fetch("transactions", query: [
        URLQueryItem(name: "select", value: "id,amount,date,description,category_id,account_id,type"),
        URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        URLQueryItem(name: "type", value: "eq.payment"),
        URLQueryItem(name: "date", value: "gte.\(monthStart)"),
        URLQueryItem(name: "date", value: "lte.\(monthEnd)"),
    ])

    var spentByCategory: [String: Double] = [:]
    for tx in monthTransactions {
        guard let categoryId = tx.category_id else { continue }
        spentByCategory[categoryId, default: 0] += abs(tx.amount)
    }

    return assignments.map { assignment in
        let assigned = assignment.assigned ?? 0
        let rollover = assignment.rollover ?? 0
        let spent = spentByCategory[assignment.category_id] ?? 0
        let activity = -spent
        let available = assigned + rollover - spent
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
