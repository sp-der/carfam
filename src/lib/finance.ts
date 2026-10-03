/** Captured Finance menu paths. Provider integrations remain disabled in demo mode. */
export const FINANCE_LINKS = [
  { label: "Finance Department", href: "/finance-your-car", description: "Explore your options and estimate a payment." },
  { label: "Apply For Financing", href: "/finance-your-car/pre-approved", description: "Preview the dealer financing process in English." },
  { label: "Solicitar Financiación", href: "/solicitar-financiacion", description: "Conoce el proceso de financiación en español." },
  { label: "Get Pre Qualified With Capital One", href: "/capital-one-pre-qualify-then-shop", description: "Explore the separate Capital One experience." },
  { label: "Bad Credit Financing", href: "/bad-credit-financing-in-bloomington-ca", description: "Start a conversation about your situation." },
] as const;

export function isFinanceRoute(route: string) {
  return FINANCE_LINKS.some((item) => item.href === route);
}
export type FinanceVehicle = { id: string; title: string; price: number; disclosure: string };

/** Educational outline, not an implementation of uninspected lender fields. */
export const APPLICATION_STEPS = {
  en: [
    { title: "Personal information", body: "A provider application begins with contact and identity information. This walkthrough has no personal-information fields." },
    { title: "Address information", body: "The provider has a separate address step. Your address is not requested or stored in this demo." },
    { title: "Income information", body: "The provider has a separate income step. Do not enter income, banking details or documents here." },
    { title: "Vehicle information", body: "Explore a vehicle from our demo inventory. Selecting one here does not reserve it or submit an application." },
    { title: "Review", body: "A live provider would present its own review and authorization process. This preview cannot authorize a credit check or request financing." },
  ],
  es: [
    { title: "Información personal", body: "Una solicitud del proveedor comienza con datos de contacto e identidad. Este recorrido no tiene campos de información personal." },
    { title: "Información de domicilio", body: "El proveedor tiene un paso para el domicilio. Esta demostración no solicita ni guarda tu dirección." },
    { title: "Información de ingresos", body: "El proveedor tiene un paso para los ingresos. No ingreses ingresos, datos bancarios ni documentos aquí." },
    { title: "Información del vehículo", body: "Explora un vehículo del inventario de demostración. Seleccionarlo no lo reserva ni envía una solicitud." },
    { title: "Revisión", body: "El proveedor presenta su propio proceso de revisión y autorización. Este recorrido no autoriza consultas de crédito ni solicita financiación." },
  ],
} as const;
