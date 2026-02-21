import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    let entry: SpendingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(entry.periodLabel)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(WidgetColors.textTertiary)
                .textCase(.uppercase)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            SpentAmountText(amount: entry.totalSpent, size: .title3)

            Text("Spent")
                .font(.caption2)
                .foregroundStyle(WidgetColors.textSecondary)
                .lineLimit(1)

            if let balanceChange = entry.balanceChange {
                BalanceChangeView(change: balanceChange, previousLabel: entry.previousPeriodLabel, compact: true)
            }

            if let change = entry.spendingChange, let prevLabel = entry.previousPeriodLabel {
                SpendingChangeView(change: change, previousLabel: prevLabel)
            }

            HStack(spacing: 2) {
                Text(formatCurrency(entry.dailyAverage))
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(WidgetColors.accent)
                Text("/ day")
                    .font(.system(size: 9))
                    .foregroundStyle(WidgetColors.textTertiary)
            }
            .lineLimit(1)
            .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
    }
}
