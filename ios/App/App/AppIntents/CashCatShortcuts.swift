import AppIntents

@available(iOS 16.0, *)
struct CashCatShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ListAccountsIntent(),
            phrases: [
                "Show my accounts in \(.applicationName)",
                "List accounts in \(.applicationName)",
                "What are my account balances in \(.applicationName)?",
            ],
            shortTitle: "Accounts",
            systemImageName: "creditcard"
        )

        AppShortcut(
            intent: ListTransactionsIntent(),
            phrases: [
                "List transactions in \(.applicationName)",
                "Show recent transactions in \(.applicationName)",
            ],
            shortTitle: "Transactions",
            systemImageName: "list.bullet.rectangle"
        )

        AppShortcut(
            intent: CreateTransactionFromShortcutIntent(),
            phrases: [
                "Create a transaction in \(.applicationName)",
                "Record a payment in \(.applicationName)",
                "Add income in \(.applicationName)",
            ],
            shortTitle: "Create Tx",
            systemImageName: "plus.circle"
        )

        AppShortcut(
            intent: ListTransfersIntent(),
            phrases: [
                "List transfers in \(.applicationName)",
                "Show my transfers in \(.applicationName)",
            ],
            shortTitle: "Transfers",
            systemImageName: "arrow.left.arrow.right"
        )

        AppShortcut(
            intent: CreateTransferFromShortcutIntent(),
            phrases: [
                "Create a transfer in \(.applicationName)",
                "Move money between accounts in \(.applicationName)",
            ],
            shortTitle: "Create Transfer",
            systemImageName: "arrow.right.circle"
        )

        AppShortcut(
            intent: UpdateTransferFromShortcutIntent(),
            phrases: [
                "Update a transfer in \(.applicationName)",
                "Change transfer details in \(.applicationName)",
            ],
            shortTitle: "Update Transfer",
            systemImageName: "pencil.circle"
        )

        AppShortcut(
            intent: DeleteTransferFromShortcutIntent(),
            phrases: [
                "Delete a transfer in \(.applicationName)",
                "Remove transfer in \(.applicationName)",
            ],
            shortTitle: "Delete Transfer",
            systemImageName: "trash.circle"
        )

        AppShortcut(
            intent: ListGroupsIntent(),
            phrases: [
                "List groups in \(.applicationName)",
                "Show category groups in \(.applicationName)",
            ],
            shortTitle: "Groups",
            systemImageName: "square.grid.2x2"
        )

        AppShortcut(
            intent: ListCategoriesIntent(),
            phrases: [
                "List categories in \(.applicationName)",
                "Show categories in \(.applicationName)",
            ],
            shortTitle: "Categories",
            systemImageName: "tag"
        )

        AppShortcut(
            intent: ListAssignmentsIntent(),
            phrases: [
                "List assignments in \(.applicationName)",
                "Show monthly assignments in \(.applicationName)",
            ],
            shortTitle: "Assignments",
            systemImageName: "calendar"
        )
    }
}
