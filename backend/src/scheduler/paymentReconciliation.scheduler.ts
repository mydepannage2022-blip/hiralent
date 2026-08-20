import cron from 'node-cron';
import { reconcilePayments, ReconciliationReport } from '../services/payment/reconciliation.service';

/**
 * Payment Reconciliation Scheduler (Wave 5 / Phase 5.4, R-05)
 *
 * Subscription state is driven entirely by verified webhooks (S2). Webhooks can be missed —
 * an endpoint down for an hour, an event Stripe gave up retrying, a deploy mid-delivery — and
 * when one is missed nothing in the system notices: our row simply keeps saying `pending` while
 * the customer's card was charged.
 *
 * This job asks the gateway what it thinks, compares, and **reports**. It never writes payment
 * state: an unattended process reconciling money by guessing is worse than a stale row. The
 * mismatches land in PaymentEventLog and on the admin billing screen for a human to settle.
 *
 * ON by default. Set PAYMENT_RECONCILIATION_ENABLED=false to disable,
 * PAYMENT_RECONCILIATION_CRON to retime, RECONCILE_LOOKBACK_DAYS to widen the window.
 */
export class PaymentReconciliationScheduler {
  private cronExpression: string;
  private isRunning: boolean = false;

  /** @param cronExpression - default: daily at 03:15, off the hourly sweeps. */
  constructor(cronExpression: string = '15 3 * * *') {
    this.cronExpression = cronExpression;
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ PaymentReconciliationScheduler is already running');
      return;
    }

    cron.schedule(this.cronExpression, async () => {
      await this.runOnce();
    });

    this.isRunning = true;
    console.log(`✅ PaymentReconciliationScheduler started (schedule: ${this.cronExpression})`);
  }

  async runOnce(): Promise<ReconciliationReport | null> {
    const startTime = Date.now();
    try {
      const report = await reconcilePayments();

      if (!report.gateway_configured) {
        console.log('⏸️ [PaymentReconciliationScheduler] skipped — Stripe is not configured');
        return report;
      }

      if (report.mismatches.length) {
        console.warn(
          `⚠️ [PaymentReconciliationScheduler] ${report.mismatches.length} mismatch(es) across ` +
          `${report.checked} transaction(s) | ${Date.now() - startTime}ms`
        );
        for (const m of report.mismatches) {
          console.warn(
            `   ↳ ${m.transaction_id}: db=${m.db_status} gateway=${m.gateway_status} ` +
            `(${m.amount} ${m.currency})`
          );
        }
      } else if (report.checked) {
        console.log(
          `✅ [PaymentReconciliationScheduler] ${report.checked} transaction(s) reconcile | ${Date.now() - startTime}ms`
        );
      }

      return report;
    } catch (error) {
      console.error('❌ [PaymentReconciliationScheduler] run failed:', error);
      return null;
    }
  }
}

// Singleton instance
let schedulerInstance: PaymentReconciliationScheduler | null = null;

export function getPaymentReconciliationScheduler(): PaymentReconciliationScheduler {
  if (!schedulerInstance) {
    const cronExpr = process.env.PAYMENT_RECONCILIATION_CRON || '15 3 * * *';
    schedulerInstance = new PaymentReconciliationScheduler(cronExpr);
  }
  return schedulerInstance;
}
