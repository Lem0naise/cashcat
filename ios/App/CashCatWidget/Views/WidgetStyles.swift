import SwiftUI

enum WidgetColors {
    static let background = Color(red: 10/255, green: 10/255, blue: 10/255)
    static let accent = Color(red: 186/255, green: 194/255, blue: 255/255)
    static let green = Color(red: 132/255, green: 214/255, blue: 132/255)
    static let orange = Color(red: 242/255, green: 96/255, blue: 47/255)
    static let cardBackground = Color.white.opacity(0.06)
    static let cardBorder = Color.white.opacity(0.1)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.7)
    static let textTertiary = Color.white.opacity(0.5)
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
        let arrow = isUp ? "\u{2191}" : "\u{2193}"
        let color = isUp ? WidgetColors.orange : WidgetColors.green

        if compact {
            Text("\(arrow)\(pct)% vs \(previousLabel)")
                .font(.caption2)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        } else {
            HStack(spacing: 4) {
                Text("\(arrow)\(pct)%")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(color)
                Text("vs \(previousLabel)")
                    .font(.caption2)
                    .foregroundStyle(WidgetColors.textTertiary)
            }
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
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
                        .fill(Color.white.opacity(0.08))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(WidgetColors.accent)
                        .frame(width: max(4, geo.size.width * barFraction), height: 6)
                }
            }
            .frame(height: 6)
        }
    }

    private var barFraction: CGFloat {
        guard maxAmount > 0 else { return 0 }
        return CGFloat(category.amount / maxAmount)
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
                        .fill(Color.white.opacity(0.08))
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
