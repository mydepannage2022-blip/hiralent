import cron from 'node-cron';
import { checkAndExpireInterviews, checkAndFailAbandonedInterviews } from '../services/interview/aiInterview.service';

/**
 * Interview Scheduler
 *
 * Runs periodic tasks for interview management:
 * - Marks expired interviews (48h after scheduled date) → EXPIRED
 * - Marks abandoned interviews (24h after started) → FAILED
 */
export class InterviewScheduler {
  private cronExpression: string;
  private isRunning: boolean = false;

  /**
   * @param cronExpression - Cron expression for how often to run (default: every hour)
   */
  constructor(cronExpression: string = '0 * * * *') {
    this.cronExpression = cronExpression;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ InterviewScheduler is already running');
      return;
    }

    cron.schedule(this.cronExpression, async () => {
      await this.runAllChecks();
    });

    this.isRunning = true;
    console.log('✅ InterviewScheduler started');
    console.log(`⏰ Interview checks schedule: ${this.cronExpression} (every hour)`);

    // Run immediately on startup to catch any expired/abandoned interviews
    this.runAllChecks().catch(err => {
      console.error('❌ Initial interview checks failed:', err);
    });
  }

  /**
   * Run all interview status checks
   */
  async runAllChecks(): Promise<void> {
    const startTime = Date.now();
    console.log('🔍 [InterviewScheduler] Running interview status checks...');

    try {
      // Check for expired PENDING interviews (48h after scheduled)
      const { expiredCount } = await checkAndExpireInterviews();

      // Check for abandoned IN_PROGRESS interviews (24h after started)
      const { failedCount } = await checkAndFailAbandonedInterviews();

      const duration = Date.now() - startTime;

      console.log(`✅ [InterviewScheduler] Checks complete: ${expiredCount} expired, ${failedCount} abandoned | ${duration}ms`);
    } catch (error) {
      console.error('❌ [InterviewScheduler] Interview checks failed:', error);
    }
  }
}

// Singleton instance
let schedulerInstance: InterviewScheduler | null = null;

/**
 * Get or create the scheduler singleton
 */
export function getInterviewScheduler(): InterviewScheduler {
  if (!schedulerInstance) {
    // Run every hour at minute 0
    schedulerInstance = new InterviewScheduler('0 * * * *');
  }
  return schedulerInstance;
}
