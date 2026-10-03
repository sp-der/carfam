"use client";
import { useState } from "react";
import { PaymentEstimator } from "@/components/vehicle-detail/payment-estimator";

export function FinanceCalculator({ vehicles }: { vehicles: { id: string; title: string; price: number; disclosure: string }[] }) {
  const [id, setId] = useState(vehicles[0]?.id ?? "");
  const vehicle = vehicles.find((v) => v.id === id);
  if (!vehicle) return null;
  return <section className="mt-12 space-y-5"><h2 className="font-display text-3xl">Explore an illustrative payment</h2><label className="form-label max-w-xl">Choose a demo inventory vehicle<select value={id} onChange={(e) => setId(e.target.value)}>{vehicles.map((v) => <option value={v.id} key={v.id}>{v.title}</option>)}</select></label><PaymentEstimator key={id} salePriceCents={vehicle.price} disclosure={vehicle.disclosure} /></section>;
}
