import { useMemo, useState } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { SelectRow, type SelectOption } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatOffset } from "@/lib/format";
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
  SELECTABLE_TITLES,
  WEAPON_FIELDS,
  WEAPON_TYPES,
  WEAPON_LIMITS,
  WEAPON_NAME_MAX_CHARS,
  isPartWritable,
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
import { SHEATHS, WEAPON_IDS } from "@/save/weapon-ids";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** 帯刀の状態：[U] の差分で読みは確認したが、書き込みはゲーム内で未確認 */
const stateBadge = <CertaintyBadge mark="🔶" text="差分で確認・書き込み未検証" />;

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
  ...CHARMS.map((c) => ({ value: String(c.id), label: c.label })),
];
const TYPE_OPTIONS: SelectOption[] = WEAPON_TYPES.map((t) => ({
  value: String(t.id),
  label: `${t.label}（${t.id}）`,
}));
const SHEATH_OPTIONS: SelectOption[] = SHEATHS.map((x) => ({
  value: String(x.id),
  label: `${x.label}（${hex(x.id, 4)}）`,
}));
const ADVANCED_OFF = "上級者モードをオンにすると変更できます";
const TITLE_OPTIONS: SelectOption[] = [
  { value: NONE, label: "なし" },
  ...SELECTABLE_TITLES.map((t) => ({ value: String(t.no), label: t.label })),
];

function parseNumber(key: NumberKey, input: string): ParseResult<number> {
  if (!/^\d+$/.test(input.trim())) return { ok: false, error: "0以上の整数を入力してください" };
  const value = Number(input.trim());
  const error = validateWeaponNumber(key, value);
  return error ? { ok: false, error } : { ok: true, value };
}

function parseName(input: string): ParseResult<string> {
  const error = validateWeaponName(input);
  return error ? { ok: false, error } : { ok: true, value: input };
}

const weaponTitle = (w: WeaponView | undefined, i: number) =>
  `${i + 1}本目${w && !w.empty ? `：${w.name.value || "（名前なし）"}` : w?.empty ? "：空き" : ""}`;

export function BeltPage() {
  const { save, update } = useSave();
  // 鞘・武器種を書ける上級者モード（ユーザー判断 2026-10-05）。明示的に有効にしたときだけ使える
  const [advanced, setAdvanced] = useState(false);

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
    <div className="flex max-w-3xl flex-col gap-4">
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

      <AdvancedCard enabled={advanced} onToggle={setAdvanced} />

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
          advanced={advanced}
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

/** 上級者モード（鞘・武器種）の切り替え */
function AdvancedCard({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2">
            上級者モード（鞘・武器種）
            <CertaintyBadge mark="🔶" text="データ破損のおそれ" />
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={onToggle} aria-label="上級者モード" />
        </div>
        <CardDescription>
          各武器の鞘（X）と武器種を変更できるようにします。鞘は一覧にあるものだけを選べます（一覧にない値ではロード時にエラーが出て鞘が表示されませんでした。
          ゲーム内で分解・再組み立てすると直りました）。パーツと合わない武器種にしたときの動作は未確認です。
          必ずバックアップを取ってから試してください。
        </CardDescription>
      </CardHeader>
    </Card>
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

/** 帯刀1本分。weapon が null ならセーブ未読み込み */
function WeaponCard({
  index,
  weapon,
  state,
  advanced,
  update,
}: {
  index: number;
  weapon: WeaponView | null;
  state: BeltState | null;
  advanced: boolean;
  update: (mutate: (bytes: Uint8Array, offset: number) => void) => void;
}) {
  const base = beltOffset(index);
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
  const numberRow = (key: NumberKey) => (
    <FieldRow
      key={key}
      label={NUMBER_LABELS[key]}
      offset={base + WEAPON_FIELDS[key]}
      value={weapon?.numbers[key].value ?? null}
      problem={weapon?.numbers[key].problem ?? null}
      warning={weapon?.numbers[key].warning ?? null}
      format={String}
      parse={(input) => parseNumber(key, input)}
      apply={(v) => update((b, o) => writeWeaponNumber(b, o, key, v))}
      inputMode="numeric"
      hint={`0〜${WEAPON_LIMITS[key].toLocaleString()}`}
      note={NUMBER_NOTES[key]}
    />
  );

  const partRow = (kind: PartKind) => {
    const field = weapon?.[kind] ?? null;
    const options = partOptions(kind, weapon?.special ?? false).map((p) => {
      const writable = isPartWritable(kind, p);
      const label = !writable
        ? `${p.label}（X 不明のため選べません）`
        : p.xExtended
          ? `${p.label}（X は推測・要確認）`
          : p.label;
      return { value: partKey(p), label, disabled: !writable };
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
              : "[CT] だけにある刃は、X を 🔶 規則で計算して書きます（U-3 案C、要ゲーム内確認）"
        }
        onChange={(v) => update((b, o) => writeWeaponPart(b, o, kind, v))}
      />
    );
  };

  const charms = weapon?.charms ?? null;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {weaponTitle(weapon ?? undefined, index)}
          <InfoTip offset={`${formatOffset(base)} から 0xA0 B`} />
          {roles.map((r) => (
            <Badge key={r}>{r}</Badge>
          ))}
          {state?.mineuchi && state.right === index && <Badge variant="outline">峰打</Badge>}
        </CardTitle>
        {recordProblem && (
          <CardDescription className="text-destructive">
            読み取り専用：{recordProblem}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow
            label="武器名"
            offset={base + WEAPON_FIELDS.name}
            badges={<CertaintyBadge mark="❓" text="最大文字数 U-5" />}
            value={weapon?.name.value ?? null}
            problem={weapon?.name.problem ?? null}
            warning={weapon?.name.warning ?? null}
            format={(v) => v}
            parse={parseName}
            apply={(v) => update((b, o) => writeWeaponName(b, o, v))}
            hint={`最大${WEAPON_NAME_MAX_CHARS}文字`}
            note="U-5 判定待ちのため安全側の上限"
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
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(["blade", "guard", "grip"] as const).map(partRow)}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectRow
            label="武器種"
            offset={base + WEAPON_FIELDS.weaponType}
            value={weapon ? String(weapon.weaponType.value) : null}
            currentLabel={weapon ? `未知（${weapon.weaponType.value}）` : undefined}
            options={TYPE_OPTIONS}
            problem={weapon?.weaponType.problem ?? (advanced ? null : ADVANCED_OFF)}
            warning={weapon?.weaponType.warning ?? null}
            note="U-8 で確定。パーツは変わりません"
            onChange={(v) => update((b, o) => writeWeaponType(b, o, Number(v), { advanced }))}
          />
          <SelectRow
            label="鞘（X）"
            offset={base + WEAPON_FIELDS.sheath}
            value={weapon ? String(weapon.sheath.value) : null}
            currentLabel={weapon ? `表にない鞘（${hex(weapon.sheath.value, 4)}）` : undefined}
            options={SHEATH_OPTIONS}
            problem={weapon?.sheath.problem ?? (advanced ? null : ADVANCED_OFF)}
            warning={weapon?.sheath.warning ?? null}
            note="名前は同じ鞘を使う刃。刃を選び直すと、鞘も刃に合わせて書き換わります"
            onChange={(v) => update((b, o) => writeWeaponSheath(b, o, Number(v), { advanced }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(["attack", "durabilityMax", "durability", "quality", "qualityMax"] as const).map(
            numberRow,
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">魅力</span>
            <InfoTip offset={`${formatOffset(base + WEAPON_FIELDS.charms)} から 4 B × 3組`}>
              同じ魅力は1組にまとめて個数で書きます
            </InfoTip>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(charmRow)}</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectRow
            label="銘"
            offset={base + WEAPON_FIELDS.title}
            value={
              weapon ? (weapon.title.value === null ? NONE : String(weapon.title.value)) : null
            }
            currentLabel={
              weapon ? (weapon.title.label ?? `未知（${hex(weapon.title.raw, 6)}）`) : undefined
            }
            options={TITLE_OPTIONS}
            problem={weapon?.title.problem ?? null}
            warning={weapon?.title.warning ?? null}
            note="人斬りはバイト列が判定待ち（❓ U-2）のため選べません"
            onChange={(v) =>
              update((b, o) => writeWeaponTitle(b, o, v === NONE ? null : Number(v)))
            }
          />
          {numberRow("kills")}
          {numberRow("tsumaKills")}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Label>手に持っていた時間</Label>
              <InfoTip offset={base + WEAPON_FIELDS.heldTime}>
                表示だけ。メニュー画面にいる間は増えないように見える（§3.4）
              </InfoTip>
              <CertaintyBadge mark="🔶" text="推測" />
            </div>
            <p className="text-sm">{weapon ? `${weapon.heldTime.toLocaleString()} 秒？` : "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
