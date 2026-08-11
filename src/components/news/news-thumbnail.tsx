"use client";

import * as React from "react";
import { Landmark, LineChart, Newspaper, Building2, Banknote, Globe2, Smartphone, ShieldAlert } from "lucide-react";
import { useCategoryById } from "@/context/categories-context";
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
  /** RSS 수집/관리자 등록 기사에 실제 이미지가 있으면 우선 표시하고, 없거나
   *  로드에 실패하면(깨진 링크, 핫링크 차단 등) 아래 그라디언트+아이콘으로 되돌아간다. */
  imageUrl?: string | null;
  className?: string;
  size?: "sm" | "lg";
}

export function NewsThumbnail({ categoryId, gradient, imageUrl, className, size = "sm" }: NewsThumbnailProps) {
  const Icon = CATEGORY_ICON[categoryId] ?? Newspaper;
  const category = useCategoryById(categoryId);
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = !!imageUrl && !imageFailed;

  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden rounded-lg", className)}
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- 출처가 임의의 외부 도메인이라 next/image의 remotePatterns 화이트리스트를 미리 지정할 수 없다.
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Icon className={cn("text-white/25", size === "lg" ? "h-16 w-16" : "h-8 w-8")} strokeWidth={1.5} />
      )}
      {category && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {category.name}
        </span>
      )}
    </div>
  );
}
