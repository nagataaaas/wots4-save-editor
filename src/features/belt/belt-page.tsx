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
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatOffset } from "@/lib/format";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { usePartOrder } from "@/lib/part-order-context";
import { useSave } from "@/lib/save-context";
import {
  BELT_COUNT,
  BELT_STATE,
  beltOffset,
  readBelt,
  writeBeltDual,
  writeBeltRight,
  type BeltState,
  type BeltView,
} from "@/save/belt";
import {
  CHARMS,
  TITLES,
  COMPLETE_WEAPONS,
  completeWeaponsUsingPart,
  WEAPON_FIELDS,
  WEAPON_TYPES,
  WEAPON_NUMBER_RANGES,
  formatRange,
  WEAPON_NAME_MAX_CHARS,
  isXUnknown,
  partId,
  partKey,
  partOptions,
  validateWeaponName,
  validateWeaponNumber,
  charmLabel,
  weaponIdLabel,
  writeCompleteWeapon,
  writeWeaponCharms,
  writeWeaponId,
  writeWeaponName,
  writeWeaponNameHidden,
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
import { PartImageTip } from "./part-image-tip";
import { weaponImageUrl } from "@/save/master/weapon-images";
import {
  WEAPON_KIND_LABELS,
  compareWeaponNames,
  weaponKind,
  weaponSearchTerms,
} from "@/save/master/weapon-names";
import {
  NO_SHEATH,
  SHEATHS,
  WEAPON_IDS,
  partName,
  sheathKind,
  sheathName,
  weaponIdName,
} from "@/save/weapon-ids";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** 帯刀の状態：位置は [U] の差分、読み込みでの扱いは 🟢。書き込みの反映はゲーム内で未確認 */
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
    className="size-4 shrink-0 transition-transform group-data-panel-open:rotate-90"
    aria-hidden
  />
);

/**
 * 開閉で高さが伸び縮みする中身（Base UI の --collapsible-panel-height を transition する）。
 * 高さ 0 でも余白が残らないよう、間隔は中に置いた要素の padding で取る
 */
const COLLAPSIBLE_ANIMATION =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0";

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
  durabilityRecovery: "耐久回復の累積値",
  heldTime: "手に持っていた時間（秒）",
};

const NUMBER_NOTES: Partial<Record<NumberKey, string>> = {
  attack: "銘を付けても500を超えない",
  quality: "上限なし（質の最大値を超えてもよい）",
  qualityMax: "上限は武器ごとに異なる",
  kills: "🔶 4万を超えると表示が崩れる報告あり",
  tsumaKills: "🔶 斬殺数と同じ上限にしている",
  durabilityRecovery: "✅ 位置。ゲーム上の上限は分からない。書き換えの効果は要ゲーム内確認",
  heldTime: "🔶 メニュー画面は数えない。同じ値の写し（+0x84）も一緒に書く。書き換えの効果は要ゲーム内確認",
};

const PART_LABELS: Record<PartKind, string> = { blade: "刃", guard: "鍔", grip: "柄" };

const WEAPON_ID_OPTIONS: SelectOption[] = WEAPON_IDS.map((w) => ({
  value: String(w.id),
  label: `${weaponIdName(w)}（${hex(w.id, 4)}）`,
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
  .sort((a, b) => Number(a.id !== NO_SHEATH) - Number(b.id !== NO_SHEATH))
  .map((x) => {
    const kind = sheathKind(x);
    return {
      value: String(x.id),
      // ID は出さない（ユーザー判断 2026-10-05）。同じ鞘を使う刃の読み・ja・en で検索できる
      label: sheathName(x),
      group: kind ? WEAPON_KIND_LABELS[kind].ja : undefined,
      keywords: x.names.flatMap((n) => weaponSearchTerms(n)),
    };
  });
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
        各フィールドのバイトだけを書き換えます。用途不明（❓）の領域は変えません。レコードの位置は、完成武器ID
        の位置を先頭として表示します（🟢。既存エディタ [TS] の位置より 6 B 後ろ）。0x1A6B2
        付近にある帯刀と同じ並び（🟢 帯刀のコピーではない別の記録）は書き換えません。ゲームは帯刀を
        0xA4C8〜 と帯刀の状態から読みます（🟢）。
      </p>
    </div>
  );
}

/** 帯刀の状態（右手・二刀流の左手）。view が null ならセーブ未読み込み */
function StateCard({
  view,
  onRight,
  onDual,
}: {
  view: BeltView | null;
  onRight: (index: number | null) => void;
  onDual: (left: number | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const state = view?.state ?? null;
  const problem = state?.problem ?? null;
  const disabled = state === null || problem !== null;

  // 🟢 手に持てるのは、帯刀の本数の内側にある空きでない武器
  const usable = (exclude: number | null): SelectOption[] =>
    (view?.weapons ?? [])
      .map((w, i) => ({ w, i }))
      .filter(({ w, i }) => !w.empty && i !== exclude && i < (state?.count ?? 0))
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
            位置は差分で確かめた値、ロード時の扱いは 🟢 です。書き換えたときのゲーム内の反映は未確認です（要ゲーム内確認）。
          </InfoTip>
          {stateBadge}
        </CardTitle>
        <CardDescription>どの武器を手に持つか、二刀流。</CardDescription>
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
            note="🟢 左手に持てない武器ならロード時に二刀流が解除されます。🔶 どの組み合わせで持てるか（種類の制限）は未確認です"
            onChange={(v) => onDual(Number(v))}
          />
        )}
        {!problem &&
          state?.warnings.map((w) => (
            <p key={w} className="text-xs text-amber-600 sm:col-span-2 dark:text-amber-400">
              {w}
            </p>
          ))}
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
  searchPlaceholder,
  ...props
}: Omit<ComponentProps<typeof SelectRow>, "badges" | "disabled" | "hint"> & {
  /** 上書きしていないときの説明 */
  idleHint: string;
  /** 上書き中の注意 */
  overrideHint: string;
  /** あれば検索つきの欄（SearchSelectRow）にする */
  searchPlaceholder?: string;
}) {
  const [override, setOverride] = useState(false);
  const rowProps = {
    ...props,
    label,
    badges: props.value !== null && !props.problem && (
      // 負のマージンで、ボタンが項目名の行の高さを変えないようにする（隣の欄と高さを揃える）
      <Button
        variant="outline"
        size="xs"
        className="-my-1.5 ml-auto"
        onClick={() => setOverride(!override)}
      >
        {override ? "上書きをやめる" : `${label}を上書き`}
      </Button>
    ),
    disabled: !override,
    hint: override ? (
      <span className="text-amber-600 dark:text-amber-400">
        🔶 データ破損のおそれ。{overrideHint}
      </span>
    ) : (
      idleHint
    ),
  };
  return searchPlaceholder ? (
    <SearchSelectRow {...rowProps} searchPlaceholder={searchPlaceholder} />
  ) : (
    <SelectRow {...rowProps} />
  );
}

/** 部品がすべて一致する完成武器の画像（10:3）。画像がない・読み込めないときは枠だけ出す */
function WeaponImage({ id }: { id: number | null }) {
  const url = id === null ? null : weaponImageUrl(id);
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(url && !failed);
  return (
    <div className={hasImage ? "weapon-preview-image" : "weapon-preview-image weapon-preview-image-empty"}>
      {hasImage && url ? (
        <img
          src={url}
          alt={id === null ? "" : (weaponIdLabel(id) ?? "")}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : (
        <div className="text-wots-label flex size-full items-center justify-center p-2 text-center font-serif text-xs">
          {url ? "画像を読み込めません" : "完成武器と部品が一致しないため画像なし"}
        </div>
      )}
    </div>
  );
}

/** 帯刀の一覧（閉じていても見える部分）の能力値と画像。ゲームの武器の画面に寄せた見た目 */
export function WeaponPanel({ weapon }: { weapon: WeaponView }) {
  // ゲームと同じく桁区切りなし。耐久・質は現在値 / 最大値で並べる。
  const num = (key: NumberKey) => String(weapon.numbers[key].value);
  const pair = (current: NumberKey, maximum: NumberKey) => (
    <span className="weapon-preview-pair" aria-label={`${num(current)}/${num(maximum)}`}>
      <span>{num(current)}</span><span>/</span><span>{num(maximum)}</span>
    </span>
  );
  const stat = (label: string, value: ReactNode) => (
    <div className="weapon-preview-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  const charms = [0, 1, 2].map((slot) => weapon.charms.value[slot] ?? null);
  return (
    <div className="weapon-preview">
      <div className="weapon-preview-layout">
        <div className="weapon-preview-details">
          <div className="weapon-preview-name">
            {weapon.title.value !== null && weapon.title.label && (
              <span>{weapon.title.label}</span>
            )}
            <span>{weapon.nameHidden.value ? "*****" : weapon.name.value || "（名前なし）"}</span>
          </div>
          <div className="weapon-preview-rule" aria-hidden="true">
            <span />
          </div>
          <dl className="weapon-preview-stats">
            {stat("攻撃力", num("attack"))}
            {stat("耐久度", pair("durability", "durabilityMax"))}
            {stat("斬殺数", num("kills"))}
            {stat("質", pair("quality", "qualityMax"))}
          </dl>
          <ul className="weapon-preview-charms" aria-label="魅力">
            {charms.map((id, slot) => (
              <li key={slot} aria-label={`魅力 ${slot + 1}：${id === null ? "なし" : charmLabel(id)}`}>
                <span>{id === null ? "---" : charmLabel(id)}</span>
              </li>
            ))}
          </ul>
        </div>
        <WeaponImage key={weapon.completeByParts} id={weapon.completeByParts} />
      </div>
    </div>
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
  const { order: partOrder } = usePartOrder();
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
    // 通常パーツは刀・槍の順に分け、その中を読みの五十音順か ID 順（サイドバーで選ぶ）に並べる（ユーザー判断 2026-10-05）。
    // 特殊武器の刃は ID 順のまま
    const list = special
      ? partOptions(kind, special)
      : [...partOptions(kind, special)].sort(
          (a, b) =>
            Number(weaponKind(a.name) === "spear") - Number(weaponKind(b.name) === "spear") ||
            (partOrder === "reading"
              ? compareWeaponNames(a.name, b.name)
              : partId(kind, a.value, a.source) - partId(kind, b.value, b.source)),
        );
    const options = list.map((p) => {
      const name = partName(p);
      const label = isXUnknown(kind, p)
        ? `${name}（X 不明・要分解→組み立て）`
        : p.xExtended
          ? `${name}（X は推測・要確認）`
          : name;
      const group = special ? undefined : WEAPON_KIND_LABELS[weaponKind(p.name)].ja;
      // 読み・ja・en の部分一致で検索できる（ユーザー判断 2026-10-05）
      // 左端の画像アイコンにホバーすると、そのパーツを使う完成武器の画像を出す
      const leading = <PartImageTip completeIds={completeWeaponsUsingPart(kind, p)} />;
      return { value: partKey(p), label, group, keywords: weaponSearchTerms(p.name), leading };
    });
    const digits = kind === "grip" ? 4 : 6;
    return (
      <SearchSelectRow
        key={kind}
        searchPlaceholder="読み・名前・英語名で検索"
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

  // 指定武器に変更する。刀・槍・特殊に分け、その中を部品と同じ順（サイドバーで選ぶ）に並べる
  const completeOptions: SelectOption[] = [...COMPLETE_WEAPONS]
    .sort((a, b) => {
      const rank = (w: (typeof COMPLETE_WEAPONS)[number]) =>
        w.build.kind === "special" ? 2 : w.build.type;
      return (
        rank(a) - rank(b) ||
        (partOrder === "reading" && a.name && b.name ? compareWeaponNames(a.name, b.name) : a.id - b.id)
      );
    })
    .map((w) => {
      const isSpecial = w.build.kind === "special";
      return {
        value: String(w.id),
        label: weaponIdName(w),
        group: isSpecial ? WEAPON_KIND_LABELS.special.ja : w.build.type === 1 ? "槍" : "刀",
        keywords: w.name ? weaponSearchTerms(w.name) : [],
      };
    });

  const charms = weapon?.charms ?? null;
  const effects = charms ? charmEffects(charms.value) : [];
  const title = titleEffect(weapon?.title.value ?? null);
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
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={
        <Card
          className={open ? "gap-0" : "hover:bg-muted/40 cursor-pointer gap-0"}
          onClick={(e) => {
            if (!open && !isOnButton(e)) setOpen(true);
          }}
        />
      }
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
              <span className="text-muted-foreground text-xs font-normal">
                {open ? "編集を閉じる" : "編集する"}
              </span>
            </CollapsibleTrigger>
            <InfoTip offset={`${formatOffset(base)} から 0xA0 B`} />
            {roles.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
            {weapon && state && index >= state.count && (
              <Badge variant="outline">帯刀の本数より後ろ（読まれない 🟢）</Badge>
            )}
            {weapon?.nameHidden.value && <Badge variant="outline">名前を隠す</Badge>}
          </CardTitle>
          {weapon && <WeaponPanel weapon={weapon} />}
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
                note={`🟢 完成武器の名前の番号（${formatOffset(base + WEAPON_FIELDS.nameNo)}）が −1 のときだけ、この名前が表示されます（自作の武器）`}
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
              <div className="flex flex-col gap-1 sm:col-span-3">
                <SwitchRow
                  label="名前を隠す（「*****」と表示）"
                  offset={base + WEAPON_FIELDS.nameHidden}
                  checked={weapon?.nameHidden.value ?? false}
                  disabled={!weapon || weapon.nameHidden.problem !== null}
                  onChange={(on) => update((b, o) => writeWeaponNameHidden(b, o, on))}
                />
                <p className="text-muted-foreground text-xs">
                  🟢 オンにすると武器名の代わりに「*****」が表示されます（要ゲーム内確認）
                </p>
              </div>
            </div>

            <SearchSelectRow
              label="指定武器に変更"
              offset={base + WEAPON_FIELDS.weaponId}
              searchPlaceholder="読み・名前・英語名で検索"
              value={weapon ? (weapon.matchesComplete ? String(weapon.weaponId.value) : "mismatch") : null}
              currentLabel="どの完成武器の構成とも一致しない"
              options={completeOptions}
              problem={weapon?.problem ?? weapon?.weaponType.problem ?? null}
              hint="完成武器・武器種・刃・鞘・鍔・柄（固有武器の秘伝を含む）をその武器のものに置き換えます。名前・攻撃力・耐久・質・魅力・銘は変わりません"
              note="ゲームがその完成武器のレコードに書く値（+0x00〜+0x0F、+0x18〜+0x1D、+0x6C〜+0x6F）をそのまま書きます。特殊武器との間でも変更できます（ゲーム内での読み込みは要確認）"
              onChange={(v) => update((b, o) => writeCompleteWeapon(b, o, Number(v)))}
            />

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
                  searchPlaceholder="刃の読み・名前・英語名で検索"
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

            <Section title="耐久回復の累積値・手に持っていた時間">
              <div className="grid gap-4 sm:grid-cols-2">
                {numberRow("durabilityRecovery")}
                {numberRow("heldTime")}
              </div>
            </Section>
          </CardContent>
        </CollapsibleContent>
    </Collapsible>
  );
}
