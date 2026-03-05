import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog {
    if (!posthogClient) {
        posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
            host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
            // flushAt=1 and flushInterval=0 ensure events are sent immediately
            // in short-lived server-side functions (API routes, Server Actions).
            flushAt: 1,
            flushInterval: 0,
        });
    }
    return posthogClient;
}
