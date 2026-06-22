import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built Angular web app into a native Android shell
 * (APK / Play Store .aab). `webDir` points at Angular's browser build output.
 *
 * To produce an APK (requires Android Studio + SDK installed):
 *   npm run build:mobile        # builds web app + syncs into native project
 *   npm run cap:add:android     # one-time: creates the android/ project
 *   npm run cap:open:android    # opens Android Studio -> Build > Build APK
 */
const config: CapacitorConfig = {
  appId: 'com.acmefuel.fuelflow',
  appName: 'FuelFlow',
  webDir: 'dist/petrol-app-frontend/browser',
};

export default config;
