@import Capacitor;

CAP_PLUGIN(AuthBridgePlugin, "AuthBridge",
    CAP_PLUGIN_METHOD(syncSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearSession, CAPPluginReturnPromise);
)
