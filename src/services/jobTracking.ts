/**
 * Job Tracking Service
 * In-memory job tracking for async operations
 */

export interface Job {
  id: string;
  type: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  total: number;
  results?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
  currentItem?: string;
}

class JobTracker {
  private jobs: Map<string, Job> = new Map();

  /**
   * Create a new job
   */
  createJob(type: string, total: number = 1): string {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: Job = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      total,
      startTime: new Date()
    };
    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Update job status
   */
  updateJob(jobId: string, updates: Partial<Job>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(jobId, job);
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'pending' || job.status === 'in-progress');
  }

  /**
   * Clean up old jobs (older than 1 hour)
   */
  cleanupOldJobs(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.startTime.getTime() < oneHourAgo) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// Singleton instance
export const jobTracker = new JobTracker();

// Clean up old jobs every 10 minutes
setInterval(() => {
  jobTracker.cleanupOldJobs();
}, 10 * 60 * 1000);

