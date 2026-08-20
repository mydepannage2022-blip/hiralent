import cron from 'node-cron';
import { sweepExpiredSubscriptions } from '../services/subscription/subscription.service';

/**
 * Subscription Expiry Scheduler (Wave 5 / Phase 5.3, R-05)
 *
 * `getUserSubscription` resolves a lapsed period lazily on read, which is enough for anything
 * the user themselves looks at — but it never fires for a user who simply stops logging in.
 * That leaves rows sitting at `active`/`past_due` long after their period ended, which any
 * server-side entitlement check (Wave 5 S4) or admin report would then read as still-paying.
 *
 * This sweep is the batch half of the same rule, applied on a schedule instead of on a read:
 *   - lapsed + cancel_at_period_end + active → canceled
 *   - lapsed + past_due                      → expired
 *
 * It is idempotent (the WHERE clauses exclude rows already moved), so a duplicate run across
 * instances is harmless. Mirrors RetentionScheduler / InterviewScheduler.
 *
 * ON by default — unlike retention it deletes nothing, it only makes status truthful. Set
 * SUBSCRIPTION_EXPIRY_ENABLED=false to disable, SUBSCRIPTION_EXPIRY_CRON to retime.
 */
export class SubscriptionExpiryScheduler {
  private cronExpression: string;
  private isRunning: boolean = false;

  /** @param cronExpression - default: hourly on the half hour. */
  constructor(cronExpression: string = '30 * * * *') {
    this.cronExpression = cronExpression;
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ SubscriptionExpiryScheduler is already running');
      return;
    }

    cron.schedule(this.cronExpression, async () => {
      await this.runOnce();
    });

    this.isRunning = true;
    console.log(`✅ SubscriptionExpiryScheduler started (schedule: ${this.cronExpression})`);
  }

  async runOnce(): Promise<{ canceled: number; expired: number }> {
    const startTime = Date.now();
    try {
      const result = await sweepExpiredSubscriptions();
      if (result.canceled || result.expired) {
        console.log(
          `✅ [SubscriptionExpiryScheduler] canceled=${result.canceled} expired=${result.expired} | ${Date.now() - startTime}ms`
        );
      }
      return result;
    } catch (error) {
      console.error('❌ [SubscriptionExpiryScheduler] sweep failed:', error);
      return { canceled: 0, expired: 0 };
    }
  }
}

// Singleton instance
let schedulerInstance: SubscriptionExpiryScheduler | null = null;

export function getSubscriptionExpiryScheduler(): SubscriptionExpiryScheduler {
  if (!schedulerInstance) {
    const cronExpr = process.env.SUBSCRIPTION_EXPIRY_CRON || '30 * * * *';
    schedulerInstance = new SubscriptionExpiryScheduler(cronExpr);
  }
  return schedulerInstance;
}
