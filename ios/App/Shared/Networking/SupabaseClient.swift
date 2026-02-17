import Foundation

struct SupabaseClient {
    let baseUrl: String
    let anonKey: String
    let accessToken: String

    func fetch<T: Decodable>(_ path: String, query: [URLQueryItem]) async throws -> T {
        var components = URLComponents(string: "\(baseUrl)/rest/v1/\(path)")!
        components.queryItems = query

        var request = URLRequest(url: components.url!)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw SupabaseError.httpError(statusCode)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }

    func post<T: Encodable>(_ path: String, body: T, query: [URLQueryItem] = []) async throws {
        var components = URLComponents(string: "\(baseUrl)/rest/v1/\(path)")!
        components.queryItems = query

        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw SupabaseError.httpError(statusCode)
        }
    }

    func fetchTransactions(userId: String, startDate: String, endDate: String) async throws -> [SupabaseTransaction] {
        try await fetch("transactions", query: [
            URLQueryItem(name: "select", value: "id,amount,date,category_id"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "type", value: "eq.payment"),
            URLQueryItem(name: "date", value: "gte.\(startDate)"),
            URLQueryItem(name: "date", value: "lte.\(endDate)"),
        ])
    }

    func fetchCategories(userId: String) async throws -> [SupabaseCategory] {
        try await fetch("categories", query: [
            URLQueryItem(name: "select", value: "id,name,group(id,name)"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
        ])
    }

    func fetchAssignments(userId: String, startMonth: String, endMonth: String) async throws -> [SupabaseAssignment] {
        try await fetch("assignments", query: [
            URLQueryItem(name: "select", value: "category_id,month,assigned,rollover"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "month", value: "gte.\(startMonth)"),
            URLQueryItem(name: "month", value: "lte.\(endMonth)"),
        ])
    }
}

enum SupabaseError: LocalizedError {
    case httpError(Int)

    var errorDescription: String? {
        switch self {
        case .httpError(let code): return "HTTP error \(code)"
        }
    }
}
