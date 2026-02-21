import WidgetKit
import SwiftUI

@main
struct CashCatWidgetBundle: WidgetBundle {
    var body: some Widget {
        CashCatWidget()
        if #available(iOS 18.0, *) {
            CashCatQuickAddControl()
        }
    }
}
