export type FieldType = "string" | "text" | "number" | "boolean" | "date" | "json";

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  description?: string;
}

export interface ResourceDefinition {
  id: string;
  organizationId?: string | null;
  name: string;
  slug: string;
  tableName: string;
  fields: FieldDefinition[];
  isSystem?: boolean;
  isPromoted?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface DynamicRecord {
  id: string;
  organizationId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  [key: string]: any;
}

export interface PromotionResult {
  resourceId: string;
  tableName: string;
  code: string;
  filePath: string;
  instructions: string;
}
