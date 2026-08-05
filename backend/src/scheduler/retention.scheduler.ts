import cron from 'node-cron';
import { runRetention } from '../services/retention.service';

/**
 * Retention Scheduler (Wave 2 / Phase 2.4, R-30)
 *
 * Periodically reaps aged rows from firehose tables (analytics, telemetry, audit/comm
 * logs, expired tokens/sessions) per the policy in retention.service.ts.
 *
 * OPT-IN: only starts when RETENTION_ENABLED=true. Off by default so it can never
 * delete data on a deploy that hasn't consciously enabled it. Mirrors InterviewScheduler.
 */
export class RetentionScheduler {
  private cronExpression: string;
  private isRunning: boolean = false;

  /** @param cronExpression - default: daily at 03:15 (low-traffic window). */
  constructor(cronExpression: string = '15 3 * * *') {
    this.cronExpression = cronExpression;
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ RetentionScheduler is already running');
      return;
    }

    cron.schedule(this.cronExpression, async () => {
      await this.runOnce();
    });

    this.isRunning = true;
    console.log(`✅ RetentionScheduler started (schedule: ${this.cronExpression})`);
  }

  async runOnce(): Promise<void> {
    const startTime = Date.now();
    console.log('🧹 [RetentionScheduler] Running firehose retention...');
    try {
      const results = await runRetention();
      const summary = results.map((r) => `${r.model}=${r.deleted}`).join(', ');
      console.log(`✅ [RetentionScheduler] Retention complete: ${summary} | ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ [RetentionScheduler] Retention failed:', error);
    }
  }
}

// Singleton instance
let schedulerInstance: RetentionScheduler | null = null;

export function getRetentionScheduler(): RetentionScheduler {
  if (!schedulerInstance) {
    const cronExpr = process.env.RETENTION_CRON || '15 3 * * *';
    schedulerInstance = new RetentionScheduler(cronExpr);
  }
  return schedulerInstance;
}
