@import Capacitor;

CAP_PLUGIN(LiveActivityBridgePlugin, "LiveActivityBridge",
    CAP_PLUGIN_METHOD(startDailyTracker, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateSpending, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endDailyTracker, CAPPluginReturnPromise);
)
