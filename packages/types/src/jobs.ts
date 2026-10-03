export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface JobRecord {
  id: string;
  name: string;
  queueName: string;
  payload: Record<string, any>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  scheduledFor?: string | Date | null;
  completedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}
