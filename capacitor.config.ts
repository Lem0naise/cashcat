import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lemonaise.cashcat',
  appName: 'CashCat',
  webDir: 'out',
  ios: {
    preferredContentMode: 'mobile'
  }
};

export default config;
