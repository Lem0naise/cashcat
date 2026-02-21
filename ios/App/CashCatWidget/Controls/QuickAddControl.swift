import AppIntents
import Foundation
import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct CashCatQuickAddControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.lemonaise.cashcat.quickadd") {
            ControlWidgetButton(action: QuickAddControlIntent()) {
                Label("Add Transaction", systemImage: "plus.circle.fill")
            }
        }
        .displayName("Add Transaction")
        .description("Quickly add a new transaction in CashCat.")
    }
}

@available(iOS 18.0, *)
struct QuickAddControlIntent: AppIntent {
    static let title: LocalizedStringResource = "Add Transaction"
    static let description = IntentDescription("Opens CashCat to add a transaction.")
    static let openAppWhenRun = true

    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(URL(string: "cashcat://budget/transactions")!))
    }
}
