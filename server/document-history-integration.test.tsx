// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { trpcMock } = vi.hoisted(() => {
  const quotation = { id: 1, number: "ORC-001", clientId: 7, total: "150.00", status: "rascunho", createdAt: new Date("2026-01-01"), validUntil: null };
  const invoice = { id: 2, number: "FAT-002", clientId: 7, total: 150, status: "pago", dueDate: null };
  const version = { id: 11, versionNumber: 1, createdAt: new Date("2026-01-02"), changeReason: "Criação", data: { number: "ORC-001", total: "150.00", items: [{ description: "Item real" }] } };
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    trpcMock: {
      useUtils: () => ({
        quotations: { list: { invalidate: vi.fn() }, versions: { invalidate: vi.fn() } },
        invoices: { list: { invalidate: vi.fn() }, versions: { invalidate: vi.fn() } },
      }),
      quotations: {
        list: { useQuery: vi.fn(() => ({ data: [quotation], isLoading: false })) },
        versions: { useQuery: vi.fn(() => ({ data: [version], isLoading: false })) },
        updateStatus: { useMutation: vi.fn(mutation) },
        delete: { useMutation: vi.fn(mutation) },
        duplicate: { useMutation: vi.fn(mutation) },
        convertToInvoice: { useMutation: vi.fn(mutation) },
      },
      invoices: {
        list: { useQuery: vi.fn(() => ({ data: [invoice], isLoading: false })) },
        versions: { useQuery: vi.fn(() => ({ data: [version], isLoading: false })) },
        duplicate: { useMutation: vi.fn(mutation) },
      },
      customers: { list: { useQuery: vi.fn(() => ({ data: [{ id: 7, name: "Cliente real", email: "cliente@real.test" }], isLoading: false })) } },
    },
  };
});

vi.mock("@/lib/trpc", () => ({ trpc: trpcMock }));
vi.mock("@/contexts/CompanyContext", () => ({ useCompany: () => ({ activeCompany: { id: 42, name: "Empresa real" } }) }));
vi.mock("@/components/AppLayout", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("wouter", () => ({ useLocation: () => ["/documents", vi.fn()] }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}));

import Quotations from "../client/src/pages/Quotations";
import Invoices from "../client/src/pages/Invoices";

afterEach(() => cleanup());

describe("Histórico de versões nas telas", () => {
  it("abre o histórico de orçamento e mostra o snapshot sem controles de edição", () => {
    render(<Quotations />);
    fireEvent.click(screen.getByRole("button", { name: "Ações do orçamento ORC-001" }));
    fireEvent.click(screen.getByRole("button", { name: /Ver histórico/i }));
    expect(screen.getByRole("heading", { name: "Histórico de versões" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ver snapshot"));
    const dialog = screen.getByTestId("dialog");
    expect(within(dialog).getByText(/\"number\": \"ORC-001\"/)).toBeInTheDocument();
    expect(within(dialog).getByText(/\"total\": \"150\.00\"/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("abre o histórico de fatura e mostra o snapshot sem controles de edição", () => {
    render(<Invoices />);
    fireEvent.click(screen.getByRole("button", { name: "Ver histórico da fatura FAT-002" }));
    expect(screen.getByRole("heading", { name: "Histórico de versões da fatura" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ver snapshot"));
    const dialog = screen.getByTestId("dialog");
    expect(within(dialog).getByText(/\"number\": \"ORC-001\"/)).toBeInTheDocument();
    expect(within(dialog).getByText(/\"total\": \"150\.00\"/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
  });
});
