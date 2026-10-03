import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getRepository } from "@/lib/data";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo admin", robots: { index: false, follow: false } };
export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const segments = (await params).path ?? [];
  if (segments.length > 2 || (segments[0] && !["inventory", "leads", "login"].includes(segments[0]))) notFound();
  return <AdminWorkspace staff={await getRepository().listStaff()} initialSection={segments[0] === "leads" ? "leads" : "inventory"} initialId={segments[1] ?? null} />;
}
