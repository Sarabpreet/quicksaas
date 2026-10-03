import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Resources } from "../pages/Resources.js";

const mockResources = [
  {
    id: "res-123",
    name: "Customer",
    slug: "customers",
    description: "Enterprise CRM clients",
    isPublished: true,
    fields: [
      { name: "company", type: "text", required: true },
      { name: "arr", type: "number", required: false },
    ],
    createdAt: new Date().toISOString(),
  },
];

describe("API Studio (Resources) Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists existing dynamic resource definitions", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/resources")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockResources),
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });

    render(
      <BrowserRouter>
        <Resources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("/api/v1/data/customers")).toBeInTheDocument();
      expect(screen.getByText("Enterprise CRM clients")).toBeInTheDocument();
      expect(screen.getByText(/company/i)).toBeInTheDocument();
      expect(screen.getByText(/arr/i)).toBeInTheDocument();
    });
  });

  it("opens create modal and adds field definition row", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(mockResources),
    });

    render(
      <BrowserRouter>
        <Resources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Customer")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /new dynamic resource/i });
    fireEvent.click(createBtn);

    expect(screen.getByText("Define New Dynamic Resource")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Customer, Invoice, Project/i)).toBeInTheDocument();

    const addFieldBtn = screen.getByRole("button", { name: /add field/i });
    fireEvent.click(addFieldBtn);

    const fieldInputs = screen.getAllByPlaceholderText("field_name");
    expect(fieldInputs.length).toBe(2);
  });

  it("clicking promote opens modal with generated Drizzle schema", async () => {
    const mockPromoteData = {
      message: "Resource 'Customer' code blueprint generated",
      resource: "Customer",
      slug: "customers",
      destinationHint: "src/modules/customers/customers.schema.ts",
      generatedSchema: `export const customers = pgTable("customers", { id: uuid("id").primaryKey() });`,
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/promote")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockPromoteData),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockResources),
      });
    });

    render(
      <BrowserRouter>
        <Resources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Customer")).toBeInTheDocument();
    });

    const promoteBtn = screen.getByRole("button", { name: /promote/i });
    fireEvent.click(promoteBtn);

    await waitFor(() => {
      expect(screen.getByText("Promote Resource: Customer")).toBeInTheDocument();
      expect(screen.getByText(/src\/modules\/customers\/customers.schema.ts/i)).toBeInTheDocument();
      expect(screen.getByText(/export const customers = pgTable/i)).toBeInTheDocument();
    });
  });
});
