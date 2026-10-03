import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DynamicData } from "../pages/DynamicData.js";

const mockResources = [
  {
    id: "res-1",
    name: "Customer",
    slug: "customers",
    fields: [
      { name: "company", type: "text", required: true },
      { name: "arr", type: "number", required: false },
      { name: "active", type: "boolean", required: false },
    ],
  },
];

const mockRecords = [
  {
    id: "rec-1",
    company: "Stripe",
    arr: 120000,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

describe("Dynamic Data Explorer Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dynamic table with columns from resource definition", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/resources")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockResources),
        });
      }
      if (url.includes("/api/v1/data/customers")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ data: mockRecords }),
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });

    render(
      <MemoryRouter initialEntries={["/data/customers"]}>
        <Routes>
          <Route path="/data/:resourceSlug" element={<DynamicData />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("company")).toBeInTheDocument();
      expect(screen.getByText("arr")).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText("Stripe")).toBeInTheDocument();
      expect(screen.getByText("120000")).toBeInTheDocument();
      expect(screen.getByText("TRUE")).toBeInTheDocument();
    });
  });

  it("opens create modal with schema-driven form inputs", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/resources")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockResources),
        });
      }
      if (url.includes("/api/v1/data/customers")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ data: mockRecords }),
        });
      }
      return Promise.reject(new Error("Unknown"));
    });

    render(
      <MemoryRouter initialEntries={["/data/customers"]}>
        <Routes>
          <Route path="/data/:resourceSlug" element={<DynamicData />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Stripe")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /create customer/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole("heading", { name: /create customer/i })).toBeInTheDocument();
    expect(screen.getByText(/Enabled \/ Active/i)).toBeInTheDocument();
  });
});
