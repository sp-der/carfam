"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATION_STEPS, type FinanceVehicle } from "@/lib/finance";

export function ApplicationPreview({ spanish = false, vehicles }: { spanish?: boolean; vehicles: FinanceVehicle[] }) {
  const steps = APPLICATION_STEPS[spanish ? "es" : "en"];
  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState("");
  const [complete, setComplete] = useState(false);
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  return <section className="rounded-2xl border border-line bg-paper p-5 sm:p-8" lang={spanish ? "es" : "en"} aria-label={spanish ? "Recorrido de demostración" : "Application walkthrough"}>
    <p className="text-xs font-bold uppercase tracking-widest text-cyan-ink">{spanish ? "Recorrido interactivo · solo demostración" : "Interactive walkthrough · demo only"}</p>
    <h2 className="font-display mt-3 text-2xl sm:text-3xl">{spanish ? "Conoce el proceso, paso a paso." : "Know what comes next."}</h2>
    <p className="mt-3 text-sm leading-relaxed text-slate">{spanish ? "El formulario de RouteOne no está conectado. No solicitamos datos personales ni enviamos solicitudes a un prestamista." : "The RouteOne form is not connected. We collect no personal information and send no applications to a lender."}</p>
    <ol className="my-7 grid grid-cols-5 gap-2" aria-label={spanish ? "Pasos" : "Application steps"}>{steps.map((item, index) => <li key={item.title} aria-current={!complete && index === step ? "step" : undefined} className={`border-t-4 pt-3 text-xs ${index <= step ? "border-cyan text-ink" : "border-line text-slate"}`}><span className="block font-bold">0{index + 1}</span><span className="mt-1 hidden sm:block">{item.title}</span></li>)}</ol>
    <div className="min-h-56 rounded-xl bg-mist p-5 sm:p-7" aria-live="polite" aria-atomic="true">
      <h3 className="font-display text-2xl">{complete ? (spanish ? "Recorrido completado" : "Walkthrough complete") : steps[step].title}</h3>
      <p className="mt-3 leading-relaxed text-slate">{complete ? (spanish ? "No se envió nada. No se realizó una consulta de crédito ni se emitió una aprobación. Habla con Carfam para conocer los siguientes pasos reales." : "Nothing was sent. No credit check was performed and no approval was issued. Talk with Carfam about your real next steps.") : steps[step].body}</p>
      {!complete && step === 3 && <label className="form-label mt-5">{spanish ? "Vehículo de demostración (opcional)" : "Demo vehicle (optional)"}<select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">{spanish ? "Todavía estoy buscando" : "I'm still shopping"}</option>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      {(complete || step === 4) && <p className="mt-5 border-t border-line pt-4 text-sm"><strong>{spanish ? "Vehículo: " : "Vehicle: "}</strong>{vehicle?.title ?? (spanish ? "Todavía estoy buscando" : "Still shopping")}</p>}
      {complete && <Link href="/pre-owned-cars" className="mt-5 inline-flex font-bold text-cyan-ink underline">{spanish ? "Explorar vehículos" : "Browse vehicles"} →</Link>}
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <button type="button" className="button-secondary" disabled={!complete && step === 0} onClick={() => { if (complete) { setComplete(false); setStep(0); } else setStep(step - 1); }}>{complete ? (spanish ? "Volver a comenzar" : "Start again") : (spanish ? "Anterior" : "Back")}</button>
      {!complete && <button type="button" className="button" onClick={() => { if (step === steps.length - 1) setComplete(true); else setStep(step + 1); }}>{step === steps.length - 1 ? (spanish ? "Terminar demostración" : "Finish walkthrough") : (spanish ? "Siguiente" : "Next step")} →</button>}
    </div>
  </section>;
}
