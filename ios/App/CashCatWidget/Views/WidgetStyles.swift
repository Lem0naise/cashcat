import SwiftUI
import UIKit

enum WidgetColors {
    static let background = Color.clear
    static var accent: Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark {
                return UIColor(red: 186/255, green: 194/255, blue: 255/255, alpha: 1)
            }
            return UIColor(red: 90/255, green: 104/255, blue: 245/255, alpha: 1)
        })
    }
    static var green: Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark {
                return UIColor(red: 132/255, green: 214/255, blue: 132/255, alpha: 1)
            }
            return UIColor(red: 45/255, green: 160/255, blue: 84/255, alpha: 1)
        })
    }
    static var orange: Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark {
                return UIColor(red: 242/255, green: 96/255, blue: 47/255, alpha: 1)
            }
            return UIColor(red: 220/255, green: 86/255, blue: 39/255, alpha: 1)
        })
    }
    static var cardBackground: Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark {
                return UIColor.white.withAlphaComponent(0.06)
            }
            return UIColor.black.withAlphaComponent(0.08)
        })
    }
    static var cardBorder: Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark {
                return UIColor.white.withAlphaComponent(0.1)
            }
            return UIColor.black.withAlphaComponent(0.12)
        })
    }
    static var trackBackground: Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark {
                return UIColor.white.withAlphaComponent(0.08)
            }
            return UIColor.black.withAlphaComponent(0.12)
        })
    }
    static let textPrimary = Color(uiColor: .label)
    static let textSecondary = Color(uiColor: .secondaryLabel)
    static let textTertiary = Color(uiColor: .tertiaryLabel)
}

struct GlassCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(WidgetColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(WidgetColors.cardBorder, lineWidth: 0.5)
            )
    }
}

extension View {
    func glassCard() -> some View {
        modifier(GlassCard())
    }
}

struct SpentAmountText: View {
    let amount: Double
    let size: Font

    var body: some View {
        Text(formatCurrency(amount))
            .font(size)
            .fontWeight(.bold)
            .foregroundStyle(WidgetColors.textPrimary)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }
}

struct SpendingChangeView: View {
    let change: Double
    let previousLabel: String
    var compact: Bool = false

    var body: some View {
        let isUp = change >= 0
        let pct = Int(abs(change * 100))
        let direction = isUp ? "higher" : "lower"
        let color: Color = change > 0 ? WidgetColors.orange : (change < 0 ? WidgetColors.green : WidgetColors.textTertiary)
        let text = "Spending: \(pct)% \(direction)"

        if compact {
            Text(text)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        } else {
            Text(text)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
    }
}

struct BalanceChangeView: View {
    let change: Double
    var previousLabel: String? = nil
    var compact: Bool = false

    var body: some View {
        let color: Color = change > 0 ? WidgetColors.green : (change < 0 ? WidgetColors.orange : WidgetColors.textTertiary)
        let text = "Balance: \(formatSignedCurrency(change))"

        Text(text)
            .font(compact ? .caption2 : .caption)
            .fontWeight(.semibold)
            .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }
}

struct CategoryBar: View {
    let category: CategorySpending
    let maxAmount: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(category.name)
                    .font(.caption2)
                    .foregroundStyle(WidgetColors.textSecondary)
                    .lineLimit(1)
                Spacer()
                Text(formatCurrency(category.amount))
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(WidgetColors.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(WidgetColors.trackBackground)
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(barColor)
                        .frame(width: fillWidth(in: geo.size.width), height: 6)
                }
            }
            .frame(height: 6)
        }
    }

    private var barColor: Color {
        WidgetColors.accent
    }

    private var barFraction: Double {
        if let budgetProgress = category.budgetProgress {
            return min(max(budgetProgress, 0), 1)
        }
        guard maxAmount > 0 else { return 0 }
        return min(max(category.amount / maxAmount, 0), 1)
    }

    private func fillWidth(in totalWidth: CGFloat) -> CGFloat {
        let width = totalWidth * CGFloat(barFraction)
        if width <= 0 { return 0 }
        return max(4, width)
    }
}

struct BudgetProgressBar: View {
    let budget: BudgetSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Budget")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(WidgetColors.textSecondary)
                Spacer()
                Text("\(formatCurrency(budget.totalSpent)) / \(formatCurrency(budget.totalAssigned))")
                    .font(.caption2)
                    .foregroundStyle(WidgetColors.textTertiary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(WidgetColors.trackBackground)
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(budget.isOverBudget ? WidgetColors.orange : WidgetColors.green)
                        .frame(width: min(geo.size.width, geo.size.width * budget.progress), height: 8)
                }
            }
            .frame(height: 8)
        }
    }
}

func compactAmount(_ value: Double) -> String {
    if value >= 1000 {
        return String(format: "£%.1fk", value / 1000)
    }
    return String(format: "£%.0f", value)
}

func formatCurrency(_ value: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = "GBP"
    formatter.maximumFractionDigits = value >= 1000 ? 0 : 2
    return formatter.string(from: NSNumber(value: value)) ?? "£0"
}

func formatSignedCurrency(_ value: Double) -> String {
    let absValue = abs(value)
    let sign = value >= 0 ? "+" : "-"
    return "\(sign)\(formatCurrency(absValue))"
}

func compactSignedAmount(_ value: Double) -> String {
    let absValue = abs(value)
    let sign = value >= 0 ? "+" : "-"
    return "\(sign)\(compactAmount(absValue))"
}
