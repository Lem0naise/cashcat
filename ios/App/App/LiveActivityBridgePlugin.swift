import Foundation
import Capacitor
import ActivityKit

@objc(LiveActivityBridgePlugin)
public class LiveActivityBridgePlugin: CAPPlugin {

    override public func load() {
        print("[LiveActivityBridge] Plugin loaded")
    }

    /// Start a daily spending tracker Live Activity
    @objc func startDailyTracker(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are not enabled")
            return
        }

        let dailyBudget = call.getDouble("dailyBudget") ?? 0
        let totalSpent = call.getDouble("totalSpent") ?? 0
        let transactionCount = call.getInt("transactionCount") ?? 0
        let lastCategoryName = call.getString("lastCategoryName") ?? "Unknown"
        let lastAmount = call.getDouble("lastAmount") ?? 0

        let attributes = CashCatActivityAttributes(startDate: Date())
        let state = CashCatActivityAttributes.ContentState(
            totalSpent: totalSpent,
            transactionCount: transactionCount,
            lastCategoryName: lastCategoryName,
            lastAmount: lastAmount,
            dailyBudget: dailyBudget
        )

        let content = ActivityContent(state: state, staleDate: nil)

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: content,
                pushType: nil
            )
            print("[LiveActivityBridge] Started activity: \(activity.id)")
            call.resolve(["activityId": activity.id])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    /// Update the current Live Activity with new spending data
    @objc func updateSpending(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        let totalSpent = call.getDouble("totalSpent") ?? 0
        let transactionCount = call.getInt("transactionCount") ?? 0
        let lastCategoryName = call.getString("lastCategoryName") ?? "Unknown"
        let lastAmount = call.getDouble("lastAmount") ?? 0
        let dailyBudget = call.getDouble("dailyBudget") ?? 0

        let state = CashCatActivityAttributes.ContentState(
            totalSpent: totalSpent,
            transactionCount: transactionCount,
            lastCategoryName: lastCategoryName,
            lastAmount: lastAmount,
            dailyBudget: dailyBudget
        )

        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            for activity in Activity<CashCatActivityAttributes>.activities {
                await activity.update(content)
                print("[LiveActivityBridge] Updated activity: \(activity.id)")
            }
            call.resolve()
        }
    }

    /// End all daily tracker Live Activities
    @objc func endDailyTracker(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        Task {
            for activity in Activity<CashCatActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
                print("[LiveActivityBridge] Ended activity: \(activity.id)")
            }
            call.resolve()
        }
    }
}
