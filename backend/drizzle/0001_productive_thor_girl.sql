CREATE TABLE "dynamic_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dynamic_entities" ADD CONSTRAINT "dynamic_entities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_entities" ADD CONSTRAINT "dynamic_entities_resource_id_resource_definitions_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_resource_entity_idx" ON "dynamic_entities" USING btree ("organization_id","resource_id");