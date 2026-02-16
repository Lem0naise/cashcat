import SwiftUI
import WidgetKit

struct MediumWidgetView: View {
    let entry: SpendingEntry

    var body: some View {
        HStack(spacing: 12) {
            // Left side — summary
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.periodLabel)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(WidgetColors.textTertiary)
                    .textCase(.uppercase)

                Spacer()

                SpentAmountText(amount: entry.totalSpent, size: .title2)

                Text("spent")
                    .font(.caption)
                    .foregroundStyle(WidgetColors.textSecondary)

                Spacer()

                if let change = entry.spendingChange, let prevLabel = entry.previousPeriodLabel {
                    SpendingChangeView(change: change, previousLabel: prevLabel, compact: true)
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
                .fixedSize()
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
        .padding(14)
    }
}
