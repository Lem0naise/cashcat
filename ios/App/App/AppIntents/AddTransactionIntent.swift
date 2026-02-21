import AppIntents
import Foundation

struct IntentCreateTransactionBody: Encodable {
    let amount: Double
    let date: String
    let description: String
    let category_id: String
    let account_id: String?
    let type: String
    let user_id: String
    let vendor: String
}

struct IntentCreatedTransactionRow: Decodable {
    let id: String
    let amount: Double
    let date: String
    let description: String?
    let category_id: String?
    let account_id: String?
    let type: String
}

struct IntentCreateTransferBody: Encodable {
    let from_account_id: String
    let to_account_id: String
    let amount: Double
    let date: String
    let description: String?
    let user_id: String
}

struct IntentUpdateTransferBody: Encodable {
    let amount: Double?
    let description: String?
}

@available(iOS 16.0, *)
enum TransactionMutationType: String, AppEnum {
    case payment
    case income

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Transaction Type")
    static var caseDisplayRepresentations: [TransactionMutationType: DisplayRepresentation] = [
        .payment: "Payment",
        .income: "Income",
    ]
}

@available(iOS 16.0, *)
struct CreateTransactionFromShortcutIntent: AppIntent {
    static var title: LocalizedStringResource = "Create Transaction"
    static var description = IntentDescription("Create and return a CashCat transaction object.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Amount")
    var amount: Double

    @Parameter(title: "Category")
    var category: CategoryEntity

    @Parameter(title: "Date (YYYY-MM-DD)")
    var date: String?

    @Parameter(title: "Description", default: "")
    var transactionDescription: String

    @Parameter(title: "Account")
    var account: AccountEntity?

    @Parameter(title: "Type", default: .payment)
    var type: TransactionMutationType

    static var parameterSummary: some ParameterSummary {
        Summary("Create \(\.$type) of \(\.$amount) in \(\.$category)") {
            \.$transactionDescription
            \.$date
            \.$account
        }
    }

    func perform() async throws -> some IntentResult & ReturnsValue<TransactionEntity> {
        let ctx = try await AppIntentSupport.requireContext()

        let finalDate = validatedDateOrToday(date)
        let normalizedAmount = normalizedAmountForType(amount, type: type)
        let trimmedDescription = transactionDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        let description = trimmedDescription.isEmpty ? category.name : trimmedDescription

        let body = IntentCreateTransactionBody(
            amount: normalizedAmount,
            date: finalDate,
            description: description,
            category_id: category.id,
            account_id: account?.id,
            type: type.rawValue,
            user_id: ctx.creds.userId,
            vendor: description
        )

        let created: [IntentCreatedTransactionRow] = try await ctx.client.postReturning("transactions", body: body)
        guard let row = created.first else {
            throw CashCatIntentError.notFound("Transaction was not created.")
        }

        let entity = TransactionEntity(
            id: row.id,
            amount: row.amount,
            date: AppIntentSupport.parseDay(row.date),
            dateText: row.date,
            transactionDescription: row.description ?? description,
            type: row.type,
            categoryId: row.category_id,
            categoryName: category.name,
            accountId: row.account_id,
            accountName: account?.name
        )
        return .result(value: entity)
    }

    private func normalizedAmountForType(_ value: Double, type: TransactionMutationType) -> Double {
        switch type {
        case .payment: return -abs(value)
        case .income: return abs(value)
        }
    }
}

@available(iOS 16.0, *)
struct CreateTransferFromShortcutIntent: AppIntent {
    static var title: LocalizedStringResource = "Create Transfer"
    static var description = IntentDescription("Create and return a transfer object.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "From Account")
    var fromAccount: AccountEntity

    @Parameter(title: "To Account")
    var toAccount: AccountEntity

    @Parameter(title: "Amount")
    var amount: Double

    @Parameter(title: "Date (YYYY-MM-DD)")
    var date: String?

    @Parameter(title: "Description")
    var transferDescription: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Transfer \(\.$amount) from \(\.$fromAccount) to \(\.$toAccount)") {
            \.$date
            \.$transferDescription
        }
    }

    func perform() async throws -> some IntentResult & ReturnsValue<TransferEntity> {
        let ctx = try await AppIntentSupport.requireContext()
        guard fromAccount.id != toAccount.id else {
            throw CashCatIntentError.invalidInput("From and to accounts must be different.")
        }

        let finalDate = validatedDateOrToday(date)
        let body = IntentCreateTransferBody(
            from_account_id: fromAccount.id,
            to_account_id: toAccount.id,
            amount: abs(amount),
            date: finalDate,
            description: transferDescription?.trimmingCharacters(in: .whitespacesAndNewlines),
            user_id: ctx.creds.userId
        )

        let created: [IntentTransferRow] = try await ctx.client.postReturning("transfers", body: body)
        guard let first = created.first else {
            throw CashCatIntentError.notFound("Transfer was not created.")
        }

        let entity = TransferEntity(
            id: first.id,
            amount: first.amount,
            date: AppIntentSupport.parseDay(first.date),
            dateText: first.date,
            transferDescription: first.description ?? "",
            fromAccountId: first.from_account_id,
            fromAccountName: fromAccount.name,
            toAccountId: first.to_account_id,
            toAccountName: toAccount.name
        )
        return .result(value: entity)
    }
}

@available(iOS 16.0, *)
struct UpdateTransferFromShortcutIntent: AppIntent {
    static var title: LocalizedStringResource = "Update Transfer"
    static var description = IntentDescription("Update and return a transfer object.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Transfer")
    var transfer: TransferEntity

    @Parameter(title: "New Amount")
    var amount: Double?

    @Parameter(title: "New Description")
    var transferDescription: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Update \(\.$transfer)") {
            \.$amount
            \.$transferDescription
        }
    }

    func perform() async throws -> some IntentResult & ReturnsValue<TransferEntity> {
        let ctx = try await AppIntentSupport.requireContext()

        let newDescription = transferDescription?.trimmingCharacters(in: .whitespacesAndNewlines)
        if amount == nil && (newDescription == nil || newDescription?.isEmpty == true) {
            throw CashCatIntentError.invalidInput("Provide a new amount, description, or both.")
        }

        let body = IntentUpdateTransferBody(
            amount: amount.map { abs($0) },
            description: (newDescription?.isEmpty == true ? nil : newDescription)
        )

        let updated: [IntentTransferRow] = try await ctx.client.patchReturning("transfers", body: body, query: [
            URLQueryItem(name: "id", value: "eq.\(transfer.id)"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])

        guard let first = updated.first else {
            throw CashCatIntentError.notFound("No transfer was updated.")
        }

        let entity = TransferEntity(
            id: first.id,
            amount: first.amount,
            date: AppIntentSupport.parseDay(first.date),
            dateText: first.date,
            transferDescription: first.description ?? "",
            fromAccountId: first.from_account_id,
            fromAccountName: transfer.fromAccountName,
            toAccountId: first.to_account_id,
            toAccountName: transfer.toAccountName
        )
        return .result(value: entity)
    }
}

@available(iOS 16.0, *)
struct DeleteTransferFromShortcutIntent: AppIntent {
    static var title: LocalizedStringResource = "Delete Transfer"
    static var description = IntentDescription("Delete a transfer and return success status.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Transfer")
    var transfer: TransferEntity

    func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
        let ctx = try await AppIntentSupport.requireContext()

        try await ctx.client.delete("transfers", query: [
            URLQueryItem(name: "id", value: "eq.\(transfer.id)"),
            URLQueryItem(name: "user_id", value: "eq.\(ctx.creds.userId)"),
        ])

        return .result(value: true)
    }
}

@available(iOS 16.0, *)
private func validatedDateOrToday(_ raw: String?) -> String {
    guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
        return AppIntentSupport.todayString()
    }
    let regex = try? NSRegularExpression(pattern: #"^\d{4}-\d{2}-\d{2}$"#)
    let range = NSRange(location: 0, length: raw.utf16.count)
    guard regex?.firstMatch(in: raw, options: [], range: range) != nil else {
        return AppIntentSupport.todayString()
    }
    return raw
}
