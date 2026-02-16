import SwiftUI
import WidgetKit

struct LargeWidgetView: View {
    let entry: SpendingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.periodLabel)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(WidgetColors.textTertiary)
                        .textCase(.uppercase)
                    SpentAmountText(amount: entry.totalSpent, size: .title2)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 2) {
                        Text(formatCurrency(entry.dailyAverage))
                            .font(.callout)
                            .fontWeight(.semibold)
                            .foregroundStyle(WidgetColors.accent)
                        Text("/ day")
                            .font(.caption2)
                            .foregroundStyle(WidgetColors.textTertiary)
                    }
                    .lineLimit(1)
                    .fixedSize()

                    if let change = entry.spendingChange, let prevLabel = entry.previousPeriodLabel {
                        SpendingChangeView(change: change, previousLabel: prevLabel, compact: true)
                    }
                }
            }

            Divider().background(WidgetColors.cardBorder)

            // Categories
            if !entry.topCategories.isEmpty {
                let top = Array(entry.topCategories.prefix(10))
                let maxAmount = top.first?.amount ?? 1

                VStack(spacing: 5) {
                    ForEach(top) { category in
                        HStack(spacing: 8) {
                            Text(category.name)
                                .font(.caption2)
                                .foregroundStyle(WidgetColors.textSecondary)
                                .frame(width: 70, alignment: .leading)
                                .lineLimit(1)

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(Color.white.opacity(0.08))
                                        .frame(height: 6)
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(WidgetColors.accent)
                                        .frame(
                                            width: max(4, geo.size.width * CGFloat(category.amount / maxAmount)),
                                            height: 6
                                        )
                                }
                            }
                            .frame(height: 6)

                            VStack(alignment: .trailing, spacing: 0) {
                                Text(formatCurrency(category.amount))
                                    .font(.caption2)
                                    .fontWeight(.medium)
                                    .foregroundStyle(WidgetColors.textPrimary)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                                Text("\(Int(category.percentage * 100))%")
                                    .font(.system(size: 9))
                                    .foregroundStyle(WidgetColors.textTertiary)
                            }
                            .frame(width: 55, alignment: .trailing)
                        }
                    }
                }
            }
        }
        .padding(14)
    }
}
