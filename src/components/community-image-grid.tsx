"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const CommunityImageLightbox = dynamic(
  () => import("./community-image-lightbox").then((m) => m.CommunityImageLightbox),
  { ssr: false }
);

export function CommunityImageGrid({
  urls,
  alt = "Image attachment",
  className,
}: {
  urls: string[];
  alt?: string;
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const validUrls = urls.filter((u) => u.length > 0);
  if (validUrls.length === 0) return null;

  const layoutClass =
    validUrls.length === 1
      ? "grid-cols-1"
      : validUrls.length === 2
        ? "grid-cols-2"
        : validUrls.length === 3
          ? "grid-cols-2 [&>*:first-child]:row-span-2"
          : "grid-cols-2";

  return (
    <>
      <div
        className={cn(
          "grid gap-1.5 overflow-hidden rounded-xl",
          layoutClass,
          className
        )}
      >
        {validUrls.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative block aspect-square w-full overflow-hidden bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <CommunityImageLightbox
          urls={validUrls}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
