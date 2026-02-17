import { Capacitor, registerPlugin } from '@capacitor/core';

interface LiveActivityBridgePlugin {
    startDailyTracker(options: {
        totalSpent: number;
        transactionCount: number;
        lastCategoryName: string;
        lastAmount: number;
        dailyBudget: number;
    }): Promise<{ activityId: string }>;

    updateSpending(options: {
        totalSpent: number;
        transactionCount: number;
        lastCategoryName: string;
        lastAmount: number;
        dailyBudget: number;
    }): Promise<void>;

    endDailyTracker(): Promise<void>;
}

const LiveActivityBridge = Capacitor.isNativePlatform()
    ? registerPlugin<LiveActivityBridgePlugin>('LiveActivityBridge')
    : null;

const LIVE_ACTIVITY_KEY = 'cashcat-live-activity-date';

/**
 * Hook to manage iOS Live Activities for daily spending tracking.
 * 
 * Usage:
 * ```
 * const { startOrUpdate, end } = useLiveActivity();
 * 
 * // After creating a transaction:
 * await startOrUpdate({
 *   totalSpent: 45.00,
 *   transactionCount: 3,
 *   lastCategoryName: 'Groceries',
 *   lastAmount: 12.50,
 *   dailyBudget: 50.00
 * });
 * ```
 */
export function useLiveActivity() {
    const isAvailable = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

    const startOrUpdate = async (data: {
        totalSpent: number;
        transactionCount: number;
        lastCategoryName: string;
        lastAmount: number;
        dailyBudget: number;
    }) => {
        if (!isAvailable || !LiveActivityBridge) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const lastDate = localStorage.getItem(LIVE_ACTIVITY_KEY);

            if (lastDate === today) {
                // Activity already started today — just update it
                await LiveActivityBridge.updateSpending(data);
            } else {
                // New day — end any existing and start fresh
                try {
                    await LiveActivityBridge.endDailyTracker();
                } catch {
                    // No existing activity to end, that's fine
                }
                await LiveActivityBridge.startDailyTracker(data);
                localStorage.setItem(LIVE_ACTIVITY_KEY, today);
            }
        } catch (error) {
            console.warn('[LiveActivity] Failed to start/update:', error);
        }
    };

    const end = async () => {
        if (!isAvailable || !LiveActivityBridge) return;

        try {
            await LiveActivityBridge.endDailyTracker();
            localStorage.removeItem(LIVE_ACTIVITY_KEY);
        } catch (error) {
            console.warn('[LiveActivity] Failed to end:', error);
        }
    };

    return { startOrUpdate, end, isAvailable };
}
