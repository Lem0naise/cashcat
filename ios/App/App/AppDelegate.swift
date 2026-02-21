import UIKit
import Capacitor
import CoreSpotlight

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var pendingRoute: String?
    private var pendingRouteRetryCount: Int = 0
    private let maxPendingRouteRetries: Int = 20

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

        // If app was opened from a deep link before the web view was ready, retry now.
        if let route = pendingRoute {
            navigateWebView(to: route)
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        let handledByDeepLink = handleCashCatURL(url)
        let handledByCapacitor = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        return handledByDeepLink || handledByCapacitor
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        var handledBySpotlight = false

        // Handle Spotlight search result taps
        if userActivity.activityType == CSSearchableItemActionType,
           let identifier = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String {
            // Deep link to the category or group in the app
            // Format: "category:{id}" or "group:{id}"
            let parts = identifier.split(separator: ":")
            if parts.count == 2 {
                let type = String(parts[0])
                let id = String(parts[1])
                if let deepLinkUrl = URL(string: "cashcat://\(type)/\(id)") {
                    handledBySpotlight = handleCashCatURL(deepLinkUrl)
                    print("[Spotlight] Deep linking to \(deepLinkUrl)")
                }
            }
        }

        // Also handle default Capacitor behavior
        let handledByCapacitor = ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
        return handledBySpotlight || handledByCapacitor
    }

    @discardableResult
    private func handleCashCatURL(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == "cashcat" else { return false }

        let route = routeForDeepLink(url)
        pendingRoute = route
        pendingRouteRetryCount = 0
        navigateWebView(to: route)
        return true
    }

    private func routeForDeepLink(_ url: URL) -> String {
        let host = (url.host ?? "").lowercased()
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        if host == "add-transaction" {
            return "/budget/transactions?showModal=true"
        }

        if host == "budget", pathComponents.first?.lowercased() == "transactions" {
            return "/budget/transactions?showModal=true"
        }

        if host == "category" || host == "group" {
            return "/budget"
        }

        return "/budget"
    }

    private func navigateWebView(to route: String) {
        let escapedRoute = route
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let script = "window.location.href = '\(escapedRoute)'"

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let bridge = self.findBridgeViewController(),
                  let webView = bridge.bridge?.webView else {
                self.schedulePendingRouteRetry()
                return
            }

            webView.evaluateJavaScript(script) { _, error in
                if error == nil {
                    self.pendingRoute = nil
                    self.pendingRouteRetryCount = 0
                } else {
                    self.schedulePendingRouteRetry()
                }
            }
        }
    }

    private func schedulePendingRouteRetry() {
        guard pendingRoute != nil else { return }
        guard pendingRouteRetryCount < maxPendingRouteRetries else { return }

        pendingRouteRetryCount += 1
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            guard let self = self, let route = self.pendingRoute else { return }
            self.navigateWebView(to: route)
        }
    }

    private func findBridgeViewController() -> CAPBridgeViewController? {
        bridgeViewController(from: window?.rootViewController)
    }

    private func bridgeViewController(from controller: UIViewController?) -> CAPBridgeViewController? {
        guard let controller else { return nil }
        if let bridge = controller as? CAPBridgeViewController {
            return bridge
        }
        if let nav = controller as? UINavigationController {
            if let bridge = bridgeViewController(from: nav.visibleViewController) { return bridge }
            if let bridge = bridgeViewController(from: nav.topViewController) { return bridge }
            for child in nav.viewControllers {
                if let bridge = bridgeViewController(from: child) { return bridge }
            }
        }
        if let tab = controller as? UITabBarController {
            if let bridge = bridgeViewController(from: tab.selectedViewController) { return bridge }
            if let controllers = tab.viewControllers {
                for child in controllers {
                    if let bridge = bridgeViewController(from: child) { return bridge }
                }
            }
        }
        if let presented = controller.presentedViewController,
           let bridge = bridgeViewController(from: presented) {
            return bridge
        }
        for child in controller.children {
            if let bridge = bridgeViewController(from: child) {
                return bridge
            }
        }
        return nil
    }
}
