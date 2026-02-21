import AppIntents
import Foundation

@available(iOS 16.0, *)
enum CashCatIntentError: LocalizedError {
    case notSignedIn
    case invalidInput(String)
    case notFound(String)

    var errorDescription: String? {
        switch self {
        case .notSignedIn:
            return "You need to sign in to CashCat first."
        case .invalidInput(let message):
            return message
        case .notFound(let message):
            return message
        }
    }
}

@available(iOS 16.0, *)
enum AppIntentSupport {
    struct Context {
        let creds: AuthManager.Credentials
        let client: SupabaseClient
    }

    static func context() async -> Context? {
        let authManager = AuthManager()
        guard let creds = await authManager.getValidCredentials() else { return nil }
        let client = SupabaseClient(
            baseUrl: creds.supabaseUrl,
            anonKey: creds.supabaseAnonKey,
            accessToken: creds.accessToken
        )
        return Context(creds: creds, client: client)
    }

    static func requireContext() async throws -> Context {
        guard let ctx = await context() else {
            throw CashCatIntentError.notSignedIn
        }
        return ctx
    }

    static func formatAmount(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "GBP"
        formatter.maximumFractionDigits = abs(value) >= 1000 ? 0 : 2
        return formatter.string(from: NSNumber(value: value)) ?? "£0"
    }

    static func todayString() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    static func currentMonthString() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: Date())
    }

    static func parseDay(_ raw: String) -> Date {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: raw) ?? Date()
    }

    static func formatDay(_ value: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: value)
    }

    static func clampLimit(_ value: Int) -> Int {
        min(max(value, 1), 100)
    }

    static func parseMonth(_ raw: String?) -> String? {
        guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
            return nil
        }
        let regex = try? NSRegularExpression(pattern: #"^\d{4}-\d{2}$"#)
        let range = NSRange(location: 0, length: raw.utf16.count)
        guard regex?.firstMatch(in: raw, options: [], range: range) != nil else { return nil }
        return raw
    }

    static func mapTransactionEntities(
        _ rows: [IntentTransactionRow],
        accountNames: [String: String],
        categoryNames: [String: String]
    ) -> [TransactionEntity] {
        rows.map { row in
            TransactionEntity(
                id: row.id,
                amount: row.amount,
                date: parseDay(row.date),
                dateText: row.date,
                transactionDescription: row.description ?? row.type.capitalized,
                type: row.type,
                categoryId: row.category_id,
                categoryName: row.category_id.flatMap { categoryNames[$0] },
                accountId: row.account_id,
                accountName: row.account_id.flatMap { accountNames[$0] }
            )
        }
    }

    static func mapTransferEntities(
        _ rows: [IntentTransferRow],
        accountNames: [String: String]
    ) -> [TransferEntity] {
        rows.map { row in
            let fromName = accountNames[row.from_account_id] ?? "Unknown"
            let toName = accountNames[row.to_account_id] ?? "Unknown"
            return TransferEntity(
                id: row.id,
                amount: row.amount,
                date: parseDay(row.date),
                dateText: row.date,
                transferDescription: row.description ?? "",
                fromAccountId: row.from_account_id,
                fromAccountName: fromName,
                toAccountId: row.to_account_id,
                toAccountName: toName
            )
        }
    }
}

struct IntentAccountRow: Codable {
    let id: String
    var name: String
    var type: String
    let is_default: Bool?
    let is_active: Bool?
}

struct IntentCategoryRow: Codable {
    let id: String
    let name: String
    let group: String?
}

struct IntentGroupRow: Codable {
    let id: String
    let name: String
}

struct IntentTransferRow: Codable {
    let id: String
    let from_account_id: String
    let to_account_id: String
    let amount: Double
    let date: String
    let description: String?
}

struct IntentTransactionRow: Codable {
    let id: String
    let amount: Double
    let date: String
    let description: String?
    let category_id: String?
    let account_id: String?
    let type: String
}

@available(iOS 16.0, *)
struct AccountEntity: AppEntity {
    static var defaultQuery = AccountEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Account")

    let id: String
    @Property(title: "Name")
    var name: String
    @Property(title: "Type")
    var type: String
    @Property(title: "Balance")
    var balance: Double?

    init(id: String, name: String, type: String, balance: Double?) {
        self.id = id
        self.name = name
        self.type = type
        self.balance = balance
    }

    var displayRepresentation: DisplayRepresentation {
        let subtitle = balance.map { "\(type.capitalized) • \(AppIntentSupport.formatAmount($0))" } ?? type.capitalized
        return DisplayRepresentation(title: "\(name)", subtitle: "\(subtitle)")
    }
}

@available(iOS 16.0, *)
struct AccountEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [AccountEntity] {
        let all = try await fetchAccounts()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [AccountEntity] {
        try await fetchAccounts()
    }

    private func fetchAccounts() async throws -> [AccountEntity] {
        let ctx = try await AppIntentSupport.requireContext()
        let rows: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ])
        return rows
            .filter { $0.is_active != false }
            .map { AccountEntity(id: $0.id, name: $0.name, type: $0.type, balance: nil) }
    }
}

@available(iOS 16.0, *)
struct CategoryEntity: AppEntity {
    static var defaultQuery = CategoryEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Category")

    let id: String
    @Property(title: "Name")
    var name: String
    @Property(title: "Group ID")
    var groupId: String?

    init(id: String, name: String, groupId: String?) {
        self.id = id
        self.name = name
        self.groupId = groupId
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

@available(iOS 16.0, *)
struct CategoryEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CategoryEntity] {
        let all = try await fetchCategories()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [CategoryEntity] {
        try await fetchCategories()
    }

    private func fetchCategories() async throws -> [CategoryEntity] {
        let ctx = try await AppIntentSupport.requireContext()
        let rows: [IntentCategoryRow] = try await ctx.client.fetch("categories", query: [
            URLQueryItem(name: "select", value: "id,name,group"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ])
        return rows.map { CategoryEntity(id: $0.id, name: $0.name, groupId: $0.group) }
    }
}

@available(iOS 16.0, *)
struct GroupEntity: AppEntity {
    static var defaultQuery = GroupEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Group")

    let id: String
    @Property(title: "Name")
    var name: String

    init(id: String, name: String) {
        self.id = id
        self.name = name
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

@available(iOS 16.0, *)
struct GroupEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [GroupEntity] {
        let all = try await fetchGroups()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [GroupEntity] {
        try await fetchGroups()
    }

    private func fetchGroups() async throws -> [GroupEntity] {
        let ctx = try await AppIntentSupport.requireContext()
        let rows: [IntentGroupRow] = try await ctx.client.fetch("groups", query: [
            URLQueryItem(name: "select", value: "id,name"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ])
        return rows.map { GroupEntity(id: $0.id, name: $0.name) }
    }
}

@available(iOS 16.0, *)
struct TransactionEntity: AppEntity {
    static var defaultQuery = TransactionEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Transaction")

    let id: String
    @Property(title: "Amount")
    var amount: Double
    @Property(title: "Date")
    var date: Date
    @Property(title: "Date Text")
    var dateText: String
    @Property(title: "Description")
    var transactionDescription: String
    @Property(title: "Type")
    var type: String
    @Property(title: "Category ID")
    var categoryId: String?
    @Property(title: "Category")
    var categoryName: String?
    @Property(title: "Account ID")
    var accountId: String?
    @Property(title: "Account")
    var accountName: String?

    init(
        id: String,
        amount: Double,
        date: Date,
        dateText: String,
        transactionDescription: String,
        type: String,
        categoryId: String?,
        categoryName: String?,
        accountId: String?,
        accountName: String?
    ) {
        self.id = id
        self.amount = amount
        self.date = date
        self.dateText = dateText
        self.transactionDescription = transactionDescription
        self.type = type
        self.categoryId = categoryId
        self.categoryName = categoryName
        self.accountId = accountId
        self.accountName = accountName
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(transactionDescription)",
            subtitle: "\(AppIntentSupport.formatDay(date)) • \(AppIntentSupport.formatAmount(amount))"
        )
    }
}

@available(iOS 16.0, *)
struct TransactionEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [TransactionEntity] {
        guard !identifiers.isEmpty else { return [] }
        let ctx = try await AppIntentSupport.requireContext()
        let ids = identifiers.joined(separator: ",")

        let rows: [IntentTransactionRow] = try await ctx.client.fetch("transactions", query: [
            URLQueryItem(name: "select", value: "id,amount,date,description,category_id,account_id,type"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "id", value: "in.(\(ids))"),
        ])

        let accounts: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])
        let categories: [IntentCategoryRow] = try await ctx.client.fetch("categories", query: [
            URLQueryItem(name: "select", value: "id,name,group"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])

        let accountNames = Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0.name) })
        let categoryNames = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.name) })

        return AppIntentSupport.mapTransactionEntities(rows, accountNames: accountNames, categoryNames: categoryNames)
    }

    func suggestedEntities() async throws -> [TransactionEntity] {
        let ctx = try await AppIntentSupport.requireContext()
        let rows: [IntentTransactionRow] = try await ctx.client.fetch("transactions", query: [
            URLQueryItem(name: "select", value: "id,amount,date,description,category_id,account_id,type"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "date.desc"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: "25"),
        ])

        let accounts: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])
        let categories: [IntentCategoryRow] = try await ctx.client.fetch("categories", query: [
            URLQueryItem(name: "select", value: "id,name,group"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])

        let accountNames = Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0.name) })
        let categoryNames = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.name) })

        return AppIntentSupport.mapTransactionEntities(rows, accountNames: accountNames, categoryNames: categoryNames)
    }
}

@available(iOS 16.0, *)
struct TransferEntity: AppEntity {
    static var defaultQuery = TransferEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Transfer")

    let id: String
    @Property(title: "Amount")
    var amount: Double
    @Property(title: "Date")
    var date: Date
    @Property(title: "Date Text")
    var dateText: String
    @Property(title: "Description")
    var transferDescription: String
    @Property(title: "From Account ID")
    var fromAccountId: String
    @Property(title: "From Account")
    var fromAccountName: String
    @Property(title: "To Account ID")
    var toAccountId: String
    @Property(title: "To Account")
    var toAccountName: String

    init(
        id: String,
        amount: Double,
        date: Date,
        dateText: String,
        transferDescription: String,
        fromAccountId: String,
        fromAccountName: String,
        toAccountId: String,
        toAccountName: String
    ) {
        self.id = id
        self.amount = amount
        self.date = date
        self.dateText = dateText
        self.transferDescription = transferDescription
        self.fromAccountId = fromAccountId
        self.fromAccountName = fromAccountName
        self.toAccountId = toAccountId
        self.toAccountName = toAccountName
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(fromAccountName) -> \(toAccountName)",
            subtitle: "\(AppIntentSupport.formatDay(date)) • \(AppIntentSupport.formatAmount(amount))"
        )
    }
}

@available(iOS 16.0, *)
struct TransferEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [TransferEntity] {
        guard !identifiers.isEmpty else { return [] }
        let ctx = try await AppIntentSupport.requireContext()
        let ids = identifiers.joined(separator: ",")

        let rows: [IntentTransferRow] = try await ctx.client.fetch("transfers", query: [
            URLQueryItem(name: "select", value: "id,from_account_id,to_account_id,amount,date,description"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "id", value: "in.(\(ids))"),
        ])

        let accounts: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])
        let accountNames = Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0.name) })

        return AppIntentSupport.mapTransferEntities(rows, accountNames: accountNames)
    }

    func suggestedEntities() async throws -> [TransferEntity] {
        let ctx = try await AppIntentSupport.requireContext()

        let rows: [IntentTransferRow] = try await ctx.client.fetch("transfers", query: [
            URLQueryItem(name: "select", value: "id,from_account_id,to_account_id,amount,date,description"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "date.desc"),
            URLQueryItem(name: "limit", value: "25"),
        ])

        let accounts: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])
        let accountNames = Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0.name) })

        return AppIntentSupport.mapTransferEntities(rows, accountNames: accountNames)
    }
}

@available(iOS 16.0, *)
enum TransactionTypeFilter: String, AppEnum {
    case all
    case payment
    case income
    case starting

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Transaction Type")
    static var caseDisplayRepresentations: [TransactionTypeFilter: DisplayRepresentation] = [
        .all: "All",
        .payment: "Payments",
        .income: "Income",
        .starting: "Starting Balance",
    ]
}

@available(iOS 16.0, *)
struct ListAccountsIntent: AppIntent {
    static var title: LocalizedStringResource = "List Accounts"
    static var description = IntentDescription("Return your CashCat account objects and balances.")
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ReturnsValue<[AccountEntity]> {
        let ctx = try await AppIntentSupport.requireContext()

        let fetchedAccounts: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "name.asc"),
        ])
        let accounts = fetchedAccounts.filter { $0.is_active != false }

        if accounts.isEmpty {
            return .result(value: [])
        }

        let transactions: [IntentTransactionRow] = try await ctx.client.fetch("transactions", query: [
            URLQueryItem(name: "select", value: "account_id,amount,date,description,category_id,id,type"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])
        let transfers: [IntentTransferRow] = try await ctx.client.fetch("transfers", query: [
            URLQueryItem(name: "select", value: "id,from_account_id,to_account_id,amount,date,description"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])

        var balances: [String: Double] = [:]
        for account in accounts {
            balances[account.id] = 0
        }
        for tx in transactions {
            if let accountId = tx.account_id {
                balances[accountId, default: 0] += tx.amount
            }
        }
        for transfer in transfers {
            balances[transfer.from_account_id, default: 0] -= transfer.amount
            balances[transfer.to_account_id, default: 0] += transfer.amount
        }

        let entities = accounts.map {
            AccountEntity(
                id: $0.id,
                name: $0.name,
                type: $0.type,
                balance: balances[$0.id] ?? 0
            )
        }

        return .result(value: entities)
    }
}

@available(iOS 16.0, *)
struct ListTransactionsIntent: AppIntent {
    static var title: LocalizedStringResource = "List Transactions"
    static var description = IntentDescription("Return transaction objects that can be chained in Shortcuts.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Limit", default: 10)
    var limit: Int

    @Parameter(title: "Offset", default: 0)
    var offset: Int

    @Parameter(title: "Type", default: .all)
    var type: TransactionTypeFilter

    @Parameter(title: "Account")
    var account: AccountEntity?

    @Parameter(title: "Category")
    var category: CategoryEntity?

    func perform() async throws -> some IntentResult & ReturnsValue<[TransactionEntity]> {
        let ctx = try await AppIntentSupport.requireContext()

        let safeLimit = AppIntentSupport.clampLimit(limit)
        let safeOffset = max(offset, 0)

        var query: [URLQueryItem] = [
            URLQueryItem(name: "select", value: "id,amount,date,description,category_id,account_id,type"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "date.desc"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "offset", value: "\(safeOffset)"),
            URLQueryItem(name: "limit", value: "\(safeLimit)"),
        ]
        if type != .all {
            query.append(URLQueryItem(name: "type", value: "eq.\(type.rawValue)"))
        }
        if let account {
            query.append(URLQueryItem(name: "account_id", value: "eq.\(account.id)"))
        }
        if let category {
            query.append(URLQueryItem(name: "category_id", value: "eq.\(category.id)"))
        }

        let rows: [IntentTransactionRow] = try await ctx.client.fetch("transactions", query: query)

        if rows.isEmpty {
            return .result(value: [])
        }

        let accounts: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])
        let categories: [IntentCategoryRow] = try await ctx.client.fetch("categories", query: [
            URLQueryItem(name: "select", value: "id,name,group"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])

        let accountNames = Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0.name) })
        let categoryNames = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.name) })

        let entities = AppIntentSupport.mapTransactionEntities(rows, accountNames: accountNames, categoryNames: categoryNames)
        return .result(value: entities)
    }
}

@available(iOS 16.0, *)
struct ListTransfersIntent: AppIntent {
    static var title: LocalizedStringResource = "List Transfers"
    static var description = IntentDescription("Return transfer objects that can be chained in Shortcuts.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Limit", default: 10)
    var limit: Int

    @Parameter(title: "Offset", default: 0)
    var offset: Int

    func perform() async throws -> some IntentResult & ReturnsValue<[TransferEntity]> {
        let ctx = try await AppIntentSupport.requireContext()

        let safeLimit = AppIntentSupport.clampLimit(limit)
        let safeOffset = max(offset, 0)

        let rows: [IntentTransferRow] = try await ctx.client.fetch("transfers", query: [
            URLQueryItem(name: "select", value: "id,from_account_id,to_account_id,amount,date,description"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
            URLQueryItem(name: "order", value: "date.desc"),
            URLQueryItem(name: "offset", value: "\(safeOffset)"),
            URLQueryItem(name: "limit", value: "\(safeLimit)"),
        ])

        if rows.isEmpty {
            return .result(value: [])
        }

        let accounts: [IntentAccountRow] = try await ctx.client.fetch("accounts", query: [
            URLQueryItem(name: "select", value: "id,name,type,is_default,is_active"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])
        let accountNames = Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0.name) })

        let entities = AppIntentSupport.mapTransferEntities(rows, accountNames: accountNames)
        return .result(value: entities)
    }
}
