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
  categoryLabel,
  type UnlockEntry,
} from "@/save/master/accessory-names";
import { tr, type Localized } from "@/lib/i18n";
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
  const { view, error: readError, problem, readOnly } = useSaveView(read);
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

const ALL_OWNERSHIP = { ja: "すべての所有状態", en: "Any ownership" };
const ALL_PARTS = { ja: "すべての部位", en: "All body parts" };
const OWNED_LABELS: readonly [Localized, Localized] = [
  { ja: "未所持", en: "Not owned" },
  { ja: "所持", en: "Owned" },
];
const UNLOCKED_LABELS: readonly [Localized, Localized] = [
  { ja: "未解放", en: "Locked" },
  { ja: "解放済み", en: "Unlocked" },
];
const NAME_DESC_PLACEHOLDER = { ja: "名前・説明で絞り込み", en: "Filter by name or description" };

const accessoryFilterOptions = (): FilterOption<AccessoryFilter>[] => [
  { value: "all", label: tr(ALL_OWNERSHIP) },
  { value: "owned", label: tr(OWNED_LABELS[1]) },
  { value: "missing", label: tr(OWNED_LABELS[0]) },
];
const accessoryPartOptions = (): FilterOption<string>[] => [
  { value: "all", label: tr(ALL_PARTS) },
  ...Object.entries(ACCESSORY_PART_LABELS).map(([value, label]) => ({ value, label: tr(label) })),
];
const dlcLabel = (dlc: number) => {
  const label = ACCESSORY_DLC_LABELS[dlc];
  return label ? tr(label) : "DLC";
};

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
        .filter((a) => matchesSearch(query, [a.ja, a.en, a.descJa, a.descEn]))
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
        title={tr({ ja: "装飾品", en: "Accessories" })}
        extra={
          <InfoTip offset={`${formatOffset(ACCESSORY_FLAGS_OFFSET)}〜${formatOffset(ACCESSORY_FLAGS_OFFSET + ACCESSORY_COUNT - 1)}`}>
            {/* ✅ 書き換えが装飾品設定に反映されることを確認。並びがゲーム内の一覧の順なのは 🔶 */}
            {tr({ ja: "書き換えは装飾品設定に反映されます", en: "Changes show up in the in-game Accessories settings" })}
          </InfoTip>
        }
        description={
          <>
            {tr({
              ja: "持っている装飾品を切り替えられます（並びはゲーム内の一覧の順）。",
              en: "Toggle which accessories you own (listed in the in-game order).",
            })}
            <br />
            {tr({ ja: `所持 ${ownedCount} / ${ACCESSORY_COUNT}`, en: `Owned ${ownedCount} / ${ACCESSORY_COUNT}` })}
          </>
        }
        headerExtra={<WarningLines warnings={view?.warnings} />}
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              placeholder={tr(NAME_DESC_PLACEHOLDER)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {/* 所有状態はセーブで決まるので、未読み込みのときは無効にして絞り込まない */}
            <FilterSelect
              options={accessoryFilterOptions()}
              value={filter}
              onChange={setFilter}
              disabled={!view}
              className="w-44"
              aria-label={tr({ ja: "装飾品の所有状態", en: "Accessory ownership" })}
            />
            <FilterSelect
              options={accessoryPartOptions()}
              value={part}
              onChange={setPart}
              className="w-40"
              aria-label={tr({ ja: "装飾品の部位", en: "Accessory body part" })}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly || rows.length === 0}
              onClick={() => write((b) => writeAccessoryFlags(b, rows.map((a) => a.id), 1))}
            >
              {tr({ ja: "表示中を全部所持", en: "Own all shown" })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly || rows.length === 0}
              onClick={() => write((b) => writeAccessoryFlags(b, rows.map((a) => a.id), 0))}
            >
              {tr({ ja: "表示中を全部外す", en: "Remove all shown" })}
            </Button>
          </div>
          <WriteError error={error} />
          <div className="flex flex-col divide-y">
            {rows.map((a) => {
              const known = view ? view.known[a.id] : true;
              const name = tr({ ja: a.ja, en: a.en });
              const partLabel = ACCESSORY_PART_LABELS[a.part];
              return (
                <div key={a.id} className="flex items-center gap-3 py-1.5">
                  <OwnershipStateButton
                    owned={view ? view.owned[a.id] : null}
                    name={name}
                    labels={[tr(OWNED_LABELS[0]), tr(OWNED_LABELS[1])]}
                    disabled={readOnly || (!known && !advanced)}
                    onChange={(on) => write((b) => writeAccessoryFlag(b, a.id, on ? 1 : 0, { advanced }))}
                  />
                  <ItemInformation
                    name={name}
                    category={partLabel ? tr(partLabel) : a.part}
                    description={tr({ ja: a.descJa, en: a.descEn })}
                    offset={ACCESSORY_FLAGS_OFFSET + a.id}
                    condition={
                      a.shop
                        ? tr({ ja: "店で購入", en: "Buy at a shop" })
                        : a.dlc !== null
                          ? dlcLabel(a.dlc)
                          : tr({ ja: "特典解除", en: "Unlocks" })
                    }
                  >
                      {a.dlc !== null && (
                        <Badge variant="outline" className="font-normal">
                          {dlcLabel(a.dlc)}
                        </Badge>
                      )}
                      {!a.shop && a.dlc === null && (
                        <Badge variant="outline" className="font-normal">
                          {tr({ ja: "特典", en: "Unlock" })}
                        </Badge>
                      )}
                  </ItemInformation>
                  {!known && <span className="text-destructive text-xs">{tr({ ja: "状態不明", en: "Unknown state" })}</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </AnchoredCard>
      {/* 各装飾品の 1 B だけを書き換える（0＝なし、1＝所持）。❓ 2 以上の値の意味は未確認 */}
      <p className="text-muted-foreground text-xs">
        {tr({
          ja: "状態不明の装飾品は、上級者モードでだけ切り替えられます。「特典」は店で買えず、特典解除で手に入る物です。",
          en: "Accessories in an unknown state can only be toggled in Advanced mode. \"Unlock\" items cannot be bought in shops and are obtained through Unlocks.",
        })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- 容姿

// 🔶 U-17: 顔・髪型などの特典は容姿の服のビットとは別の状態列を使う。
const APPEARANCE_UNLOCK_CATEGORIES = ["肌の色", "髪の色", "体型", "顔", "髪型", "服"] as const;

/** 種類の名前で絞り込む選択肢。先頭は絞り込まない「すべて」 */
const categoryOptions = (
  categories: readonly string[],
  allLabel: Localized = { ja: "すべての種別", en: "All kinds" },
): FilterOption<string>[] => [
  { value: "all", label: tr(allLabel) },
  ...categories.map((c) => ({ value: c, label: categoryLabel(c) })),
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
        const info = appearance
          ? appearanceUnlockInformation(u)
          : { ja: u.ja, en: u.en, descriptionJa: u.effectJa, descriptionEn: u.effectEn };
        const name = tr({ ja: info.ja, en: info.en });

        return (
          <div key={u.id} className="flex flex-wrap items-center gap-3 py-1.5">
            <UnlockStateButton
              value={view ? view.values[u.id] : null}
              name={name}
              disabled={readOnly || (view !== null && !view.known[u.id] && !advanced)}
              onChange={(v) => write((b) => writeUnlockState(b, u.id, v, { advanced }))}
            />
            <ItemInformation
              name={name}
              category={categoryLabel(u.category)}
              description={tr({ ja: info.descriptionJa, en: info.descriptionEn })}
              offset={UNLOCK_STATES_OFFSET + u.id}
              condition={tr({ ja: u.conditionJa, en: u.conditionEn })}
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
      return matchesSearch(query, [
        info.ja, info.en, info.descriptionJa, info.descriptionEn, u.ja, u.en, u.conditionJa, u.conditionEn,
      ]);
    });

  return (
    <>
      <AnchoredCard
        anchor={UNLOCKS_ANCHORS.faces}
        title={tr({ ja: "顔・髪型などの特典", en: "Face, hairstyle and other unlocks" })}
        extra={
          <InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)}〜${formatOffset(UNLOCK_STATES_OFFSET + UNLOCK_COUNT - 1)}`}>
            {/* 🔶 U-17：多くの番号の対応と書き込みの反映は要ゲーム内確認。J.J. の顔は ✅ 解除前後の差分で対応を確認（書き込みは ❓） */}
            {tr({
              ja: "顔・髪型・服・肌の色・髪の色・体型の特典は、特典解除の画面でも切り替えられます。",
              en: "Face, hairstyle, clothes, skin color, hair color and figure unlocks can also be toggled on the Unlocks screen.",
            })}
          </InfoTip>
        }
        description={
          <>
            {tr({
              ja: "主人公設定で選べる顔・髪型などの特典を解除できます。",
              en: "Unlock faces, hairstyles and more that can be chosen in Character Settings.",
            })}
            <br />
            {tr({
              ja: "クリックするたびに 非表示 → 未取得 → 取得済み の順に切り替わります。",
              en: "Each click cycles through Hidden → Not obtained → Obtained.",
            })}
          </>
        }
        headerExtra={<WarningLines warnings={view?.warnings} />}
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              placeholder={tr({ ja: "顔・髪型・名前で絞り込み", en: "Filter by face, hairstyle or name" })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <FilterSelect
              options={categoryOptions(APPEARANCE_UNLOCK_CATEGORIES)}
              value={category}
              onChange={setCategory}
              className="w-40"
              aria-label={tr({ ja: "特典の種別", en: "Unlock kind" })}
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

const clothFilterOptions = (): FilterOption<ClothFilter>[] => [
  { value: "all", label: tr(ALL_OWNERSHIP) },
  { value: "on", label: tr(UNLOCKED_LABELS[1]) },
  { value: "off", label: tr(UNLOCKED_LABELS[0]) },
];

export function AppearancePage() {
  // 服と顔・髪型などの特典は別の領域なので別々に読み、片方が読めなくてももう片方は編集できるようにする
  const clothes = useSaveView(readAppearance);
  const unlocks = useSaveView(readUnlockStates);
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
    .filter((c) => matchesSearch(query, [c.ja, c.en, c.descJa, c.descEn]))
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
        title={tr({ ja: "容姿の服", en: "Appearance clothes" })}
        // 服の番号ごとに1ビット（番号 n は APPEARANCE_OFFSET + n/8 の bit n%8）。番号32〜46・238は ✅ ゲーム内で書き換えを確認、ほかは 🟢
        extra={<InfoTip offset={`${formatOffset(APPEARANCE_OFFSET)}〜${formatOffset(APPEARANCE_OFFSET + APPEARANCE_BYTES - 1)}`} />}
        description={
          <>
            {tr({
              ja: "容姿設定で選べる服を解放できます。",
              en: "Unlock clothes that can be chosen in the Appearance settings.",
            })}
            <br />
            {tr({ ja: `解放 ${onCount} / ${CLOTHES.length}`, en: `Unlocked ${onCount} / ${CLOTHES.length}` })}
          </>
        }
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder={tr(NAME_DESC_PLACEHOLDER)} value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterSelect
              options={categoryOptions(categories, ALL_PARTS)}
              value={category}
              onChange={setCategory}
              className="w-40"
              aria-label={tr({ ja: "服の部位", en: "Clothing body part" })}
            />
            {/* 解放の状態はセーブで決まるので、未読み込みのときは無効にして絞り込まない */}
            <FilterSelect
              options={clothFilterOptions()}
              value={filter}
              onChange={setFilter}
              disabled={!view}
              className="w-44"
              aria-label={tr({ ja: "服の所有状態", en: "Clothing unlock state" })}
            />
            <Button variant="outline" size="sm" disabled={readOnly || rows.length === 0} onClick={() => write((b) => writeAppearanceBits(b, rows.map((c) => c.id), true))}>
              {tr({ ja: "表示中を全部解放", en: "Unlock all shown" })}
            </Button>
            <Button variant="outline" size="sm" disabled={readOnly || rows.length === 0} onClick={() => write((b) => writeAppearanceBits(b, rows.map((c) => c.id), false))}>
              {tr({ ja: "表示中を全部消す", en: "Lock all shown" })}
            </Button>
          </div>
          <WriteError error={error} />
          <div className="flex flex-col divide-y">
            {rows.map((c) => {
              const { offset } = appearanceBitPosition(c.id); // ビット位置（bit 番号）は画面に出さない
              const name = tr({ ja: c.ja, en: c.en });
              const reward = APPEARANCE_REWARDS[c.id];
              return (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <OwnershipStateButton
                    owned={view ? isAppearanceBitSet(view, c.id) : null}
                    name={name}
                    labels={[tr(UNLOCKED_LABELS[0]), tr(UNLOCKED_LABELS[1])]}
                    disabled={readOnly}
                    onChange={(on) => write((b) => writeAppearanceBit(b, c.id, on))}
                  />
                  <ItemInformation
                    name={name}
                    category={categoryLabel(c.category)}
                    description={tr({ ja: c.descJa, en: c.descEn }) || tr({ ja: "説明なし", en: "No description" })}
                    offset={offset}
                    condition={reward ? tr(reward) : undefined}
                  >
                    {c.dlc !== null && (
                      <Badge variant="outline" className="font-normal">
                        {dlcLabel(c.dlc)}
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
    matchesSearch(query, [u.ja, u.en, u.conditionJa, u.conditionEn, u.effectJa, u.effectEn]),
  );
  const ids = rows.map((u) => u.id);

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <AnchoredCard
        anchor={UNLOCKS_ANCHORS.unlocks}
        title={tr({ ja: "特典解除", en: "Unlocks" })}
        // 0＝非表示、1＝表示中・未取得、2＝取得済み。
        // 先頭16件と J.J. の顔は ✅ ゲーム内の状態と照合、ライフルの免許は ✅ 2 への変更の反映を確認。ほかは 🔶 U-17（書き込みは要ゲーム内確認）
        extra={<InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)}〜${formatOffset(UNLOCK_STATES_OFFSET + UNLOCK_COUNT - 1)}`} />}
        description={
          <>
            {tr({ ja: "ゲームの特典を解除できます。", en: "Unlock the game's bonus features." })}
            <br />
            {tr({
              ja: "全部を解除すると Steam の実績が取れることがあります（取れた実績は戻せません）。",
              en: "Unlocking everything may earn Steam achievements (earned achievements cannot be undone).",
            })}
            {/* 実績の例：すべての容姿設定を解除 */}
          </>
        }
        headerExtra={<WarningLines warnings={view?.warnings} />}
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              placeholder={tr({ ja: "名前・条件で絞り込み", en: "Filter by name or condition" })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <FilterSelect
              options={categoryOptions(categories)}
              value={category}
              onChange={setCategory}
              className="w-40"
              aria-label={tr({ ja: "特典の種別", en: "Unlock kind" })}
            />
            {([0, 1, 2] as const).map((v) => (
              <Button key={v} variant="outline" size="sm" disabled={readOnly || ids.length === 0} onClick={() => write((b) => writeUnlockStates(b, ids, v))}>
                {tr({
                  ja: `表示中を${UNLOCK_STATE_LABELS[v].ja}にする`,
                  en: `Set all shown to ${UNLOCK_STATE_LABELS[v].en}`,
                })}
              </Button>
            ))}
          </div>
          <WriteError error={error} />
          <UnlockStateRows rows={rows} view={view} readOnly={readOnly} advanced={advanced} write={write} />
        </CardContent>
      </AnchoredCard>
      {/* 🟢 取得時には箪笥の拡張・装飾品の付与も行う。 */}
      <p className="text-muted-foreground text-xs">
        {tr({
          ja: "特典を取得済みにすると、武器箪笥の拡張や装飾品の入手も反映します。未取得・非表示に戻しても、箪笥の容量や装飾品の所持は元に戻りません。",
          en: "Setting a bonus to Obtained also expands the Weapon Chest or grants its accessory. Changing it back to Not obtained or Hidden does not reduce chest capacity or remove accessories.",
        })}
      </p>
    </div>
  );
}
