import { useMemo, useState, type ReactNode } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { InfoTip } from "@/components/info-tip";
import { LazySelect } from "@/components/lazy-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatHex2, formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  ACCESSORIES,
  ACCESSORY_DLC_LABELS,
  ACCESSORY_PART_LABELS,
  CLOTHES,
  UNLOCKS,
  type UnlockEntry,
} from "@/save/master/accessory-names";
import {
  ACCESSORY_COUNT,
  ACCESSORY_FLAGS_OFFSET,
  APPEARANCE_BYTES,
  APPEARANCE_CONFIRMED,
  APPEARANCE_OFFSET,
  APPEARANCE_REWARDS,
  UNLOCK_COUNT,
  UNLOCK_READ_CONFIRMED,
  UNLOCK_STATE_LABELS,
  UNLOCK_STATES_OFFSET,
  UNLOCK_WRITE_CONFIRMED,
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

  const rows = useMemo(
    () =>
      [...ACCESSORIES]
        .sort((a, b) => a.menuOrder - b.menuOrder)
        .filter((a) => matches(query, a.ja, a.en, a.descJa))
        .filter((a) => {
          if (filter === "all" || !view) return true;
          const owned = view.values[a.id] !== 0;
          return filter === "owned" ? owned : !owned;
        }),
    [query, filter, view],
  );
  const ownedCount = view ? view.values.filter((v) => v !== 0).length : 0;

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            装飾品
            <InfoTip offset={`${formatOffset(ACCESSORY_FLAGS_OFFSET)} + ID（1 B × ${ACCESSORY_COUNT}）`}>
              ID ごとの所持フラグ。書き換えが装飾品設定に反映されることを確認済み（✅）
            </InfoTip>
          </CardTitle>
          <CardDescription>
            持っている装飾品を切り替えます。並びはゲーム内の一覧の順（🔶）です。所持 {ownedCount} / {ACCESSORY_COUNT}
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
              items={{ all: "すべて", owned: "所持", missing: "未所持" }}
              onValueChange={(v) => v !== null && setFilter(v as AccessoryFilter)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="owned">所持</SelectItem>
                <SelectItem value="missing">未所持</SelectItem>
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
                  <Switch
                    checked={value !== 0}
                    disabled={readOnly || (value > 1 && !advanced)}
                    onCheckedChange={(on: boolean) => write((b) => writeAccessoryFlag(b, a.id, on ? 1 : 0, { advanced }))}
                    aria-label={a.ja}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm">{a.ja}</span>
                      <InfoTip offset={ACCESSORY_FLAGS_OFFSET + a.id}>
                        ID {a.id}。{a.descJa}
                      </InfoTip>
                      <Badge variant="secondary" className="font-normal">
                        {ACCESSORY_PART_LABELS[a.part] ?? a.part}
                      </Badge>
                      {a.dlc !== null && (
                        <Badge variant="outline" className="font-normal">
                          {ACCESSORY_DLC_LABELS[a.dlc] ?? `DLC ${a.dlc}`}
                        </Badge>
                      )}
                      {!a.shop && a.dlc === null && (
                        <Badge variant="outline" className="font-normal">
                          特典
                        </Badge>
                      )}
                    </div>
                  </div>
                  {value > 1 && <span className="text-destructive font-mono text-xs">{formatHex2(value)}</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        各装飾品の 1 B だけを書き換えます（0＝なし、1＝所持）。2 以上の値の意味は ❓ で、上級者モードでだけ残したまま切り替えられます。
        「特典」は店で買えず、特典解除で手に入る物です。
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- 容姿

// 🔶 U-17: 顔・髪型などの特典は容姿の服のビットとは別の状態列を使う。
const APPEARANCE_UNLOCK_CATEGORIES = ["肌の色", "髪の色", "体型", "顔", "髪型", "服"] as const;

const unlockStateLabel = (v: number) => UNLOCK_STATE_LABELS[v] ?? `${formatHex2(v)} 不明`;

/** 「すべて」と種類の名前の選択肢（Base UI の Select の items） */
const categoryItems = (categories: readonly string[]) => [
  { value: "all", label: "すべて" },
  ...categories.map((c) => ({ value: c, label: c })),
];

function UnlockStateRows({
  rows, view, readOnly, advanced, write,
}: {
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
        const options = [0, 1, 2];
        if (!options.includes(value)) options.push(value);
        return (
          <div key={u.id} className="flex flex-wrap items-center gap-3 py-1.5">
            <LazySelect
              value={String(value)}
              items={Object.fromEntries(options.map((o) => [String(o), unlockStateLabel(o)]))}
              disabled={readOnly || (value > 2 && !advanced)}
              className="w-32"
              aria-label={u.ja}
              onValueChange={(v) => write((b) => writeUnlockState(b, u.id, Number(v), { advanced }))}
            >
              {options.map((o) => (
                <SelectItem key={o} value={String(o)}>
                  {unlockStateLabel(o)}
                </SelectItem>
              ))}
            </LazySelect>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground font-mono text-xs">{u.id}</span>
                <span className="text-sm">{u.ja}</span>
                {UNLOCK_READ_CONFIRMED.has(u.id) && <Badge variant="outline" className="font-normal">✅ 解除前後の差分で対応を確認。書き込みは要ゲーム内確認</Badge>}
                {UNLOCK_WRITE_CONFIRMED.has(u.id) && <Badge variant="outline" className="font-normal">✅ 取得済みへの変更を確認済み</Badge>}
                <InfoTip offset={UNLOCK_STATES_OFFSET + u.id}>{u.effectJa}</InfoTip>
                <Badge variant="secondary" className="font-normal">{u.category}</Badge>
              </div>
              <span className="text-muted-foreground text-xs">条件：{u.conditionJa}</span>
            </div>
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
    .filter((u) => matches(query, u.ja, u.en, u.conditionJa, u.effectJa));

  return (
    <>
      {banner}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            顔・髪型などの特典
            <InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)} + 特典番号（1 B）`}>
              顔・髪型・服・肌の色・髪の色・体型は特典解除の状態列で管理します。🔶 U-17：多くの番号の対応と書き込みの反映は要ゲーム内確認です。
            </InfoTip>
            <CertaintyBadge mark="🔶" text="U-17 一部は要ゲーム内確認" />
          </CardTitle>
          <CardDescription>
            主人公設定で使う特典の状態です。0＝非表示、1＝表示中・未取得、2＝取得済み。J.J. の顔は解除前後の差分で対応を確認済みですが、書き込みの反映は要ゲーム内確認です。
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
              <SelectTrigger className="w-32" aria-label="特典の種類"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {APPEARANCE_UNLOCK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <UnlockStateRows rows={rows} view={view} readOnly={readOnly} advanced={advanced} write={write} />
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
    .filter((c) => matches(query, c.ja, c.en))
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
            <InfoTip offset={`${formatOffset(APPEARANCE_OFFSET)}〜${formatOffset(APPEARANCE_OFFSET + APPEARANCE_BYTES - 1)}`}>
              服の番号ごとに1ビット（番号 n は {formatOffset(APPEARANCE_OFFSET)} + n/8 の bit n%8）。
              ✅ の付いた番号はゲーム内で書き換えを確かめた物、ほかは 🟢
            </InfoTip>
          </CardTitle>
          <CardDescription>
            容姿設定で選べる服の解放ビットを切り替えます。上の特典とは別の領域です。解放 {onCount} / {CLOTHES.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="名前で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={category} items={categoryItems(categories)} onValueChange={(v) => v !== null && setCategory(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filter}
              items={{ all: "すべて", on: "解放済み", off: "未解放" }}
              onValueChange={(v) => v !== null && setFilter(v as ClothFilter)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
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
              const { offset, mask } = appearanceBitPosition(c.id);
              return (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <Switch
                    checked={view ? isAppearanceBitSet(view, c.id) : false}
                    disabled={readOnly}
                    onCheckedChange={(on: boolean) => write((b) => writeAppearanceBit(b, c.id, on))}
                    aria-label={c.ja}
                  />
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground font-mono text-xs">{c.id}</span>
                    <span className="text-sm">{c.ja}</span>
                    <InfoTip offset={`${formatOffset(offset)} bit${Math.log2(mask)}`}>
                      {APPEARANCE_REWARDS[c.id] ?? c.en}
                    </InfoTip>
                    <Badge variant="secondary" className="font-normal">
                      {c.category}
                    </Badge>
                    {c.dlc !== null && (
                      <Badge variant="outline" className="font-normal">
                        {ACCESSORY_DLC_LABELS[c.dlc] ?? `DLC ${c.dlc}`}
                      </Badge>
                    )}
                    {APPEARANCE_CONFIRMED.has(c.id) && <span className="text-xs">✅</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        各服のビットだけを書き換えます（同じバイトのほかのビットは変えません）。服のない番号（47 など）のビットは扱いません。
      </p>
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
            <InfoTip offset={`${formatOffset(UNLOCK_STATES_OFFSET)} + 番号（1 B × ${UNLOCK_COUNT}）`}>
              0＝非表示、1＝表示中・未取得、2＝取得済み。先頭16件と J.J. の顔はゲーム内の状態と照合済みです。ライフルの免許は2への変更の反映を確認済み。ほかは 🔶 U-17
            </InfoTip>
            <CertaintyBadge mark="🔶" text="U-17 一部は要ゲーム内確認" />
          </CardTitle>
          <CardDescription>
            特典ごとの状態を切り替えます。ライフルの免許は取得済みへの変更の反映を確認済みです。ほかの書き込みは要ゲーム内確認です。
            全部を解除済みにすると、Steam の実績（すべての容姿設定を解除 など）が取れる可能性があります（取れた実績は戻せません）。
          </CardDescription>
          {view?.warning && <p className="text-destructive text-xs">{view.warning}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="名前・条件で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={category} items={categoryItems(categories)} onValueChange={(v) => v !== null && setCategory(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {([0, 1, 2] as const).map((v) => (
              <Button key={v} variant="outline" size="sm" disabled={readOnly} onClick={() => write((b) => writeUnlockStates(b, ids, v))}>
                表示中を {UNLOCK_STATE_LABELS[v]}
              </Button>
            ))}
          </div>
          <UnlockStateRows rows={rows} view={view} readOnly={readOnly} advanced={advanced} write={write} />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        各特典の 1 B だけを書き換えます。値は 0〜2 の範囲です。ライフルの免許以外の書き込み後の反映は要ゲーム内確認です。
        装飾品の特典を解除済みにしても、装飾品の所持フラグは変えません（連動するかは ❓）。
      </p>
    </div>
  );
}
