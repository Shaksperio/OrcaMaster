import React, { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface Company {
  id: number;
  userId: number;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  logoUrl: string | null;
  logoStorageKey: string | null;
  currency: string;
  language: string;
  taxRegime: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyContextType {
  activeCompany: Company | null;
  setActiveCompany: (company: Company | null) => void;
  companies: Company[];
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const { data: companies = [], isLoading } = trpc.company.list.useQuery();

  // Set first company as active on load
  useEffect(() => {
    if (companies.length > 0 && !activeCompany) {
      setActiveCompany(companies[0]);
    }
  }, [companies, activeCompany]);

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, companies, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}
