import type { ReactNode } from "react";
import { AnchorScope, useAnchor } from "@/lib/navigation-context";
import { SearchPath } from "@/lib/search-context";
import { useSearchBox } from "@/lib/search-hooks";
import { AnchorLink } from "@/components/anchor-link";
import { cn } from "@/lib/utils";

/**
 * カードの中の見出しつきのまとまり。anchor はリンク先にするときの名前（useAnchor）。
 * 見出しを検索の箱にし、中の欄はこのまとまりの下に登録する
 */
export function AnchoredSection({
  anchor,
  title,
  className,
  children,
}: {
  anchor: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const { id, ref } = useAnchor(anchor);
  useSearchBox(id, title);
  return (
    <section ref={ref} id={id} className={cn("flex scroll-mt-4 flex-col gap-3", className)}>
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <AnchorLink id={id} />
        {title}
      </h3>
      <AnchorScope.Provider value={id}>
        <SearchPath label={title}>{children}</SearchPath>
      </AnchorScope.Provider>
    </section>
  );
}
