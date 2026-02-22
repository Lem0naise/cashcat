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
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    SpentAmountText(amount: entry.totalSpent, size: .title2)
                    if let balanceChange = entry.balanceChange {
                        BalanceChangeView(change: balanceChange, previousLabel: entry.previousPeriodLabel, compact: true)
                    }
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
                    .minimumScaleFactor(0.75)

                    if let change = entry.spendingChange, let prevLabel = entry.previousPeriodLabel {
                        SpendingChangeView(change: change, previousLabel: prevLabel, compact: true)
                        Text("vs \(prevLabel)")
                            .font(.system(size: 9))
                            .foregroundStyle(WidgetColors.textTertiary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
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
                                        .fill(WidgetColors.trackBackground)
                                        .frame(height: 6)
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(barColor(for: category))
                                        .frame(
                                            width: fillWidth(for: category, maxAmount: maxAmount, totalWidth: geo.size.width),
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
                                Text(secondaryLabel(for: category))
                                    .font(.system(size: 9))
                                    .foregroundStyle(secondaryColor(for: category))
                            }
                            .frame(width: 55, alignment: .trailing)
                        }
                    }
                }
            }
        }
        .padding(12)
    }

    private func barFraction(for category: CategorySpending, maxAmount: Double) -> CGFloat {
        if let budgetProgress = category.budgetProgress {
            return CGFloat(min(max(budgetProgress, 0), 1))
        }
        guard maxAmount > 0 else { return 0 }
        return CGFloat(min(max(category.amount / maxAmount, 0), 1))
    }

    private func fillWidth(for category: CategorySpending, maxAmount: Double, totalWidth: CGFloat) -> CGFloat {
        let width = totalWidth * barFraction(for: category, maxAmount: maxAmount)
        if width <= 0 { return 0 }
        return max(4, width)
    }

    private func barColor(for category: CategorySpending) -> Color {
        WidgetColors.accent
    }

    private func secondaryLabel(for category: CategorySpending) -> String {
        if let remaining = category.budgetRemaining {
            if remaining >= 0 {
                return "\(compactAmount(remaining)) left"
            }
            return "\(compactAmount(abs(remaining))) over"
        }
        return "\(Int(category.percentage * 100))%"
    }

    private func secondaryColor(for category: CategorySpending) -> Color {
        if let remaining = category.budgetRemaining {
            return remaining >= 0 ? WidgetColors.textTertiary : WidgetColors.orange
        }
        return WidgetColors.textTertiary
    }
}
