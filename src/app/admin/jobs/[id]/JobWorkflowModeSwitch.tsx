"use client";

import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import JobWorkflowClient from "./JobWorkflowClient";
import StorefrontJobWorkflow from "./StorefrontJobWorkflow";

type MenuItem = { menu_item_id?: string; name: string; price: number };

type Reservation = {
  id: string;
  title: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  estimated_amount: number | null;
  note: string | null;
  menu_items_json: MenuItem[] | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
} | null;

type Vehicle = {
  id: string;
  maker: string | null;
  model: string | null;
  year: number | null;
  plate_display: string | null;
  vin: string | null;
} | null;

type Certificate = {
  public_id: string;
  status: string;
  created_at: string;
  service_price: number | null;
  customer_name: string | null;
};

type Document = {
  id: string;
  doc_number: string | null;
  doc_type: string;
  status: string;
  total: number | null;
  issued_at: string | null;
  due_date: string | null;
};

interface Props {
  reservation: Reservation;
  customer: Customer;
  vehicle: Vehicle;
  certificates: Certificate[];
  documents: Document[];
}

/**
 * JobWorkflowModeSwitch
 * ------------------------------------------------------------
 * /admin/jobs/[id] のモード切替ラッパー。
 * - storefront: 大ボタン + 次アクション中心のシンプルな 1 画面
 * - admin: タブ構成・関連ドキュメント一覧等の詳細ビュー
 */
export default function JobWorkflowModeSwitch(props: Props) {
  const { mode, hydrated } = useViewMode();

  if (!hydrated || mode === "admin") {
    return <JobWorkflowClient {...props} />;
  }
  return <StorefrontJobWorkflow {...props} />;
}
