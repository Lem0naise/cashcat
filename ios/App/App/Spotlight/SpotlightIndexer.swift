import CoreSpotlight
import Foundation

class SpotlightIndexer {

    static let shared = SpotlightIndexer()

    /// Indexes the user's budget categories in Spotlight for quick search access
    func indexCategories() async {
        let authManager = AuthManager()
        guard let creds = await authManager.getValidCredentials() else {
            // Not signed in — remove any existing index
            CSSearchableIndex.default().deleteAllSearchableItems { _ in }
            return
        }

        let client = SupabaseClient(
            baseUrl: creds.supabaseUrl,
            anonKey: creds.supabaseAnonKey,
            accessToken: creds.accessToken
        )

        do {
            let categories: [SupabaseCategory] = try await client.fetchCategories(userId: creds.userId)
            var items: [CSSearchableItem] = []

            for category in categories {
                let attributes = CSSearchableItemAttributeSet(contentType: .content)
                attributes.title = category.name
                attributes.contentDescription = category.group != nil
                    ? "Budget category in \(category.group!.name)"
                    : "Budget category"
                attributes.keywords = [category.name, category.group?.name].compactMap { $0 }

                let item = CSSearchableItem(
                    uniqueIdentifier: "category:\(category.id)",
                    domainIdentifier: "com.lemonaise.cashcat.categories",
                    attributeSet: attributes
                )
                // Keep items in index for 30 days
                item.expirationDate = Calendar.current.date(byAdding: .day, value: 30, to: Date())
                items.append(item)
            }

            // Also index groups
            let groups = Dictionary(grouping: categories.compactMap(\.group), by: \.id)
            for (_, groupArray) in groups {
                guard let group = groupArray.first else { continue }
                let attributes = CSSearchableItemAttributeSet(contentType: .content)
                attributes.title = group.name
                attributes.contentDescription = "Budget group"
                attributes.keywords = [group.name, "budget", "group"]

                let item = CSSearchableItem(
                    uniqueIdentifier: "group:\(group.id)",
                    domainIdentifier: "com.lemonaise.cashcat.groups",
                    attributeSet: attributes
                )
                item.expirationDate = Calendar.current.date(byAdding: .day, value: 30, to: Date())
                items.append(item)
            }

            try await CSSearchableIndex.default().indexSearchableItems(items)
            print("[Spotlight] Indexed \(items.count) items")
        } catch {
            print("[Spotlight] Indexing failed: \(error.localizedDescription)")
        }
    }

    /// Removes all indexed items (e.g., on sign out)
    func removeAllItems() {
        CSSearchableIndex.default().deleteAllSearchableItems { error in
            if let error = error {
                print("[Spotlight] Failed to remove items: \(error.localizedDescription)")
            } else {
                print("[Spotlight] All items removed")
            }
        }
    }
}
