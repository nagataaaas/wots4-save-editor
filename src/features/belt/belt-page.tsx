import {
  createElement,
  useMemo,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ChevronRight } from "lucide-react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { SelectRow, type SelectOption } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatOffset } from "@/lib/format";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import {
  BELT_COUNT,
  BELT_STATE,
  beltOffset,
  readBelt,
  writeBeltDual,
  writeBeltMineuchi,
  writeBeltRight,
  type BeltState,
  type BeltView,
} from "@/save/belt";
import {
  CHARMS,
  TITLES,
  WEAPON_FIELDS,
  WEAPON_TYPES,
  WEAPON_NUMBER_RANGES,
  formatRange,
  WEAPON_NAME_MAX_CHARS,
  compareByReading,
  isXUnknown,
  partWeaponKind,
  partKey,
  partOptions,
  validateWeaponName,
  validateWeaponNumber,
  writeWeaponCharms,
  writeWeaponId,
  writeWeaponName,
  writeWeaponNumber,
  writeWeaponPart,
  writeWeaponSheath,
  writeWeaponTitle,
  writeWeaponType,
  type NumberKey,
  type PartKind,
  type WeaponView,
} from "@/save/weapon";
import { charmEffects, titleEffect } from "@/save/weapon-effects";
import type { LucideIcon } from "lucide-react";
import { charmIcon, titleIcon } from "./effect-icons";
import { SHEATHS, WEAPON_IDS } from "@/save/weapon-ids";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** 帯刀の状態：[U] の差分で読みは確認したが、書き込みはゲーム内で未確認 */
const stateBadge = <CertaintyBadge mark="🔶" text="差分で確認・書き込み未検証" />;

/** 効果の行の先頭に付けるアイコン */
function EffectIcon({ icon }: { icon: LucideIcon | null }) {
  return icon
    ? createElement(icon, { className: "mt-0.5 size-4 shrink-0", "aria-hidden": true })
    : null;
}

/** 銘・魅力の下に出す「今の効果」の枠。効果は [W] 鍛冶屋ページ（p20）の記載で、確定として扱う */
function EffectBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 flex flex-col gap-1 rounded-md border p-3 text-sm">
      <span className="text-muted-foreground text-xs font-medium">今の効果</span>
      {children}
    </div>
  );
}

/** 開閉の三角（Collapsible の Trigger の中に置く。開いていると下向き） */
const chevron = (
  <ChevronRight
    className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90"
    aria-hidden
  />
);

/**
 * 開閉で高さが伸び縮みする中身（tw-animate-css の collapsible-down/up）。
 * 高さ 0 でも余白が残らないよう、間隔は中に置いた要素の padding で取る
 */
const COLLAPSIBLE_ANIMATION =
  "overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up";

/** クリックがボタン（開閉の Trigger、丸ハテナなど）の上か。ボタンは自分の動作だけをさせる */
const isOnButton = (e: MouseEvent<HTMLElement>) =>
  e.target instanceof Element && e.target.closest("button") !== null;

/** 武器カードの中の、開閉できるひとまとまり */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Collapsible defaultOpen className="flex flex-col">
      <CollapsibleTrigger className="group hover:text-foreground text-muted-foreground flex items-center gap-1 border-b pb-1 text-left text-sm font-medium">
        {chevron}
        {title}
      </CollapsibleTrigger>
      {/* overflow-hidden で入力欄のフォーカスリングが切れないよう、-mx-1 px-1 で少し広げる */}
      <CollapsibleContent className={`${COLLAPSIBLE_ANIMATION} -mx-1 px-1`}>
        <div className="flex flex-col gap-4 pt-4 pb-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** 現在値と最大値のように、2つで1組の数値をまとめる枠 */
function NumberPair({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <span className="text-sm font-medium">{title}</span>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

const hex = (v: number, digits: number) =>
  `0x${v.toString(16).toUpperCase().padStart(digits, "0")}`;

const NUMBER_LABELS: Record<NumberKey, string> = {
  attack: "攻撃力",
  durabilityMax: "最大耐久",
  durability: "現在の耐久",
  quality: "質",
  qualityMax: "質の最大値",
  kills: "斬殺数",
  tsumaKills: "つま斬り数",
};

const NUMBER_NOTES: Partial<Record<NumberKey, string>> = {
  attack: "銘を付けても500を超えない",
  quality: "上限は武器ごとに異なる",
  qualityMax: "上限は武器ごとに異なる",
  kills: "🔶 4万を超えると表示が崩れる報告あり",
  tsumaKills: "🔶 斬殺数と同じ上限にしている",
};

const PART_LABELS: Record<PartKind, string> = { blade: "刃", guard: "鍔", grip: "柄" };

const WEAPON_ID_OPTIONS: SelectOption[] = WEAPON_IDS.map((w) => ({
  value: String(w.id),
  label: `${w.label}（${hex(w.id, 4)}）`,
}));
const NONE = "none";
const CHARM_OPTIONS: SelectOption[] = [
  { value: NONE, label: "なし" },
  ...CHARMS.map((c) => ({ value: String(c.id), label: c.label, icon: charmIcon(c.id) })),
];
const TYPE_OPTIONS: SelectOption[] = WEAPON_TYPES.map((t) => ({
  value: String(t.id),
  label: `${t.label}（${t.id}）`,
}));
// 鞘も刀・槍に分ける（ユーザー判断 2026-10-05）。鞘なし（0xFFFF）はどちらにも入れず先頭に置く
const SHEATH_OPTIONS: SelectOption[] = [...SHEATHS]
  .sort((a, b) => Number(a.id !== 0xffff) - Number(b.id !== 0xffff))
  .map((x) => ({
    value: String(x.id),
    label: `${x.label}（${hex(x.id, 4)}）`,
    group: x.id === 0xffff ? undefined : partWeaponKind(x.label),
  }));
const TITLE_OPTIONS: SelectOption[] = [
  { value: NONE, label: "なし" },
  ...TITLES.map((t) => ({ value: String(t.no), label: t.label, icon: titleIcon(t.no) })),
];

function parseNumber(key: NumberKey, input: string, advanced: boolean): ParseResult<number> {
  if (!/^-?\d+$/.test(input.trim())) return { ok: false, error: "整数を入力してください" };
  const value = Number(input.trim());
  const error = validateWeaponNumber(key, value, { advanced });
  return error ? { ok: false, error } : { ok: true, value };
}

/** 入力欄の下に出す範囲。上級者モードではシステム上の範囲も出す */
function numberHint(key: NumberKey, advanced: boolean) {
  const { game, system } = WEAPON_NUMBER_RANGES[key];
  return advanced
    ? `ゲーム上 ${formatRange(game)}／システム上 ${formatRange(system)}`
    : `${formatRange(game)}`;
}

function parseName(input: string): ParseResult<string> {
  const error = validateWeaponName(input);
  return error ? { ok: false, error } : { ok: true, value: input };
}

const weaponTitle = (w: WeaponView | undefined, i: number) =>
  `${i + 1}本目${w && !w.empty ? `：${w.name.value || "（名前なし）"}` : w?.empty ? "：空き" : ""}`;

export function BeltPage() {
  const { save, update } = useSave();

  const result = useMemo((): { view: BeltView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readBelt(save.working) };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save]);

  if (result && "error" in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const view = result?.view ?? null;
  const k = save?.loadId ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {!view && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。
          </AlertDescription>
        </Alert>
      )}

      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      <StateCard
        view={view}
        onRight={(i) => update((b) => writeBeltRight(b, i))}
        onDual={(left) => update((b) => writeBeltDual(b, left))}
        onMineuchi={(on) => update((b) => writeBeltMineuchi(b, on))}
      />

      {Array.from({ length: BELT_COUNT }, (_, i) => (
        <WeaponCard
          key={`${k}-${i}`}
          index={i}
          weapon={view?.weapons[i] ?? null}
          state={view?.state ?? null}
          update={(mutate) => update((b) => mutate(b, beltOffset(i)))}
        />
      ))}

      <p className="text-muted-foreground text-xs">
        各フィールドのバイトだけを書き換えます。レコードの +0x00〜+0x05
        など用途不明（❓）の領域は変えません（武器袋の1本目の先頭は帯刀の状態と重なるため。§3.4）。
        0x1A78C
        付近にある帯刀武器のコピー（🔶）は書き換えません。ゲームが本体（0xA4C2〜）のほうを読むことは、既存エディタ（[TS]）の実績から推測しています。
      </p>
    </div>
  );
}

/** 帯刀の状態（右手・二刀流の左手・峰打）。view が null ならセーブ未読み込み */
function StateCard({
  view,
  onRight,
  onDual,
  onMineuchi,
}: {
  view: BeltView | null;
  onRight: (index: number | null) => void;
  onDual: (left: number | null) => void;
  onMineuchi: (on: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const state = view?.state ?? null;
  const problem = state?.problem ?? null;
  const disabled = state === null || problem !== null;

  const usable = (exclude: number | null): SelectOption[] =>
    (view?.weapons ?? [])
      .map((w, i) => ({ w, i }))
      .filter(({ w, i }) => !w.empty && i !== exclude)
      .map(({ w, i }) => ({ value: String(i), label: weaponTitle(w, i) }));

  function run(action: () => void) {
    setError(null);
    try {
      action();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function toggleDual(on: boolean) {
    if (!state) return;
    if (!on) return run(() => onDual(null));
    const first = usable(state.right)[0];
    if (!first) return setError("左手に持てる武器がありません");
    run(() => onDual(Number(first.value)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          帯刀の状態
          <InfoTip offset={`${formatOffset(BELT_STATE.count)}〜0xA6AF`}>
            差分で位置を確かめた値で、書き換えたときのゲーム内の反映は未確認です（要ゲーム内確認）。帯刀の本数は
            🔶 {formatOffset(BELT_STATE.count)}
          </InfoTip>
          {stateBadge}
        </CardTitle>
        <CardDescription>
          どの武器を手に持つか、二刀流、峰打。
          {state && <> 帯刀の本数：{state.count}</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
          <SwitchRow
            label="二刀流"
            offset={BELT_STATE.dual}
            checked={state?.left != null}
            disabled={disabled}
            onChange={toggleDual}
          />
          <SwitchRow
            label="峰打"
            offset={BELT_STATE.mineuchi}
            checked={state?.mineuchi ?? false}
            disabled={disabled}
            onChange={(on) => run(() => onMineuchi(on))}
          />
        </div>
        <SelectRow
          label="右手（選んでいる武器）"
          offset={BELT_STATE.right}
          value={state ? (state.right === null ? NONE : String(state.right)) : null}
          currentLabel={state && state.right !== null ? `${state.right + 1}本目` : undefined}
          options={[
            { value: NONE, label: "何も選んでいない（0xFF）" },
            ...usable(state?.left ?? null),
          ]}
          problem={problem}
          onChange={(v) => onRight(v === NONE ? null : Number(v))}
        />
        {state?.left != null && (
          <SelectRow
            label="左手"
            offset={BELT_STATE.left}
            value={String(state.left)}
            options={usable(state.right)}
            problem={problem}
            note="🔶 二刀流にできる武器の組み合わせ（種類の制限）は未確認です"
            onChange={(v) => onDual(Number(v))}
          />
        )}
        {problem ? (
          <p className="text-muted-foreground text-xs sm:col-span-2">読み取り専用：{problem}</p>
        ) : (
          error && <p className="text-destructive text-xs sm:col-span-2">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SwitchRow({
  label,
  offset,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  offset: number;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
      <Label>{label}</Label>
      <InfoTip offset={offset} />
    </div>
  );
}

/**
 * ふだんは変更不可にし、武器ごとに「○○を上書き」を押したときだけ選べる欄（鞘・武器種。ユーザー判断 2026-10-05）。
 * 押したことを、書き込み関数の「明示した」印（AdvancedOptions）として渡す。どちらも 🔶 データ破損のおそれ
 */
function OverrideRow({
  label,
  idleHint,
  overrideHint,
  ...props
}: Omit<ComponentProps<typeof SelectRow>, "badges" | "disabled" | "hint"> & {
  /** 上書きしていないときの説明 */
  idleHint: string;
  /** 上書き中の注意 */
  overrideHint: string;
}) {
  const [override, setOverride] = useState(false);
  return (
    <SelectRow
      {...props}
      label={label}
      badges={
        props.value !== null &&
        !props.problem && (
          // 負のマージンで、ボタンが項目名の行の高さを変えないようにする（隣の欄と高さを揃える）
          <Button
            variant="outline"
            size="xs"
            className="-my-1.5 ml-auto"
            onClick={() => setOverride(!override)}
          >
            {override ? "上書きをやめる" : `${label}を上書き`}
          </Button>
        )
      }
      disabled={!override}
      hint={
        override ? (
          <span className="text-amber-600 dark:text-amber-400">
            🔶 データ破損のおそれ。{overrideHint}
          </span>
        ) : (
          idleHint
        )
      }
    />
  );
}

/** 帯刀1本分。weapon が null ならセーブ未読み込み */
function WeaponCard({
  index,
  weapon,
  state,
  update,
}: {
  index: number;
  weapon: WeaponView | null;
  state: BeltState | null;
  update: (mutate: (bytes: Uint8Array, offset: number) => void) => void;
}) {
  const base = beltOffset(index);
  const { advanced } = useAdvancedMode();
  // 最初は閉じておく（ユーザー判断 2026-10-05）
  const [open, setOpen] = useState(false);
  const roles = [state?.right === index && "右手", state?.left === index && "左手"].filter(
    Boolean,
  ) as string[];

  if (weapon?.empty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {weaponTitle(weapon, index)}
            <InfoTip offset={`${formatOffset(base)} から 0xA0 B`} />
          </CardTitle>
          <CardDescription>
            空き枠は編集できません（武器を新しく作る機能はありません）。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const recordProblem = weapon?.problem ?? null;
  const numberRow = (key: NumberKey, label = NUMBER_LABELS[key]) => (
    <FieldRow
      key={key}
      label={label}
      offset={base + WEAPON_FIELDS[key]}
      value={weapon?.numbers[key].value ?? null}
      problem={weapon?.numbers[key].problem ?? null}
      warning={weapon?.numbers[key].warning ?? null}
      format={String}
      parse={(input) => parseNumber(key, input, advanced)}
      apply={(v) => update((b, o) => writeWeaponNumber(b, o, key, v, { advanced }))}
      // 負の値を書けるときは、スマホでもマイナスを打てるよう text にする
      inputMode={advanced && WEAPON_NUMBER_RANGES[key].system.min < 0 ? "text" : "numeric"}
      hint={numberHint(key, advanced)}
      note={NUMBER_NOTES[key]}
    />
  );

  const partRow = (kind: PartKind) => {
    const field = weapon?.[kind] ?? null;
    const special = weapon?.special ?? false;
    // 通常パーツは刀・槍の順に分け、その中を読みの五十音順に並べる（ユーザー判断 2026-10-05）。特殊武器の刃は ID 順のまま
    const list = special
      ? partOptions(kind, special)
      : [...partOptions(kind, special)].sort(
          (a, b) =>
            Number(partWeaponKind(a.label) === "槍") - Number(partWeaponKind(b.label) === "槍") ||
            compareByReading(a.label, b.label),
        );
    const options = list.map((p) => {
      const label = isXUnknown(kind, p)
        ? `${p.label}（X 不明・要分解→組み立て）`
        : p.xExtended
          ? `${p.label}（X は推測・要確認）`
          : p.label;
      return { value: partKey(p), label, group: special ? undefined : partWeaponKind(p.label) };
    });
    const digits = kind === "grip" ? 4 : 6;
    return (
      <SelectRow
        key={kind}
        label={PART_LABELS[kind]}
        offset={base + WEAPON_FIELDS[kind]}
        value={field ? (field.value.key ?? `raw:${field.value.value}`) : null}
        currentLabel={
          field
            ? `${field.value.label ?? "未登録"}（${hex(field.value.value, digits)}）`
            : undefined
        }
        options={options}
        problem={field?.problem ?? null}
        warning={field?.warning ?? null}
        note={
          kind !== "blade"
            ? undefined
            : weapon?.special
              ? "特殊武器の刃は特殊武器の刃の間だけで変えられます"
              : "[CT] だけにある刃は、X を 🔶 規則で計算して書きます（U-3 案C、要ゲーム内確認）。X 不明の刃は ID だけを書き X は元のまま残すので、ゲーム内で分解→組み立てて正しい X にしてください（U-3 案B）"
        }
        onChange={(v) => update((b, o) => writeWeaponPart(b, o, kind, v))}
      />
    );
  };

  const charms = weapon?.charms ?? null;
  const effects = charms ? charmEffects(charms.value) : [];
  const title = titleEffect(weapon?.title.value ?? null);
  const num = (key: NumberKey) => weapon?.numbers[key].value.toLocaleString() ?? "—";
  const charmRow = (slot: number) => (
    <SelectRow
      key={slot}
      label={`魅力 ${slot + 1}`}
      offset={base + WEAPON_FIELDS.charms}
      value={charms ? (charms.value[slot] === null ? NONE : String(charms.value[slot])) : null}
      options={CHARM_OPTIONS}
      problem={charms?.problem ?? null}
      onChange={(v) =>
        update((b, o) => {
          const next = [...(charms?.value ?? [])];
          next[slot] = v === NONE ? null : Number(v);
          writeWeaponCharms(b, o, next);
        })
      }
    />
  );

  return (
    // 閉じているときはカード全体、開いているときは見出しの欄で開閉する（ユーザー判断 2026-10-05）。
    // キーボードでは見出しの Trigger で開閉できる
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <Card
        className={open ? "gap-0" : "hover:bg-muted/40 cursor-pointer gap-0"}
        onClick={(e) => {
          if (!open && !isOnButton(e)) setOpen(true);
        }}
      >
        <CardHeader
          className={open ? "cursor-pointer" : undefined}
          onClick={(e) => {
            if (open && !isOnButton(e)) setOpen(false);
          }}
        >
          <CardTitle className="flex flex-wrap items-center gap-2">
            <CollapsibleTrigger className="group flex flex-wrap items-center gap-2 text-left hover:underline">
              {chevron}
              {`${index + 1}本目`}
              {weapon && (
                <span className="flex flex-wrap items-center gap-2">
                  ：{/* 銘は武器名の左にラベルとして付ける（ユーザー判断 2026-10-05） */}
                  {weapon.title.label && <Badge variant="secondary">{weapon.title.label}</Badge>}
                  {weapon.name.value || "（名前なし）"}
                </span>
              )}
            </CollapsibleTrigger>
            <InfoTip offset={`${formatOffset(base)} から 0xA0 B`} />
            {roles.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
            {state?.mineuchi && state.right === index && <Badge variant="outline">峰打</Badge>}
          </CardTitle>
          {weapon && (
            <CardDescription>
              攻撃力 {num("attack")}・耐久 {num("durability")}/{num("durabilityMax")}・質{" "}
              {num("quality")}/{num("qualityMax")}
            </CardDescription>
          )}
          {recordProblem && (
            <CardDescription className="text-destructive">
              読み取り専用：{recordProblem}
            </CardDescription>
          )}
        </CardHeader>
        <CollapsibleContent className={COLLAPSIBLE_ANIMATION}>
          <CardContent className="flex flex-col gap-6 pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldRow
                label="武器名"
                offset={base + WEAPON_FIELDS.name}
                value={weapon?.name.value ?? null}
                problem={weapon?.name.problem ?? null}
                warning={weapon?.name.warning ?? null}
                format={(v) => v}
                parse={parseName}
                apply={(v) => update((b, o) => writeWeaponName(b, o, v))}
                hint={`最大${WEAPON_NAME_MAX_CHARS}文字`}
              />
              <SelectRow
                label="完成武器"
                offset={base + WEAPON_FIELDS.weaponId}
                value={weapon ? String(weapon.weaponId.value) : null}
                currentLabel={weapon ? `未知（${hex(weapon.weaponId.value, 4)}）` : undefined}
                options={WEAPON_ID_OPTIONS}
                problem={weapon?.weaponId.problem ?? null}
                warning={weapon?.weaponId.warning ?? null}
                note="名前・パーツは変わりません"
                onChange={(v) => update((b, o) => writeWeaponId(b, o, Number(v)))}
              />
              <OverrideRow
                label="武器種"
                offset={base + WEAPON_FIELDS.weaponType}
                value={weapon ? String(weapon.weaponType.value) : null}
                currentLabel={weapon ? `未知（${weapon.weaponType.value}）` : undefined}
                options={TYPE_OPTIONS}
                problem={weapon?.weaponType.problem ?? null}
                warning={weapon?.weaponType.warning ?? null}
                note="パーツは変わりません"
                idleHint="パーツに合わせて決まります"
                overrideHint="バックアップを取ってから試してください"
                onChange={(v) =>
                  update((b, o) => writeWeaponType(b, o, Number(v), { advanced: true }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* 鞘は刃に合わせて決まるので、刃のすぐ下に置く */}
              <div className="flex flex-col gap-4">
                {partRow("blade")}
                <OverrideRow
                  label="鞘"
                  offset={base + WEAPON_FIELDS.sheath}
                  value={weapon ? String(weapon.sheath.value) : null}
                  currentLabel={weapon ? `表にない鞘（${hex(weapon.sheath.value, 4)}）` : undefined}
                  options={SHEATH_OPTIONS}
                  problem={weapon?.sheath.problem ?? null}
                  warning={weapon?.sheath.warning ?? null}
                  // 一覧にない値ではロード時にエラーが出たので、一覧にあるものだけ選べる
                  note="名前は同じ鞘を使う刃。一覧にない鞘ではロード時にエラーが出て鞘が表示されませんでした（ゲーム内で分解・再組み立てすると直りました）"
                  idleHint="刃を選び直すと、刃に合わせて書き換わります"
                  overrideHint="バックアップを取ってから試してください"
                  onChange={(v) =>
                    update((b, o) => writeWeaponSheath(b, o, Number(v), { advanced: true }))
                  }
                />
              </div>
              {partRow("guard")}
              {partRow("grip")}
            </div>

            <Section title="攻撃力・耐久・質">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{numberRow("attack")}</div>
              <div className="grid gap-4 lg:grid-cols-2">
                <NumberPair title="耐久">
                  {numberRow("durability", "現在")}
                  {numberRow("durabilityMax", "最大")}
                </NumberPair>
                <NumberPair title="質">
                  {numberRow("quality", "現在")}
                  {numberRow("qualityMax", "最大")}
                </NumberPair>
              </div>
            </Section>

            <Section title="銘・魅力">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <SelectRow
                    label="銘"
                    offset={base + WEAPON_FIELDS.title}
                    value={
                      weapon
                        ? weapon.title.value === null
                          ? NONE
                          : String(weapon.title.value)
                        : null
                    }
                    currentLabel={
                      weapon
                        ? (weapon.title.label ?? `未知（${hex(weapon.title.raw, 6)}）`)
                        : undefined
                    }
                    options={TITLE_OPTIONS}
                    problem={weapon?.title.problem ?? null}
                    warning={weapon?.title.warning ?? null}
                    onChange={(v) =>
                      update((b, o) => writeWeaponTitle(b, o, v === NONE ? null : Number(v)))
                    }
                  />
                  {weapon && !weapon.title.problem && (
                    <EffectBox>
                      {title ? (
                        <>
                          <p className="flex gap-2">
                            <EffectIcon icon={titleIcon(weapon.title.value ?? -1)} />
                            {title.effect}
                          </p>
                          {title.note && (
                            <p className="text-muted-foreground text-xs">{title.note}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          {weapon.title.value === null ? "銘なし" : "効果は不明"}
                        </p>
                      )}
                    </EffectBox>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">魅力</span>
                  <InfoTip offset={`${formatOffset(base + WEAPON_FIELDS.charms)} から 4 B × 3組`}>
                    同じ魅力は1組にまとめて個数で書きます
                  </InfoTip>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(charmRow)}</div>
                {weapon && !charms?.problem && (
                  <EffectBox>
                    {effects.length === 0 ? (
                      <p className="text-muted-foreground">魅力なし</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {effects.map((e) => (
                          <li key={e.id} className="flex gap-2">
                            <EffectIcon icon={charmIcon(e.id)} />
                            <span>
                              <span className="font-medium">
                                {e.label} ×{e.count}
                              </span>
                              ：{e.summary}
                              {e.amount && <span className="font-medium">（{e.amount}）</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </EffectBox>
                )}
              </div>
            </Section>

            <Section title="斬殺数・つま斬り数">
              <div className="grid gap-4 sm:grid-cols-2">
                {numberRow("kills")}
                {numberRow("tsumaKills")}
              </div>
            </Section>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
