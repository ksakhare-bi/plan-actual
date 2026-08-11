import type { Report } from './report';

export interface CategoryDto {
  id: string;
  name: string;
}

export interface PlanDto {
  id: string;
  month: string;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  locked: boolean;
}

export interface ActualDto {
  id: string;
  month: string;
  amountCents: number;
  note: string | null;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  locked: boolean;
}

export interface ReportDto extends Report {
  conventions: Record<string, unknown>;
}

export interface DrilldownDto {
  month: string;
  category: CategoryDto;
  locked: boolean;
  plan: { id: string; amountCents: number } | null;
  entries: { id: string; amountCents: number; note: string | null; createdAt: string }[];
  totalCents: number;
}
