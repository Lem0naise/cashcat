import Foundation
import Capacitor
import WidgetKit

@objc(AuthBridgePlugin)
public class AuthBridgePlugin: CAPPlugin {

    override public func load() {
        print("[AuthBridge] Plugin loaded!")
    }

    @objc func syncSession(_ call: CAPPluginCall) {
        guard let accessToken = call.getString("accessToken"),
              let refreshToken = call.getString("refreshToken"),
              let userId = call.getString("userId"),
              let supabaseUrl = call.getString("supabaseUrl"),
              let supabaseAnonKey = call.getString("supabaseAnonKey") else {
            call.reject("Missing required parameters")
            return
        }

        let expiresAt = call.getDouble("expiresAt") ?? 0

        guard let defaults = SharedConstants.sharedDefaults else {
            call.reject("Could not access App Group UserDefaults")
            return
        }

        defaults.set(accessToken, forKey: SharedConstants.Keys.accessToken)
        defaults.set(refreshToken, forKey: SharedConstants.Keys.refreshToken)
        defaults.set(expiresAt, forKey: SharedConstants.Keys.expiresAt)
        defaults.set(userId, forKey: SharedConstants.Keys.userId)
        defaults.set(supabaseUrl, forKey: SharedConstants.Keys.supabaseUrl)
        defaults.set(supabaseAnonKey, forKey: SharedConstants.Keys.supabaseAnonKey)
        defaults.synchronize()

        print("[AuthBridge] Session synced for user: \(userId)")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clearSession(_ call: CAPPluginCall) {
        guard let defaults = SharedConstants.sharedDefaults else {
            call.reject("Could not access App Group UserDefaults")
            return
        }

        let keys = [
            SharedConstants.Keys.accessToken,
            SharedConstants.Keys.refreshToken,
            SharedConstants.Keys.expiresAt,
            SharedConstants.Keys.userId,
        ]
        for key in keys {
            defaults.removeObject(forKey: key)
        }
        defaults.synchronize()

        print("[AuthBridge] Session cleared")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
