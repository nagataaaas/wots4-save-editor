import { FieldRow, type ParseResult } from "@/components/field-row";
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatWarnings } from "@/lib/format";
import {
  TITLES,
  COMPLETE_WEAPONS,
  completeWeaponsUsingPart,
  completeWeaponsUsingSheath,
  WEAPON_FIELDS,
  WEAPON_TYPES,
  WEAPON_NUMBER_RANGES,
  formatRange,
  WEAPON_NAME_MAX_CHARS,
  isXUnknown,
  partKey,
  partOptions,
  validateWeaponName,
  validateWeaponNumber,
  writeCompleteWeapon,
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
import { titleIcon } from "./effect-icons";
import { PartImageTip } from "./part-image-tip";
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
import { OverrideRow, SwitchRow } from "./weapon-rows";
import { NONE, type WeaponUpdate } from "./weapon-ui";

// 帯刀・武器袋・刀箪笥で共通の、武器レコード1件分の編集欄。

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

// 確度はコメントに残す（画面には出さない）：
// kills 🔶 4万を超えると表示が崩れる報告。tsumaKills 🔶 上限は斬殺数に合わせた。
// durabilityRecovery ✅ 位置、ゲーム上の上限は未確認、書き換えの効果は要ゲーム内確認。
// heldTime 🔶 メニュー画面は数えない、書き換えの効果は要ゲーム内確認。
const NUMBER_NOTES: Partial<Record<NumberKey, string>> = {
  attack: "銘を付けても500を超えない",
  quality: "上限なし（質の最大値を超えてもよい）",
  qualityMax: "上限は武器ごとに異なる",
  kills: "4万を超えると表示が崩れる報告あり",
  tsumaKills: "斬殺数と同じ上限にしている",
  durabilityRecovery: "上限はエディタの目安",
  heldTime: "メニュー画面は数えない",
};

const PART_LABELS: Record<PartKind, string> = { blade: "刃", guard: "鍔", grip: "柄" };

const WEAPON_ID_OPTIONS: SelectOption[] = WEAPON_IDS.map((w) => ({
  value: String(w.id),
  label: weaponIdName(w),
}));
const TYPE_OPTIONS: SelectOption[] = WEAPON_TYPES.map((t) => ({
  value: String(t.id),
  label: t.label,
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
      // 左端の画像アイコンにホバーすると、その鞘を使う完成武器の画像を出す
      leading: <PartImageTip completeIds={completeWeaponsUsingSheath(x.id)} />,
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

/**
 * 武器1件分の編集欄を返す。並べ方は WeaponEditor で決める。weapon が null ならセーブ未読み込み
 */
export function useWeaponRows({
  weapon,
  base,
  update,
}: {
  weapon: WeaponView | null;
  base: number;
  update: WeaponUpdate;
}) {
  const { advanced } = useAdvancedMode();

  const number = (key: NumberKey, label = NUMBER_LABELS[key]) => (
    <FieldRow
      key={key}
      label={label}
      offset={base + WEAPON_FIELDS[key]}
      value={weapon?.numbers[key].value ?? null}
      problem={weapon?.numbers[key].problem ?? null}
      warning={formatWarnings(weapon?.numbers[key].warnings)}
      format={String}
      parse={(input) => parseNumber(key, input, advanced)}
      apply={(v) => update((b, o) => writeWeaponNumber(b, o, key, v, { advanced }))}
      // 負の値を書けるときは、スマホでもマイナスを打てるよう text にする
      inputMode={advanced && WEAPON_NUMBER_RANGES[key].system.min < 0 ? "text" : "numeric"}
      hint={numberHint(key, advanced)}
      note={NUMBER_NOTES[key]}
    />
  );

  const part = (kind: PartKind) => {
    const field = weapon?.[kind] ?? null;
    const special = weapon?.special ?? false;
    // 通常パーツは刀・槍の順に分け、その中を読みの五十音順に並べる（ユーザー判断 2026-10-05。ID 順の切り替えは 2026-10-12 にやめた）。
    // 特殊武器の刃は ID 順のまま
    const list = special
      ? partOptions(kind, special)
      : [...partOptions(kind, special)].sort(
          (a, b) =>
            Number(weaponKind(a.name) === "spear") - Number(weaponKind(b.name) === "spear") ||
            compareWeaponNames(a.name, b.name),
        );
    const options = list.map((p) => {
      const name = partName(p);
      const label = isXUnknown(kind, p)
        ? `${name}（鞘が不明・要分解→組み立て）`
        : p.xExtended
          ? `${name}（鞘は計算値）` // 🔶 X は規則から計算した値（U-3 案C、要ゲーム内確認）
          : name;
      const group = special ? undefined : WEAPON_KIND_LABELS[weaponKind(p.name)].ja;
      // 読み・ja・en の部分一致で検索できる（ユーザー判断 2026-10-05）
      // 左端の画像アイコンにホバーすると、そのパーツを使う完成武器の画像を出す
      const leading = <PartImageTip completeIds={completeWeaponsUsingPart(kind, p)} />;
      return { value: partKey(p), label, group, keywords: weaponSearchTerms(p.name), leading };
    });
    return (
      <SearchSelectRow
        key={kind}
        searchPlaceholder="読み・名前・英語名で検索"
        label={PART_LABELS[kind]}
        offset={base + WEAPON_FIELDS[kind]}
        value={field ? (field.value.key ?? `raw:${field.value.value}`) : null}
        currentLabel={
          field
            ? field.value.label ?? "未登録"
            : undefined
        }
        options={options}
        problem={field?.problem ?? null}
        warning={formatWarnings(field?.warnings)}
        note={
          kind !== "blade"
            ? undefined
            : weapon?.special
              ? "特殊武器の刃は特殊武器の刃の間だけで変えられます"
              : // 🔶 X の計算は U-3 案C（要ゲーム内確認）、X 不明の刃の扱いは U-3 案B
                "一部の刃は、鞘を計算して書きます。鞘が不明な刃は鞘を元のまま残すので、ゲーム内で分解→組み立てて正しい鞘にしてください"
        }
        onChange={(v) => update((b, o) => writeWeaponPart(b, o, kind, v))}
      />
    );
  };

  // 指定武器に変更する。刀・槍・特殊に分け、その中を部品と同じ読みの五十音順に並べる（名前のないものは ID 順）
  const completeOptions: SelectOption[] = [...COMPLETE_WEAPONS]
    .sort((a, b) => {
      const rank = (w: (typeof COMPLETE_WEAPONS)[number]) =>
        w.build.kind === "special" ? 2 : w.build.type;
      return (
        rank(a) - rank(b) ||
        (a.name && b.name ? compareWeaponNames(a.name, b.name) : a.id - b.id)
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

  return {
    number,
    part,
    name: (
      <FieldRow
        key="name"
        label="武器名"
        offset={base + WEAPON_FIELDS.name}
        value={weapon?.name.value ?? null}
        problem={weapon?.name.problem ?? null}
        warning={formatWarnings(weapon?.name.warnings)}
        format={(v) => v}
        parse={parseName}
        apply={(v) => update((b, o) => writeWeaponName(b, o, v))}
        hint={`最大${WEAPON_NAME_MAX_CHARS}文字`}
        // 🟢
        note="完成武器の名前を使う武器では、この名前は表示されません（自作の武器だけ表示されます）"
      />
    ),
    weaponId: (
      <SelectRow
        key="weaponId"
        label="完成武器"
        offset={base + WEAPON_FIELDS.weaponId}
        value={weapon ? String(weapon.weaponId.value) : null}
        currentLabel={weapon ? "未知" : undefined}
        options={WEAPON_ID_OPTIONS}
        problem={weapon?.weaponId.problem ?? null}
        warning={formatWarnings(weapon?.weaponId.warnings)}
        note="名前・パーツは変わりません"
        onChange={(v) => update((b, o) => writeWeaponId(b, o, Number(v)))}
      />
    ),
    weaponType: (
      <OverrideRow
        key="weaponType"
        label="武器種"
        offset={base + WEAPON_FIELDS.weaponType}
        value={weapon ? String(weapon.weaponType.value) : null}
        currentLabel={weapon ? "未知" : undefined}
        options={TYPE_OPTIONS}
        problem={weapon?.weaponType.problem ?? null}
        warning={formatWarnings(weapon?.weaponType.warnings)}
        note="パーツは変わりません"
        idleHint="パーツに合わせて決まります"
        overrideHint="バックアップを取ってから試してください"
        onChange={(v) => update((b, o) => writeWeaponType(b, o, Number(v), { advanced: true }))}
      />
    ),
    nameHidden: (
      <div key="nameHidden" className="flex flex-col gap-1">
        <SwitchRow
          label="名前を隠す（「*****」と表示）"
          offset={base + WEAPON_FIELDS.nameHidden}
          checked={weapon?.nameHidden.value ?? false}
          disabled={!weapon || weapon.nameHidden.problem !== null}
          onChange={(on) => update((b, o) => writeWeaponNameHidden(b, o, on))}
        />
      </div>
    ),
    complete: (
      <SearchSelectRow
        key="complete"
        label="指定武器に変更"
        offset={base + WEAPON_FIELDS.weaponId}
        searchPlaceholder="読み・名前・英語名で検索"
        value={
          weapon ? (weapon.matchesComplete ? String(weapon.weaponId.value) : "mismatch") : null
        }
        currentLabel="どの完成武器の構成とも一致しない"
        options={completeOptions}
        problem={weapon?.problem ?? weapon?.weaponType.problem ?? null}
        hint="完成武器・武器種・刃・鞘・鍔・柄（固有武器の秘伝を含む）をその武器のものに置き換えます。名前・攻撃力・耐久・質・魅力・銘は変わりません"
        note="特殊武器との間でも変更できます"
        // 特殊武器との間の変更をゲームが読めるかは要ゲーム内確認
        onChange={(v) => update((b, o) => writeCompleteWeapon(b, o, Number(v)))}
      />
    ),
    sheath: (
      <OverrideRow
        key="sheath"
        label="鞘"
        offset={base + WEAPON_FIELDS.sheath}
        value={weapon ? String(weapon.sheath.value) : null}
        currentLabel={weapon ? "表にない鞘" : undefined}
        options={SHEATH_OPTIONS}
        searchPlaceholder="刃の読み・名前・英語名で検索"
        problem={weapon?.sheath.problem ?? null}
        warning={formatWarnings(weapon?.sheath.warnings)}
        // 一覧にない値ではロード時にエラーが出たので、一覧にあるものだけ選べる
        note="名前は同じ鞘を使う刃。一覧にない鞘ではロード時にエラーが出て鞘が表示されませんでした（ゲーム内で分解・再組み立てすると直りました）"
        idleHint="刃を選び直すと、刃に合わせて書き換わります"
        overrideHint="バックアップを取ってから試してください"
        onChange={(v) => update((b, o) => writeWeaponSheath(b, o, Number(v), { advanced: true }))}
      />
    ),
    title: (
      <SelectRow
        key="title"
        label="銘"
        offset={base + WEAPON_FIELDS.title}
        value={weapon ? (weapon.title.value === null ? NONE : String(weapon.title.value)) : null}
        currentLabel={
          weapon ? (weapon.title.label ?? "未知") : undefined
        }
        options={TITLE_OPTIONS}
        problem={weapon?.title.problem ?? null}
        warning={formatWarnings(weapon?.title.warnings)}
        onChange={(v) => update((b, o) => writeWeaponTitle(b, o, v === NONE ? null : Number(v)))}
      />
    ),
  };
}
