import { useMemo, useState, type ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { ItemInformation, OwnershipStateButton, UnlockStateButton } from "./unlock-ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
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

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 読み込み前・読み取り専用・エラーの表示と、書き込みのエラーの受け止め */
function usePageState<T extends { layoutProblem: string | null }>(read: (bytes: Uint8Array) => T, showMissingSave = true) {
  const { save, update } = useSave();
  const [writeError, setWriteError] = useState<string | null>(null);
  const result = useMemo((): { view: T } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: read(save.working) };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save, read]);
  const view = result && "view" in result ? result.view : null;
  const readOnly = !view || view.layoutProblem !== null;
  function write(mutator: (bytes: Uint8Array) => void) {
    setWriteError(null);
    try {
      update(mutator);
    } catch (e) {
      setWriteError(errorMessage(e));
    }
  }
  const banner: ReactNode = (
    <>
      {!save && showMissingSave && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。</AlertDescription>
        </Alert>
      )}
      {result && "error" in result && (
        <Alert variant="destructive">
          <AlertTitle>読み込めません</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}
      {writeError && (
        <Alert variant="destructive">
          <AlertTitle>書き込めません</AlertTitle>
          <AlertDescription>{writeError}</AlertDescription>
        </Alert>
      )}
    </>
  );
  return { view, readOnly, write, banner };
}

function matches(query: string, ...texts: string[]): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || texts.some((t) => t.toLowerCase().includes(q));
}

// ---------------------------------------------------------------- 装飾品

type AccessoryFilter = "all" | "owned" | "missing";

export function AccessoriesPage() {
  const { advanced } = useAdvancedMode();
  const { view, readOnly, write, banner } = usePageState(readAccessoryFlags);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessoryFilter>("all");
  const [part, setPart] = useState("all");

  const rows = useMemo(
    () =>
      [...ACCESSORIES]
        .sort((a, b) => a.menuOrder - b.menuOrder)
        .filter((a) => matches(query, a.ja, a.en, a.descJa))
        .filter((a) => part === "all" || a.part === part)
        .filter((a) => {
          if (filter === "all" || !view) return true;
          const owned = view.values[a.id] !== 0;
          return filter === "owned" ? owned : !owned;
        }),
    [query, filter, part, view],
  );
  const ownedCount = view ? view.values.filter((v) => v !== 0).length : 0;

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            装飾品
            <InfoTip offset={`${formatOffset(ACCESSORY_FLAGS_OFFSET)}〜${formatOffset(ACCESSORY_FLAGS_OFFSET + ACCESSORY_COUNT - 1)}`}>
              {/* ✅ 書き換えが装飾品設定に反映されることを確認。並びがゲーム内の一覧の順なのは 🔶 */}
              書き換えは装飾品設定に反映されます
            </InfoTip>
          </CardTitle>
          <CardDescription>
            持っている装飾品を切り替えられます（並びはゲーム内の一覧の順）。
            <br />
            所持 {ownedCount} / {ACCESSORY_COUNT}
          </CardDescription>
          {view?.warning && <p className="text-destructive text-xs">{view.warning}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              placeholder="名前・説明で絞り込み"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              value={filter}
              items={{ all: "すべての所有状態", owned: "所持", missing: "未所持" }}
              onValueChange={(v) => v !== null && setFilter(v as AccessoryFilter)}
            >
              <SelectTrigger className="w-44" aria-label="装飾品の所有状態">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての所有状態</SelectItem>
                <SelectItem value="owned">所持</SelectItem>
                <SelectItem value="missing">未所持</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={part}
              items={{ all: "すべての部位", ...ACCESSORY_PART_LABELS }}
              onValueChange={(v) => v !== null && setPart(v)}
            >
              <SelectTrigger className="w-40" aria-label="装飾品の部位"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての部位</SelectItem>
                {Object.entries(ACCESSORY_PART_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly}
              onClick={() => write((b) => writeAccessoryFlags(b, rows.map((a) => a.id), 1))}
            >
              表示中を全部所持
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly}
              onClick={() => write((b) => writeAccessoryFlags(b, rows.map((a) => a.id), 0))}
            >
              表示中を全部外す
            </Button>
          </div>
          <div className="flex flex-col divide-y">
            {rows.map((a) => {
              const value = view?.values[a.id] ?? 0;
              return (
                <div key={a.id} className="flex items-center gap-3 py-1.5">
                  <OwnershipStateButton
                    owned={value !== 0}
                    name={a.ja}
                    labels={["未所持", "所持"]}
                    disabled={readOnly || (value > 1 && !advanced)}
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
                  {value > 1 && <span className="text-destructive text-xs">状態不明</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
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

/** 種類の名前の選択肢（Base UI の Select の items） */
const categoryItems = (categories: readonly string[], allLabel = "すべての種別") => [
  { value: "all", label: allLabel },
  ...categories.map((c) => ({ value: c, label: c })),
];

/**
 * 特典の状態の行。確度：UNLOCK_READ_CONFIRMED の番号は ✅ 解除前後の差分で対応を確認（書き込みは ❓ 要ゲーム内確認）、
 * UNLOCK_WRITE_CONFIRMED の番号（ライフルの免許）は ✅ 取得済みへの変更を確認。ほかは 🔶 U-17
 */
function UnlockStateRows({
  rows, view, readOnly, advanced, write, appearance = false,
}: {
  appearance?: boolean;
  rows: readonly UnlockEntry[];
  view: UnlockStatesView | null;
  readOnly: boolean;
  advanced: boolean;
  write: (mutator: (bytes: Uint8Array) => void) => void;
}) {
  return (
    <div className="flex flex-col divide-y">
      {rows.map((u) => {
        const value = view?.values[u.id] ?? 0;
        const info = appearance ? appearanceUnlockInformation(u) : { ja: u.ja, en: u.en, descriptionJa: u.effectJa };

        return (
          <div key={u.id} className="flex flex-wrap items-center gap-3 py-1.5">
            <UnlockStateButton
              value={value}
              name={info.ja}
              disabled={readOnly || (value > 2 && !advanced)}
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

function AppearanceUnlocksCard() {
  const { advanced } = useAdvancedMode();
  const { view, readOnly, write, banner } = usePageState(readUnlockStates, false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const rows = UNLOCKS.filter((u) => APPEARANCE_UNLOCK_CATEGORIES.some((c) => c === u.category))
    .filter((u) => category === "all" || u.category === category)
    .filter((u) => {
      const info = appearanceUnlockInformation(u);
      return matches(query, info.ja, info.en, info.descriptionJa, u.ja, u.conditionJa);
    });

  return (
    <>
      {banner}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            顔・髪型などの特典
            <InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)}〜${formatOffset(UNLOCK_STATES_OFFSET + UNLOCK_COUNT - 1)}`}>
              {/* 🔶 U-17：多くの番号の対応と書き込みの反映は要ゲーム内確認。J.J. の顔は ✅ 解除前後の差分で対応を確認（書き込みは ❓） */}
              顔・髪型・服・肌の色・髪の色・体型の特典は、特典解除の画面でも切り替えられます。
            </InfoTip>
          </CardTitle>
          <CardDescription>
            主人公設定で選べる顔・髪型などの特典を解除できます。
            <br />
            クリックするたびに 非表示 → 未取得 → 取得済み の順に切り替わります。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="顔・髪型・名前で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select
              value={category}
              items={categoryItems(APPEARANCE_UNLOCK_CATEGORIES)}
              onValueChange={(v) => v !== null && setCategory(v)}
            >
              <SelectTrigger className="w-40" aria-label="特典の種別"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての種別</SelectItem>
                {APPEARANCE_UNLOCK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <UnlockStateRows rows={rows} view={view} readOnly={readOnly} advanced={advanced} write={write} appearance />
        </CardContent>
      </Card>
    </>
  );
}

type ClothFilter = "all" | "on" | "off";

export function AppearancePage() {
  const { view, readOnly, write, banner } = usePageState(readAppearance);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState<ClothFilter>("all");
  const categories = useMemo(() => [...new Set(CLOTHES.flatMap((c) => c.category.split("・")))], []);

  const rows = CLOTHES.filter((c) => category === "all" || c.category.split("・").includes(category))
    .filter((c) => matches(query, c.ja, c.en, c.descJa))
    .filter((c) => {
      if (filter === "all" || !view) return true;
      return isAppearanceBitSet(view, c.id) === (filter === "on");
    });
  const onCount = view ? CLOTHES.filter((c) => isAppearanceBitSet(view, c.id)).length : 0;

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <AppearanceUnlocksCard />
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            容姿の服
            {/* 服の番号ごとに1ビット（番号 n は APPEARANCE_OFFSET + n/8 の bit n%8）。
                APPEARANCE_CONFIRMED の番号は ✅ ゲーム内で書き換えを確認、ほかは 🟢 */}
            <InfoTip offset={`${formatOffset(APPEARANCE_OFFSET)}〜${formatOffset(APPEARANCE_OFFSET + APPEARANCE_BYTES - 1)}`} />
          </CardTitle>
          <CardDescription>
            容姿設定で選べる服を解放できます。
            <br />
            解放 {onCount} / {CLOTHES.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="名前・説明で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={category} items={categoryItems(categories, "すべての部位")} onValueChange={(v) => v !== null && setCategory(v)}>
              <SelectTrigger className="w-40" aria-label="服の部位">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての部位</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filter}
              items={{ all: "すべての所有状態", on: "解放済み", off: "未解放" }}
              onValueChange={(v) => v !== null && setFilter(v as ClothFilter)}
            >
              <SelectTrigger className="w-44" aria-label="服の所有状態">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての所有状態</SelectItem>
                <SelectItem value="on">解放済み</SelectItem>
                <SelectItem value="off">未解放</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={readOnly} onClick={() => write((b) => writeAppearanceBits(b, rows.map((c) => c.id), true))}>
              表示中を全部解放
            </Button>
            <Button variant="outline" size="sm" disabled={readOnly} onClick={() => write((b) => writeAppearanceBits(b, rows.map((c) => c.id), false))}>
              表示中を全部消す
            </Button>
          </div>
          <div className="flex flex-col divide-y">
            {rows.map((c) => {
              const { offset } = appearanceBitPosition(c.id); // ビット位置（bit 番号）は画面に出さない
              return (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <OwnershipStateButton
                    owned={view ? isAppearanceBitSet(view, c.id) : false}
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
      </Card>
      {/* 各服のビットだけを書き換える（同じバイトのほかのビットは変えない）。服のない番号（47 など）のビットは扱わない */}
    </div>
  );
}

// ---------------------------------------------------------------- 特典解除

export function UnlocksPage() {
  const { advanced } = useAdvancedMode();
  const { view, readOnly, write, banner } = usePageState(readUnlockStates);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => [...new Set(UNLOCKS.map((u) => u.category))], []);

  const rows = UNLOCKS.filter((u) => category === "all" || u.category === category).filter((u) =>
    matches(query, u.ja, u.en, u.conditionJa, u.effectJa),
  );
  const ids = rows.map((u) => u.id);

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            特典解除
            {/* 0＝非表示、1＝表示中・未取得、2＝取得済み。
                先頭16件と J.J. の顔は ✅ ゲーム内の状態と照合、ライフルの免許は ✅ 2 への変更の反映を確認。ほかは 🔶 U-17（書き込みは要ゲーム内確認） */}
            <InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)}〜${formatOffset(UNLOCK_STATES_OFFSET + UNLOCK_COUNT - 1)}`} />
          </CardTitle>
          <CardDescription>
            ゲームの特典を解除できます。
            <br />
            全部を解除すると Steam の実績が取れることがあります（取れた実績は戻せません）。
            {/* 実績の例：すべての容姿設定を解除 */}
          </CardDescription>
          {view?.warning && <p className="text-destructive text-xs">{view.warning}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="名前・条件で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={category} items={categoryItems(categories)} onValueChange={(v) => v !== null && setCategory(v)}>
              <SelectTrigger className="w-40" aria-label="特典の種別">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての種別</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {([0, 1, 2] as const).map((v) => (
              <Button key={v} variant="outline" size="sm" disabled={readOnly} onClick={() => write((b) => writeUnlockStates(b, ids, v))}>
                表示中を{UNLOCK_STATE_LABELS[v]}にする
              </Button>
            ))}
          </div>
          <UnlockStateRows rows={rows} view={view} readOnly={readOnly} advanced={advanced} write={write} />
        </CardContent>
      </Card>
      {/* 各特典の 1 B だけを書き換える。値は 0〜2 の範囲。
          ❓ ライフルの免許以外の書き込み後の反映は要ゲーム内確認。装飾品の所持フラグと連動するかは ❓ */}
      <p className="text-muted-foreground text-xs">
        装飾品の特典を取得済みにしても、装飾品の所持は変わりません。所持は「装飾品」の画面で切り替えます。
      </p>
    </div>
  );
}
