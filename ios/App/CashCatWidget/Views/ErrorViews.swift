import SwiftUI
import WidgetKit

struct NotSignedInView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.title2)
                .foregroundStyle(WidgetColors.textTertiary)
            Text("Sign in to see\nyour spending")
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(WidgetColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct NoDataView: View {
    let periodLabel: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.bar")
                .font(.title2)
                .foregroundStyle(WidgetColors.textTertiary)
            Text("No spending data")
                .font(.caption)
                .foregroundStyle(WidgetColors.textSecondary)
            if !periodLabel.isEmpty {
                Text(periodLabel)
                    .font(.caption2)
                    .foregroundStyle(WidgetColors.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ErrorView: View {
    let message: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle")
                .font(.title2)
                .foregroundStyle(WidgetColors.orange)
            Text("Something went wrong")
                .font(.caption)
                .foregroundStyle(WidgetColors.textSecondary)
            Text(message)
                .font(.caption2)
                .foregroundStyle(WidgetColors.textTertiary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
