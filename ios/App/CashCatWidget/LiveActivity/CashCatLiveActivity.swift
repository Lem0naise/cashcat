import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Live Activity Widget
struct CashCatLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CashCatActivityAttributes.self) { context in
            // Lock Screen / banner presentation
            LockScreenLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded region
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Today's Spending")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(formatLiveAmount(context.state.totalSpent))
                            .font(.title3)
                            .fontWeight(.bold)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(context.state.transactionCount) txn\(context.state.transactionCount == 1 ? "" : "s")")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        if context.state.dailyBudget > 0 {
                            let remaining = context.state.dailyBudget - context.state.totalSpent
                            Text(remaining >= 0 ? "\(formatLiveAmount(remaining)) left" : "\(formatLiveAmount(abs(remaining))) over")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(remaining >= 0 ? .green : .red)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.dailyBudget > 0 {
                        let progress = min(context.state.totalSpent / context.state.dailyBudget, 1.5)
                        VStack(spacing: 4) {
                            ProgressView(value: min(progress, 1.0))
                                .tint(progress > 1.0 ? .red : .green)
                            HStack {
                                Text("Last: \(formatLiveAmount(abs(context.state.lastAmount))) → \(context.state.lastCategoryName)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                                Spacer()
                            }
                        }
                    } else {
                        Text("Last: \(formatLiveAmount(abs(context.state.lastAmount))) → \(context.state.lastCategoryName)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
            } compactLeading: {
                Image(systemName: "sterlingsign.circle.fill")
                    .foregroundStyle(.blue)
            } compactTrailing: {
                Text(formatLiveAmount(context.state.totalSpent))
                    .font(.caption)
                    .fontWeight(.bold)
                    .minimumScaleFactor(0.7)
            } minimal: {
                Image(systemName: "sterlingsign.circle.fill")
                    .foregroundStyle(.blue)
            }
        }
    }
}

// MARK: - Lock Screen Live Activity View
struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<CashCatActivityAttributes>

    var body: some View {
        HStack(spacing: 16) {
            // Left side — total
            VStack(alignment: .leading, spacing: 4) {
                Text("Today's Spending")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(formatLiveAmount(context.state.totalSpent))
                    .font(.title2)
                    .fontWeight(.bold)
                Text("\(context.state.transactionCount) transaction\(context.state.transactionCount == 1 ? "" : "s")")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Right side — budget progress
            VStack(alignment: .trailing, spacing: 4) {
                if context.state.dailyBudget > 0 {
                    let remaining = context.state.dailyBudget - context.state.totalSpent
                    Text(remaining >= 0 ? "Remaining" : "Over budget")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(formatLiveAmount(abs(remaining)))
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundStyle(remaining >= 0 ? .green : .red)
                }

                Text("\(context.state.lastCategoryName)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(16)
        .activityBackgroundTint(.black.opacity(0.75))
    }
}

// MARK: - Helpers
private func formatLiveAmount(_ value: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = "GBP"
    formatter.maximumFractionDigits = value >= 100 ? 0 : 2
    return formatter.string(from: NSNumber(value: value)) ?? "£0"
}
