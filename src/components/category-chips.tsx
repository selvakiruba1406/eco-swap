import { CATEGORIES, type Category } from "@/lib/marketplace";

type Props = {
  value: Category | "all";
  onChange: (v: Category | "all") => void;
};

export function CategoryChips({ value, onChange }: Props) {
  const all = [{ value: "all" as const, label: "All Gear" }, ...CATEGORIES];
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={
              active
                ? "px-4 py-1.5 rounded-full bg-brand text-brand-foreground text-sm font-medium"
                : "px-4 py-1.5 rounded-full bg-card ring-1 ring-black/5 text-muted-foreground text-sm font-medium hover:bg-secondary"
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
