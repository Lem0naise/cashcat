import Foundation

enum SharedConstants {
    static let appGroupID = "group.com.lemonaise.cashcat"

    enum Keys {
        static let accessToken = "auth_access_token"
        static let refreshToken = "auth_refresh_token"
        static let expiresAt = "auth_expires_at"
        static let userId = "auth_user_id"
        static let supabaseUrl = "supabase_url"
        static let supabaseAnonKey = "supabase_anon_key"
    }

    static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }
}
