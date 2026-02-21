import SwiftUI
import WidgetKit

// MARK: - Accessory Circular (Lock Screen circle widget)
struct AccessoryCircularView: View {
    let entry: SpendingEntry

    var body: some View {
        switch entry.state {
        case .notSignedIn:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.title3)
            }
        case .noData, .error:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "sterlingsign.circle")
                    .font(.title2)
            }
        case .loaded:
            Gauge(value: min(gaugeValue, 1.0)) {
                Image(systemName: "sterlingsign")
            } currentValueLabel: {
                Text(compactAmount(entry.totalSpent))
                    .font(.system(.caption2, design: .rounded))
                    .fontWeight(.bold)
            }
            .gaugeStyle(.accessoryCircular)
        }
    }

    /// Gauge value based on how far through the period we are vs spending
    private var gaugeValue: Double {
        guard entry.dailyAverage > 0 else { return 0 }
        // Rough estimate: if spending matches daily average * days passed, gauge is at midpoint
        let daysInPeriod = max(1.0, Double(Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: entry.date), to: entry.date).day ?? 1))
        let expectedSpend = entry.dailyAverage * daysInPeriod
        guard expectedSpend > 0 else { return 0 }
        return entry.totalSpent / (expectedSpend * 2) // normalize so 100% = 2x expected
    }
}

// MARK: - Accessory Rectangular (Lock Screen rectangular widget)
struct AccessoryRectangularView: View {
    let entry: SpendingEntry

    var body: some View {
        switch entry.state {
        case .notSignedIn:
            VStack(alignment: .leading, spacing: 2) {
                Label("CashCat", systemImage: "sterlingsign.circle")
                    .font(.caption)
                    .fontWeight(.semibold)
                Text("Sign in to see spending")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        case .noData:
            VStack(alignment: .leading, spacing: 2) {
                Label("CashCat", systemImage: "sterlingsign.circle")
                    .font(.caption)
                    .fontWeight(.semibold)
                Text("No spending data")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        case .error(let message):
            VStack(alignment: .leading, spacing: 2) {
                Label("Error", systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .fontWeight(.semibold)
                Text(message)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        case .loaded:
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(entry.periodLabel)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                    Spacer()
                    if let change = entry.spendingChange {
                        let isUp = change >= 0
                        Text("\(isUp ? "↑" : "↓")\(Int(abs(change * 100)))%")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }

                Text(formatCurrency(entry.totalSpent))
                    .font(.headline)
                    .fontWeight(.bold)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)

                if let balanceChange = entry.balanceChange {
                    BalanceChangeView(change: balanceChange, compact: true)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                HStack(spacing: 4) {
                    Text("\(formatCurrency(entry.dailyAverage))/day")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    if let top = entry.topCategories.first {
                        Text("· Top: \(top.name)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }
            }
        }
    }
}

// MARK: - Accessory Inline (Lock Screen inline widget — above time)
struct AccessoryInlineView: View {
    let entry: SpendingEntry

    var body: some View {
        switch entry.state {
        case .loaded:
            Label {
                if let balanceChange = entry.balanceChange {
                    Text("\(compactAmount(entry.totalSpent)) · \(compactSignedAmount(balanceChange))")
                } else {
                    Text("\(compactAmount(entry.totalSpent)) spent")
                }
            } icon: {
                Image(systemName: "sterlingsign.circle.fill")
            }
        default:
            Label("CashCat", systemImage: "sterlingsign.circle")
        }
    }
}

#Preview(as: .accessoryCircular) {
    CashCatWidget()
} timeline: {
    SpendingEntry.placeholder()
}

#Preview(as: .accessoryRectangular) {
    CashCatWidget()
} timeline: {
    SpendingEntry.placeholder()
}

#Preview(as: .accessoryInline) {
    CashCatWidget()
} timeline: {
    SpendingEntry.placeholder()
}
