export interface EmailTemplate {
  id: string;
  organizationId?: string | null;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  variables: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface EmailLog {
  id: string;
  organizationId?: string | null;
  toAddress: string;
  templateName?: string | null;
  subject: string;
  status: "queued" | "sent" | "failed";
  errorMessage?: string | null;
  sentAt?: string | Date | null;
  createdAt: string | Date;
}

export interface EmailDispatchPayload {
  templateName?: string;
  recipientEmail: string;
  variables?: Record<string, string | number>;
  organizationId?: string;
}
