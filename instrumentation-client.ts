import posthog from 'posthog-js';
import { Capacitor } from '@capacitor/core';

// On native Capacitor platforms there is no Next.js server to proxy requests
// through, so the relative /ingest path is unreachable. Use the direct PostHog
// host instead so events can be delivered from the native app.
const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();


posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: 'https://my.cashcat.app',
  ui_host: 'https://eu.posthog.com',
  // Include the defaults option as required by PostHog
  defaults: '2026-01-30',
  // Enables capturing unhandled exceptions via Error Tracking
  capture_exceptions: true,
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === 'development',
});

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
