                                                                    §§import Foundation

actor AuthManager {
    struct Credentials {
        let accessToken: String
        let refreshToken: String
        let expiresAt: Double
        let userId: String
        let supabaseUrl: String
        let supabaseAnonKey: String
    }

    private let defaults = SharedConstants.sharedDefaults

    func getCredentials() -> Credentials? {
        guard let defaults = defaults,
              let accessToken = defaults.string(forKey: SharedConstants.Keys.accessToken),
              let refreshToken = defaults.string(forKey: SharedConstants.Keys.refreshToken),
              let userId = defaults.string(forKey: SharedConstants.Keys.userId),
              let supabaseUrl = defaults.string(forKey: SharedConstants.Keys.supabaseUrl),
              let supabaseAnonKey = defaults.string(forKey: SharedConstants.Keys.supabaseAnonKey) else {
            return nil
        }

        let expiresAt = defaults.double(forKey: SharedConstants.Keys.expiresAt)

        return Credentials(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            userId: userId,
            supabaseUrl: supabaseUrl,
            supabaseAnonKey: supabaseAnonKey
        )
    }

    func getValidCredentials() async -> Credentials? {
        guard var creds = getCredentials() else { return nil }

        // Check if token is expired (with 60s buffer)
        let now = Date().timeIntervalSince1970
        if creds.expiresAt > 0 && now >= (creds.expiresAt - 60) {
            if let refreshed = await refreshToken(creds: creds) {
                creds = refreshed
            } else {
                return nil
            }
        }

        return creds
    }

    private func refreshToken(creds: Credentials) async -> Credentials? {
        guard let url = URL(string: "\(creds.supabaseUrl)/auth/v1/token?grant_type=refresh_token") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(creds.supabaseAnonKey, forHTTPHeaderField: "apikey")

        let body: [String: Any] = ["refresh_token": creds.refreshToken]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                return nil
            }

            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let newAccessToken = json["access_token"] as? String,
                  let newRefreshToken = json["refresh_token"] as? String,
                  let expiresIn = json["expires_in"] as? Double else {
                return nil
            }

            let newExpiresAt = Date().timeIntervalSince1970 + expiresIn

            // Save refreshed tokens
            if let defaults = defaults {
                defaults.set(newAccessToken, forKey: SharedConstants.Keys.accessToken)
                defaults.set(newRefreshToken, forKey: SharedConstants.Keys.refreshToken)
                defaults.set(newExpiresAt, forKey: SharedConstants.Keys.expiresAt)
                defaults.synchronize()
            }

            return Credentials(
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresAt: newExpiresAt,
                userId: creds.userId,
                supabaseUrl: creds.supabaseUrl,
                supabaseAnonKey: creds.supabaseAnonKey
            )
        } catch {
            return nil
        }
    }
}
