export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: Record<string, any>;
  responseStatus?: number | null;
  responseBody?: string | null;
  status: "success" | "failed" | "pending";
  attempt: number;
  createdAt: string | Date;
}

export interface WebhookEventPayload<T = any> {
  event: string;
  timestamp: string;
  data: T;
  organizationId?: string;
}
