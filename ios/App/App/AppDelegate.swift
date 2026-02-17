import UIKit
import Capacitor
import CoreSpotlight

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Index categories in Spotlight when app becomes active
        Task {
            await SpotlightIndexer.shared.indexCategories()
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url.
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Handle Spotlight search result taps
        if userActivity.activityType == CSSearchableItemActionType,
           let identifier = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String {
            // Deep link to the category or group in the app
            // Format: "category:{id}" or "group:{id}"
            if let bridge = self.window?.rootViewController as? CAPBridgeViewController {
                let parts = identifier.split(separator: ":")
                if parts.count == 2 {
                    let type = String(parts[0])
                    let id = String(parts[1])
                    // Navigate to budget page with the category focused
                    let deepLinkUrl = "cashcat://\(type)/\(id)"
                    bridge.bridge?.webView?.evaluateJavaScript(
                        "window.location.href = '/budget';"
                    )
                    print("[Spotlight] Deep linking to \(deepLinkUrl)")
                }
            }
        }

        // Also handle default Capacitor behavior
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

