import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";

const BADGE_CLASS: Record<string, string> = {
  "cat-1": "bg-cat-1/12 text-cat-1",
  "cat-2": "bg-cat-2/12 text-cat-2",
  "cat-3": "bg-cat-3/12 text-cat-3",
  "cat-4": "bg-cat-4/12 text-cat-4",
  "cat-5": "bg-cat-5/12 text-cat-5",
  "cat-6": "bg-cat-6/12 text-cat-6",
  "cat-7": "bg-cat-7/12 text-cat-7",
  "cat-8": "bg-cat-8/12 text-cat-8",
};

export function CategoryBadge({ categoryId, className }: { categoryId: string; className?: string }) {
  const category = getCategoryById(categoryId);
  if (!category) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
        BADGE_CLASS[category.colorVar],
        className
      )}
    >
      {category.name}
    </span>
  );
}
