import Link from "next/link";
import type { VehicleCard as Card } from "@/lib/inventory/public";
import { BODY_TYPE_LABELS, DRIVETRAINS, type Drivetrain } from "@/lib/inventory/types";
import { CompareButton, SaveButton } from "@/components/shopping/shopping-buttons";
import { VehicleImage } from "./vehicle-image";

const DRIVE_SHORT: Record<Drivetrain, string> = { fwd: "FWD", rwd: "RWD", awd: "AWD", "4wd": "4WD" };

export function formatMiles(miles: number): string {
  // Non-breaking space keeps the number and unit together.
  return `${miles.toLocaleString("en-US")} mi`;
}

/**
 * Inventory card: one pricing source (`toVehicleCard`), labeled with what the sale price includes.
 * Badges are data-driven only (pending status, missing photos). No payments, no history badges.
 */
export function VehicleCard({
  card,
  priority = false,
  headingLevel = 3,
  showCompare = true,
}: {
  card: Card;
  priority?: boolean;
  headingLevel?: 2 | 3;
  showCompare?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const name = `${card.year} ${card.make} ${card.model}`;
  const facts = [
    formatMiles(card.mileage),
    card.bodyType ? BODY_TYPE_LABELS[card.bodyType] : null,
    card.drivetrain && DRIVETRAINS.includes(card.drivetrain) ? DRIVE_SHORT[card.drivetrain] : null,
  ].filter(Boolean);

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-[3px] bg-mist">
        <VehicleImage
          image={card.image}
          title={card.title}
          priority={priority}
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 45vw, 100vw"
          className="transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
        {card.status === "pending" ? (
          <span className="absolute left-2 top-2 rounded-sm bg-amber-bg px-2 py-1 text-xs font-bold text-amber">
            Sale pending
          </span>
        ) : null}
        <div className="absolute right-2 top-2 z-10">
          <SaveButton routeId={card.routeId} title={card.title} />
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <Heading className="text-lg leading-snug font-bold text-balance">
          <Link
            href={card.href}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-cyan-ink focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-4 focus-visible:after:outline-cyan-ink"
          >
            {name}
            {card.trim ? <span className="font-medium text-slate"> {card.trim}</span> : null}
          </Link>
        </Heading>
        <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-slate tabular">
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate">Sale price</p>
            <p className="font-display text-2xl leading-none tabular">{card.salePriceLabel}</p>
            <p className="mt-1.5 text-xs text-slate">
              {card.internetPriceLabel} internet price. {card.feeSummary}.
            </p>
          </div>
          {showCompare ? (
            <div className="relative z-10 shrink-0">
              <CompareButton routeId={card.routeId} title={card.title} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
