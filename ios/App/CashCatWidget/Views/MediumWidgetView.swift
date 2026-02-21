import SwiftUI
import WidgetKit

struct MediumWidgetView: View {
    let entry: SpendingEntry

    var body: some View {
        HStack(spacing: 10) {
            // Left side — summary
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.periodLabel)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(WidgetColors.textTertiary)
                    .textCase(.uppercase)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                SpentAmountText(amount: entry.totalSpent, size: .title)

                Text("Spent")
                    .font(.caption2)
                    .foregroundStyle(WidgetColors.textSecondary)
                    .lineLimit(1)

                Spacer(minLength: 4)

                VStack(alignment: .leading, spacing: 2) {
                    if let balanceChange = entry.balanceChange {
                        BalanceChangeView(change: balanceChange, previousLabel: entry.previousPeriodLabel, compact: true)
                    }

                    if let change = entry.spendingChange, let prevLabel = entry.previousPeriodLabel {
                        SpendingChangeView(change: change, previousLabel: prevLabel, compact: true)
                    }

                    if entry.balanceChange != nil || entry.spendingChange != nil {
                        Text("vs same days last month")
                            .font(.system(size: 9))
                            .foregroundStyle(WidgetColors.textTertiary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }

                    HStack(spacing: 2) {
                        Text(formatCurrency(entry.dailyAverage))
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(WidgetColors.accent)
                        Text("/ day")
                            .font(.caption2)
                            .foregroundStyle(WidgetColors.textTertiary)
                    }
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Right side — top 5 categories
            if !entry.topCategories.isEmpty {
                let top = Array(entry.topCategories.prefix(5))
                let maxAmount = top.first?.amount ?? 1

                VStack(spacing: 6) {
                    ForEach(top) { category in
                        CategoryBar(category: category, maxAmount: maxAmount)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(12)
    }
}
