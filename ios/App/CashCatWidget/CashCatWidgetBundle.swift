import WidgetKit
import SwiftUI

@main
struct CashCatWidgetBundle: WidgetBundle {
    var body: some Widget {
        CashCatWidget()
        CashCatLiveActivity()
        if #available(iOS 18.0, *) {
            CashCatQuickAddControl()
        }
    }
}
