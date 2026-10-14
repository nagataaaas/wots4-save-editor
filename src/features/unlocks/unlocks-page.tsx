import { useMemo, useState } from "react";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
import { InfoTip } from "@/components/info-tip";
import { ItemInformation, OwnershipStateButton, UnlockStateButton } from "./unlock-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { UNLOCKS_ANCHORS } from "./anchors";
import { Input } from "@/components/ui/input";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatOffset } from "@/lib/format";
import { matchesSearch } from "@/lib/search";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteError } from "@/components/write-error";
import {
  ACCESSORIES,
  ACCESSORY_DLC_LABELS,
  ACCESSORY_PART_LABELS,
  CLOTHES,
  UNLOCKS,
  appearanceUnlockInformation,
  type UnlockEntry,
} from "@/save/master/accessory-names";
import {
  ACCESSORY_COUNT,
  ACCESSORY_FLAGS_OFFSET,
  APPEARANCE_BYTES,
  APPEARANCE_OFFSET,
  APPEARANCE_REWARDS,
  UNLOCK_COUNT,
  UNLOCK_STATE_LABELS,
  UNLOCK_STATES_OFFSET,
  appearanceBitPosition,
  isAppearanceBitSet,
  readAccessoryFlags,
  readAppearance,
  readUnlockStates,
  writeAccessoryFlag,
  writeAccessoryFlags,
  writeAppearanceBit,
  writeAppearanceBits,
  writeUnlockState,
  writeUnlockStates,
  type UnlockStatesView,
} from "@/save/unlocks";

/**
 * 読み取り専用・エラーの表示と、書き込み（未読み込みの案内は NoSaveNotice が出す）。
 * ボタンの書き込みは失敗を受け止めて error に入れるので、カードの中の操作の近くに出す
 */
function usePageState<T extends { problem: string | null; }>(read: (bytes: Uint8Array) => T) {
  const { view, error: readError, problem, readOnly } = useSaveView(read, { problem: (v) => v.problem });
  const { tryWrite: write, error } = useWrite();
  const banner = <PageBanner error={readError} problem={problem} />;
  return { view, readOnly, write, error, banner };
}

/** カードの見出しの下に出す、読み込んだ値の警告 */
function WarningLines({ warnings }: { warnings: readonly string[] | undefined }) {
  return warnings?.map((warning) => (
    <p key={warning} className="text-destructive text-xs">
      {warning}
    </p>
  ));
}

// ---------------------------------------------------------------- 装飾品

type AccessoryFilter = "all" | "owned" | "missing";

const ACCESSORY_FILTER_OPTIONS: FilterOption<AccessoryFilter>[] = [
  { value: "all", label: "すべての所有状態" },
  { value: "owned", label: "所持" },
  { value: "missing", label: "未所持" },
];
const ACCESSORY_PART_OPTIONS: FilterOption<string>[] = [
  { value: "all", label: "すべての部位" },
  ...Object.entries(ACCESSORY_PART_LABELS).map(([value, label]) => ({ value, label })),
];

export function AccessoriesPage() {
  const { advanced } = useAdvancedMode();
  const { view, readOnly, write, error, banner } = usePageState(readAccessoryFlags);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessoryFilter>("all");
  const [part, setPart] = useState("all");

  const rows = useMemo(
    () =>
      [...ACCESSORIES]
        .sort((a, b) => a.menuOrder - b.menuOrder)
        .filter((a) => matchesSearch(query, [a.ja, a.en, a.descJa]))
        .filter((a) => part === "all" || a.part === part)
        .filter((a) => {
          if (filter === "all" || !view) return true;
          return view.owned[a.id] === (filter === "owned");
        }),
    [query, filter, part, view],
  );
  const ownedCount = view ? view.owned.filter(Boolean).length : "—";

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <AnchoredCard
        anchor={UNLOCKS_ANCHORS.accessories}
        title="装飾品"
        extra={
          <InfoTip offset={`${formatOffset(ACCESSORY_FLAGS_OFFSET)}〜${formatOffset(ACCESSORY_FLAGS_OFFSET + ACCESSORY_COUNT - 1)}`}>
            {/* ✅ 書き換えが装飾品設定に反映されることを確認。並びがゲーム内の一覧の順なのは 🔶 */}
            書き換えは装飾品設定に反映されます
          </InfoTip>
        }
        description={
          <>
            持っている装飾品を切り替えられます（並びはゲーム内の一覧の順）。
            <br />
            所持 {ownedCount} / {ACCESSORY_COUNT}
          </>
        }
        headerExtra={<WarningLines warnings={view?.warnings} />}
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              placeholder="名前・説明で絞り込み"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {/* 所有状態はセーブで決まるので、未読み込みのときは無効にして絞り込まない */}
            <FilterSelect
              options={ACCESSORY_FILTER_OPTIONS}
              value={filter}
              onChange={setFilter}
              disabled={!view}
              className="w-44"
              aria-label="装飾品の所有状態"
            />
            <FilterSelect options={ACCESSORY_PART_OPTIONS} value={part} onChange={setPart} className="w-40" aria-label="装飾品の部位" />
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly || rows.length === 0}
              onClick={() => write((b) => writeAccessoryFlags(b, rows.map((a) => a.id), 1))}
            >
              表示中を全部所持
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly || rows.length === 0}
              onClick={() => write((b) => writeAccessoryFlags(b, rows.map((a) => a.id), 0))}
            >
              表示中を全部外す
            </Button>
          </div>
          <WriteError error={error} />
          <div className="flex flex-col divide-y">
            {rows.map((a) => {
              const known = view ? view.known[a.id] : true;
              return (
                <div key={a.id} className="flex items-center gap-3 py-1.5">
                  <OwnershipStateButton
                    owned={view ? view.owned[a.id] : null}
                    name={a.ja}
                    labels={["未所持", "所持"]}
                    disabled={readOnly || (!known && !advanced)}
                    onChange={(on) => write((b) => writeAccessoryFlag(b, a.id, on ? 1 : 0, { advanced }))}
                  />
                  <ItemInformation
                    name={a.ja}
                    category={ACCESSORY_PART_LABELS[a.part] ?? a.part}
                    description={a.descJa}
                    offset={ACCESSORY_FLAGS_OFFSET + a.id}
                    condition={a.shop ? "店で購入" : a.dlc !== null ? ACCESSORY_DLC_LABELS[a.dlc] : "特典解除"}
                  >
                      {a.dlc !== null && (
                        <Badge variant="outline" className="font-normal">
                          {ACCESSORY_DLC_LABELS[a.dlc] ?? "DLC"}
                        </Badge>
                      )}
                      {!a.shop && a.dlc === null && (
                        <Badge variant="outline" className="font-normal">
                          特典
                        </Badge>
                      )}
                  </ItemInformation>
                  {!known && <span className="text-destructive text-xs">状態不明</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </AnchoredCard>
      {/* 各装飾品の 1 B だけを書き換える（0＝なし、1＝所持）。❓ 2 以上の値の意味は未確認 */}
      <p className="text-muted-foreground text-xs">
        状態不明の装飾品は、上級者モードでだけ切り替えられます。
        「特典」は店で買えず、特典解除で手に入る物です。
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- 容姿

// 🔶 U-17: 顔・髪型などの特典は容姿の服のビットとは別の状態列を使う。
const APPEARANCE_UNLOCK_CATEGORIES = ["肌の色", "髪の色", "体型", "顔", "髪型", "服"] as const;

/** 種類の名前で絞り込む選択肢。先頭は絞り込まない「すべて」 */
const categoryOptions = (categories: readonly string[], allLabel = "すべての種別"): FilterOption<string>[] => [
  { value: "all", label: allLabel },
  ...categories.map((c) => ({ value: c, label: c })),
];

/**
 * 特典の状態の行。番号31は ✅ 解除前後の差分で対応を確認（書き込みは ❓ 要ゲーム内確認）、
 * 番号101（ライフルの免許）は ✅ 取得済みへの変更を確認。ほかは 🔶 U-17
 */
function UnlockStateRows({
  rows, view, readOnly, advanced, write, appearance = false,
}: {
  appearance?: boolean;
  rows: readonly UnlockEntry[];
  view: UnlockStatesView | null;
  readOnly: boolean;
  advanced: boolean;
  /** 失敗を受け止めて呼び出し側のカードに出す書き込み */
  write: (mutator: (bytes: Uint8Array) => void) => unknown;
}) {
  return (
    <div className="flex flex-col divide-y">
      {rows.map((u) => {
        const info = appearance ? appearanceUnlockInformation(u) : { ja: u.ja, en: u.en, descriptionJa: u.effectJa };

        return (
          <div key={u.id} className="flex flex-wrap items-center gap-3 py-1.5">
            <UnlockStateButton
              value={view ? view.values[u.id] : null}
              name={info.ja}
              disabled={readOnly || (view !== null && !view.known[u.id] && !advanced)}
              onChange={(v) => write((b) => writeUnlockState(b, u.id, v, { advanced }))}
            />
            <ItemInformation
              name={info.ja}
              category={u.category}
              description={info.descriptionJa}
              offset={UNLOCK_STATES_OFFSET + u.id}
              condition={u.conditionJa}
            />
          </div>
        );
      })}
    </div>
  );
}

function AppearanceUnlocksCard({ view, readOnly }: { view: UnlockStatesView | null; readOnly: boolean }) {
  const { advanced } = useAdvancedMode();
  const { tryWrite: write, error } = useWrite();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const rows = UNLOCKS.filter((u) => APPEARANCE_UNLOCK_CATEGORIES.some((c) => c === u.category))
    .filter((u) => category === "all" || u.category === category)
    .filter((u) => {
      const info = appearanceUnlockInformation(u);
      return matchesSearch(query, [info.ja, info.en, info.descriptionJa, u.ja, u.conditionJa]);
    });

  return (
    <>
      <AnchoredCard
        anchor={UNLOCKS_ANCHORS.faces}
        title="顔・髪型などの特典"
        extra={
          <InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)}〜${formatOffset(UNLOCK_STATES_OFFSET + UNLOCK_COUNT - 1)}`}>
            {/* 🔶 U-17：多くの番号の対応と書き込みの反映は要ゲーム内確認。J.J. の顔は ✅ 解除前後の差分で対応を確認（書き込みは ❓） */}
            顔・髪型・服・肌の色・髪の色・体型の特典は、特典解除の画面でも切り替えられます。
          </InfoTip>
        }
        description={
          <>
            主人公設定で選べる顔・髪型などの特典を解除できます。
            <br />
            クリックするたびに 非表示 → 未取得 → 取得済み の順に切り替わります。
          </>
        }
        headerExtra={<WarningLines warnings={view?.warnings} />}
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="顔・髪型・名前で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterSelect
              options={categoryOptions(APPEARANCE_UNLOCK_CATEGORIES)}
              value={category}
              onChange={setCategory}
              className="w-40"
              aria-label="特典の種別"
            />
          </div>
          <WriteError error={error} />
          <UnlockStateRows rows={rows} view={view} readOnly={readOnly} advanced={advanced} write={write} appearance />
        </CardContent>
      </AnchoredCard>
    </>
  );
}

type ClothFilter = "all" | "on" | "off";

const CLOTH_FILTER_OPTIONS: FilterOption<ClothFilter>[] = [
  { value: "all", label: "すべての所有状態" },
  { value: "on", label: "解放済み" },
  { value: "off", label: "未解放" },
];

export function AppearancePage() {
  // 服と顔・髪型などの特典は別の領域なので別々に読み、片方が読めなくてももう片方は編集できるようにする
  const clothes = useSaveView(readAppearance, { problem: (v) => v.problem });
  const unlocks = useSaveView(readUnlockStates, { problem: (v) => v.problem });
  const { view, readOnly } = clothes;
  const { tryWrite: write, error } = useWrite();
  // 同じ理由（ファイルが短い・サイズが違うなど）で両方が落ちたときは1つにまとめて出す
  const joined = (a: string | null, b: string | null) => [...new Set([a, b].filter((x) => x !== null))].join(" ／ ") || null;
  const banner = <PageBanner error={joined(clothes.error, unlocks.error)} problem={joined(clothes.problem, unlocks.problem)} />;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState<ClothFilter>("all");
  const categories = useMemo(() => [...new Set(CLOTHES.flatMap((c) => c.category.split("・")))], []);

  const rows = CLOTHES.filter((c) => category === "all" || c.category.split("・").includes(category))
    .filter((c) => matchesSearch(query, [c.ja, c.en, c.descJa]))
    .filter((c) => {
      if (filter === "all" || !view) return true;
      return isAppearanceBitSet(view, c.id) === (filter === "on");
    });
  const onCount = view ? CLOTHES.filter((c) => isAppearanceBitSet(view, c.id)).length : "—";

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <AppearanceUnlocksCard view={unlocks.view} readOnly={unlocks.readOnly} />
      <AnchoredCard
        anchor={UNLOCKS_ANCHORS.clothes}
        title="容姿の服"
        // 服の番号ごとに1ビット（番号 n は APPEARANCE_OFFSET + n/8 の bit n%8）。番号32〜46・238は ✅ ゲーム内で書き換えを確認、ほかは 🟢
        extra={<InfoTip offset={`${formatOffset(APPEARANCE_OFFSET)}〜${formatOffset(APPEARANCE_OFFSET + APPEARANCE_BYTES - 1)}`} />}
        description={
          <>
            容姿設定で選べる服を解放できます。
            <br />
            解放 {onCount} / {CLOTHES.length}
          </>
        }
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="名前・説明で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterSelect
              options={categoryOptions(categories, "すべての部位")}
              value={category}
              onChange={setCategory}
              className="w-40"
              aria-label="服の部位"
            />
            {/* 解放の状態はセーブで決まるので、未読み込みのときは無効にして絞り込まない */}
            <FilterSelect
              options={CLOTH_FILTER_OPTIONS}
              value={filter}
              onChange={setFilter}
              disabled={!view}
              className="w-44"
              aria-label="服の所有状態"
            />
            <Button variant="outline" size="sm" disabled={readOnly || rows.length === 0} onClick={() => write((b) => writeAppearanceBits(b, rows.map((c) => c.id), true))}>
              表示中を全部解放
            </Button>
            <Button variant="outline" size="sm" disabled={readOnly || rows.length === 0} onClick={() => write((b) => writeAppearanceBits(b, rows.map((c) => c.id), false))}>
              表示中を全部消す
            </Button>
          </div>
          <WriteError error={error} />
          <div className="flex flex-col divide-y">
            {rows.map((c) => {
              const { offset } = appearanceBitPosition(c.id); // ビット位置（bit 番号）は画面に出さない
              return (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <OwnershipStateButton
                    owned={view ? isAppearanceBitSet(view, c.id) : null}
                    name={c.ja}
                    labels={["未解放", "解放済み"]}
                    disabled={readOnly}
                    onChange={(on) => write((b) => writeAppearanceBit(b, c.id, on))}
                  />
                  <ItemInformation
                    name={c.ja}
                    category={c.category}
                    description={c.descJa || "説明なし"}
                    offset={offset}
                    condition={APPEARANCE_REWARDS[c.id]}
                  >
                    {c.dlc !== null && (
                      <Badge variant="outline" className="font-normal">
                        {ACCESSORY_DLC_LABELS[c.dlc] ?? "DLC"}
                      </Badge>
                    )}
                  </ItemInformation>
                </div>
              );
            })}
          </div>
        </CardContent>
      </AnchoredCard>
      {/* 各服のビットだけを書き換える（同じバイトのほかのビットは変えない）。服のない番号（47 など）のビットは扱わない */}
    </div>
  );
}

// ---------------------------------------------------------------- 特典解除

export function UnlocksPage() {
  const { advanced } = useAdvancedMode();
  const { view, readOnly, write, error, banner } = usePageState(readUnlockStates);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => [...new Set(UNLOCKS.map((u) => u.category))], []);

  const rows = UNLOCKS.filter((u) => category === "all" || u.category === category).filter((u) =>
    matchesSearch(query, [u.ja, u.en, u.conditionJa, u.effectJa]),
  );
  const ids = rows.map((u) => u.id);

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <AnchoredCard
        anchor={UNLOCKS_ANCHORS.unlocks}
        title="特典解除"
        // 0＝非表示、1＝表示中・未取得、2＝取得済み。
        // 先頭16件と J.J. の顔は ✅ ゲーム内の状態と照合、ライフルの免許は ✅ 2 への変更の反映を確認。ほかは 🔶 U-17（書き込みは要ゲーム内確認）
        extra={<InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)}〜${formatOffset(UNLOCK_STATES_OFFSET + UNLOCK_COUNT - 1)}`} />}
        description={
          <>
            ゲームの特典を解除できます。
            <br />
            全部を解除すると Steam の実績が取れることがあります（取れた実績は戻せません）。
            {/* 実績の例：すべての容姿設定を解除 */}
          </>
        }
        headerExtra={<WarningLines warnings={view?.warnings} />}
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="名前・条件で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterSelect options={categoryOptions(categories)} value={category} onChange={setCategory} className="w-40" aria-label="特典の種別" />
            {([0, 1, 2] as const).map((v) => (
              <Button key={v} variant="outline" size="sm" disabled={readOnly || ids.length === 0} onClick={() => write((b) => writeUnlockStates(b, ids, v))}>
                表示中を{UNLOCK_STATE_LABELS[v]}にする
              </Button>
            ))}
          </div>
          <WriteError error={error} />
          <UnlockStateRows rows={rows} view={view} readOnly={readOnly} advanced={advanced} write={write} />
        </CardContent>
      </AnchoredCard>
      {/* 各特典の 1 B だけを書き換える。値は 0〜2 の範囲。
          ❓ ライフルの免許以外の書き込み後の反映は要ゲーム内確認。装飾品の所持フラグと連動するかは ❓ */}
      <p className="text-muted-foreground text-xs">
        装飾品の特典を取得済みにしても、装飾品の所持は変わりません。所持は「装飾品」の画面で切り替えます。
      </p>
    </div>
  );
}
