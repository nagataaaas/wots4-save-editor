import { AnchoredSection } from "@/components/anchored-section";
import { FlagGrid } from "@/components/flag-row";
import { type ByteFlag } from "@/save/flags/byte-flag";

/** カードの中の見出しつきのまとまり。flags は src/save/flags/ の配列1つ。anchor はリンク先にするときの名前（useAnchor） */
export function FlagSection({ anchor, title, flags }: { anchor: string; title: string; flags: readonly ByteFlag[] }) {
  return (
    <AnchoredSection anchor={anchor} title={title}>
      <FlagGrid flags={flags} />
    </AnchoredSection>
  );
}
