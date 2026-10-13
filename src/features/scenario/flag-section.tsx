import { AnchorScope, useAnchor } from "@/lib/navigation-context";
import { SearchPath } from "@/lib/search-context";
import { useSearchBox } from "@/lib/search-hooks";
import { AnchorLink } from "@/components/anchor-link";
import { FlagGrid } from "@/components/flag-row";
import { type ByteFlag } from "@/save/flags/byte-flag";

/** カードの中の見出しつきのまとまり。flags は src/save/flags/ の配列1つ。anchor はリンク先にするときの名前（useAnchor） */
export function FlagSection({ anchor, title, flags }: { anchor: string; title: string; flags: readonly ByteFlag[] }) {
  const { id, ref } = useAnchor(anchor);
  useSearchBox(id, title);
  return (
    <section ref={ref} id={id} className="flex scroll-mt-4 flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <AnchorLink id={id} />
        {title}
      </h3>
      <AnchorScope.Provider value={id}>
        <SearchPath label={title}>
          <FlagGrid flags={flags} />
        </SearchPath>
      </AnchorScope.Provider>
    </section>
  );
}
