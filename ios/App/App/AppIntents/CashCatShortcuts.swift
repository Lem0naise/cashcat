import AppIntents

@available(iOS 16.0, *)
struct CashCatShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CheckSpendingIntent(),
            phrases: [
                "How much have I spent with \(.applicationName)?",
                "Check my spending in \(.applicationName)",
                "What's my spending in \(.applicationName)?",
                "\(.applicationName) spending summary",
            ],
            shortTitle: "Check Spending",
            systemImageName: "sterlingsign.circle"
        )

        AppShortcut(
            intent: AddTransactionIntent(),
            phrases: [
                "Add a transaction in \(.applicationName)",
                "Log an expense in \(.applicationName)",
                "Record spending in \(.applicationName)",
            ],
            shortTitle: "Add Transaction",
            systemImageName: "plus.circle"
        )

        AppShortcut(
            intent: CheckBudgetIntent(),
            phrases: [
                "How is my budget in \(.applicationName)?",
                "Check my budget with \(.applicationName)",
                "Am I on budget in \(.applicationName)?",
                "\(.applicationName) budget summary",
            ],
            shortTitle: "Check Budget",
            systemImageName: "chart.bar"
        )
    }
}
