import AppIntents
import WidgetKit

enum TimePeriod: String, AppEnum {
    case thisMonth = "this_month"

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Time Period")

    static var caseDisplayRepresentations: [TimePeriod: DisplayRepresentation] = [
        .thisMonth: "This Month"
    ]

    var label: String {
        "This Month"
    }

    var dateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let now = Date()
        let endOfDay = calendar.startOfDay(for: now).addingTimeInterval(86399)
        let start = calendar.dateInterval(of: .month, for: now)?.start ?? now
        return (start, endOfDay)
    }

    var dayCount: Int {
        let range = dateRange
        return max(1, Calendar.current.dateComponents([.day], from: range.start, to: range.end).day ?? 1)
    }

    var previousDateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let current = dateRange
        let currentStartDay = calendar.startOfDay(for: current.start)
        let currentEndDay = calendar.startOfDay(for: current.end)
        let elapsedDays = max(1, (calendar.dateComponents([.day], from: currentStartDay, to: currentEndDay).day ?? 0) + 1)

        let prevMonthStart = calendar.date(byAdding: .month, value: -1, to: current.start)!
        let prevMonthInterval = calendar.dateInterval(of: .month, for: prevMonthStart)!
        let prevStartDay = calendar.startOfDay(for: prevMonthInterval.start)

        let prevEndCandidate = calendar.date(byAdding: .day, value: elapsedDays - 1, to: prevStartDay) ?? prevStartDay
        let prevMonthLastDay = calendar.startOfDay(for: prevMonthInterval.end.addingTimeInterval(-1))
        let prevEndDay = min(prevEndCandidate, prevMonthLastDay)
        let prevEnd = prevEndDay.addingTimeInterval(86399)

        return (prevStartDay, prevEnd)
    }

    var previousLabel: String {
        "same days last month"
    }
}

struct GroupEntity: AppEntity {
    static var defaultQuery = GroupEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Group")

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct GroupEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [GroupEntity] {
        let all = try await fetchGroups()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [GroupEntity] {
        try await fetchGroups()
    }

    private func fetchGroups() async throws -> [GroupEntity] {
        let authManager = AuthManager()
        guard let creds = await authManager.getValidCredentials() else { return [] }

        let client = SupabaseClient(baseUrl: creds.supabaseUrl, anonKey: creds.supabaseAnonKey, accessToken: creds.accessToken)

        struct GroupRow: Codable {
            let id: String
            let name: String
        }

        let groups: [GroupRow] = try await client.fetch("groups", query: [
            URLQueryItem(name: "select", value: "id,name"),
            URLQueryItem(name: "user_id", value: "eq.\(creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ])

        return groups.map { GroupEntity(id: $0.id, name: $0.name) }
    }
}

struct CategoryEntity: AppEntity {
    static var defaultQuery = CategoryEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Category")

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct CategoryEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CategoryEntity] {
        let all = try await fetchCategories()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [CategoryEntity] {
        try await fetchCategories()
    }

    private func fetchCategories() async throws -> [CategoryEntity] {
        let authManager = AuthManager()
        guard let creds = await authManager.getValidCredentials() else { return [] }

        let client = SupabaseClient(baseUrl: creds.supabaseUrl, anonKey: creds.supabaseAnonKey, accessToken: creds.accessToken)

        struct CategoryRow: Codable {
            let id: String
            let name: String
        }

        let categories: [CategoryRow] = try await client.fetch("categories", query: [
            URLQueryItem(name: "select", value: "id,name"),
            URLQueryItem(name: "user_id", value: "eq.\(creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ])

        return categories.map { CategoryEntity(id: $0.id, name: $0.name) }
    }
}

struct SpendingWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Monthly Spending"
    static var description = IntentDescription("View your monthly spending statistics.")

    @Parameter(title: "Time Period", default: .thisMonth)
    var timePeriod: TimePeriod

    @Parameter(title: "Groups")
    var groups: [GroupEntity]?

    @Parameter(title: "Categories")
    var categories: [CategoryEntity]?
}
