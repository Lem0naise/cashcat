import AppIntents
import WidgetKit

enum TimePeriod: String, AppEnum {
    case thisWeek = "this_week"
    case thisMonth = "this_month"
    case last30Days = "last_30_days"
    case last90Days = "last_90_days"
    case thisYear = "this_year"

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Time Period")

    static var caseDisplayRepresentations: [TimePeriod: DisplayRepresentation] = [
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

    var dayCount: Int {
        let range = dateRange
        return max(1, Calendar.current.dateComponents([.day], from: range.start, to: range.end).day ?? 1)
    }

    var previousDateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let current = dateRange

        switch self {
        case .thisWeek:
            let end = calendar.date(byAdding: .second, value: -1, to: current.start)!
            let start = calendar.date(byAdding: .day, value: -7, to: current.start)!
            return (start, end)
        case .thisMonth:
            let prevMonth = calendar.date(byAdding: .month, value: -1, to: current.start)!
            let end = calendar.date(byAdding: .second, value: -1, to: current.start)!
            return (prevMonth, end)
        case .last30Days:
            let end = calendar.date(byAdding: .second, value: -1, to: current.start)!
            let start = calendar.date(byAdding: .day, value: -30, to: current.start)!
            return (start, end)
        case .last90Days:
            let end = calendar.date(byAdding: .second, value: -1, to: current.start)!
            let start = calendar.date(byAdding: .day, value: -90, to: current.start)!
            return (start, end)
        case .thisYear:
            let prevYear = calendar.date(byAdding: .year, value: -1, to: current.start)!
            let end = calendar.date(byAdding: .second, value: -1, to: current.start)!
            return (prevYear, end)
        }
    }

    var previousLabel: String {
        switch self {
        case .thisWeek: return "last week"
        case .thisMonth: return "last month"
        case .last30Days: return "prev 30 days"
        case .last90Days: return "prev 90 days"
        case .thisYear: return "last year"
        }
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
    static var title: LocalizedStringResource = "Spending Statistics"
    static var description = IntentDescription("View your spending statistics for a time period.")

    @Parameter(title: "Time Period", default: .thisMonth)
    var timePeriod: TimePeriod

    @Parameter(title: "Groups")
    var groups: [GroupEntity]?

    @Parameter(title: "Categories")
    var categories: [CategoryEntity]?
}
