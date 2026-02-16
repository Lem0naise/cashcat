import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    let entry: SpendingEntry

    var body: some View {
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
            .fixedSize()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
    }
}
