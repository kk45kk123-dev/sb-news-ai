import { Landmark, LineChart, Newspaper, Building2, Banknote, Globe2, Smartphone, ShieldAlert } from "lucide-react";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<string, typeof Newspaper> = {
  c1: Landmark,
  c2: Banknote,
  c3: Building2,
  c4: Building2,
  c5: LineChart,
  c6: Globe2,
  c7: Smartphone,
  c8: ShieldAlert,
};

interface NewsThumbnailProps {
  categoryId: string;
  gradient: [string, string];
  className?: string;
  size?: "sm" | "lg";
}

export function NewsThumbnail({ categoryId, gradient, className, size = "sm" }: NewsThumbnailProps) {
  const Icon = CATEGORY_ICON[categoryId] ?? Newspaper;
  const category = getCategoryById(categoryId);

  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden rounded-lg", className)}
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      <Icon className={cn("text-white/25", size === "lg" ? "h-16 w-16" : "h-8 w-8")} strokeWidth={1.5} />
      {category && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {category.name}
        </span>
      )}
    </div>
  );
}
