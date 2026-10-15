import { FieldRow, type ParseResult } from "@/components/field-row";
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useWrite } from "@/lib/use-write";
import { formatWarnings } from "@/lib/format";
import { getLanguage, tr, type Language, type Localized } from "@/lib/i18n";
import { parseInteger } from "@/lib/parse";
import {
  WEAPON_TITLES,
  COMPLETE_WEAPONS,
  completeWeaponsUsingPart,
  completeWeaponsUsingSheath,
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
  compareWeaponNames,
  weaponKind,
  weaponKindLabel,
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
import { NONE, weaponFieldOffset, weaponRecordOffset } from "./weapon-ui";

// 帯刀・武器袋・刀箪笥で共通の、武器レコード1件分の編集欄。

const NUMBER_LABELS: Record<NumberKey, Localized> = {
  attack: { ja: "攻撃力", en: "Strength" },
  durabilityMax: { ja: "最大耐久", en: "Max durability" },
  durability: { ja: "現在の耐久", en: "Current durability" },
  quality: { ja: "質", en: "Degradation" },
  qualityMax: { ja: "質の最大値", en: "Max degradation" },
  kills: { ja: "斬殺数", en: "Kills" },
  tsumaKills: { ja: "つま斬り数", en: "Spring Harvest kills" },
  durabilityRecovery: { ja: "耐久回復の累積値", en: "Total durability restored" },
  heldTime: { ja: "手に持っていた時間（秒）", en: "Time held (seconds)" },
};

// 確度はコメントに残す（画面には出さない）：
// kills 🔶 4万を超えると表示が崩れる報告。tsumaKills 🔶 上限は斬殺数に合わせた。
// durabilityRecovery ✅ 位置、ゲーム上の上限は未確認、書き換えの効果は要ゲーム内確認。
// heldTime 🔶 メニュー画面は数えない、書き換えの効果は要ゲーム内確認。
const NUMBER_NOTES: Partial<Record<NumberKey, Localized>> = {
  attack: { ja: "銘を付けても500を超えない", en: "Does not exceed 500 even with a signature" },
  quality: { ja: "上限なし（質の最大値を超えてもよい）", en: "No upper limit (may exceed the max degradation)" },
  qualityMax: { ja: "上限は武器ごとに異なる", en: "The upper limit differs by weapon" },
  kills: { ja: "4万を超えると表示が崩れる報告あり", en: "Reported to display incorrectly above 40,000" },
  tsumaKills: { ja: "斬殺数と同じ上限にしている", en: "Uses the same upper limit as Kills" },
  durabilityRecovery: { ja: "上限はエディタの目安", en: "The upper limit is the editor's guideline" },
  heldTime: { ja: "メニュー画面は数えない", en: "Time on menu screens is not counted" },
};

const PART_LABELS: Record<PartKind, Localized> = {
  blade: { ja: "刃", en: "Blade" },
  guard: { ja: "鍔", en: "Guard" },
  grip: { ja: "柄", en: "Grip" },
};

const SEARCH_PLACEHOLDER: Localized = { ja: "読み・名前・英語名で検索", en: "Search by name or reading" };
const UNKNOWN: Localized = { ja: "未知", en: "Unknown" };
const BACKUP_HINT: Localized = { ja: "バックアップを取ってから試してください", en: "Back up your save before trying this." };

/**
 * 言語ごとに1度だけ作る（選択肢は部品の数だけ要素を作るので、描画のたびには作らない）。
 * モジュールの読み込み時には作らない（その時点の言語で固まってしまう）
 */
function perLanguage<T>(make: () => T): () => T {
  const cache = new Map<Language, T>();
  return () => {
    const lang = getLanguage();
    let value = cache.get(lang);
    if (value === undefined) {
      value = make();
      cache.set(lang, value);
    }
    return value;
  };
}

const weaponIdOptions = perLanguage((): SelectOption[] =>
  WEAPON_IDS.map((w) => ({
    value: String(w.id),
    label: weaponIdName(w),
  })),
);
const typeOptions = perLanguage((): SelectOption[] =>
  WEAPON_TYPES.map((t) => ({
    value: String(t.id),
    label: t.label,
  })),
);
// 鞘も刀・槍に分ける（ユーザー判断 2026-10-05）。鞘なし（0xFFFF）はどちらにも入れず先頭に置く
const sheathOptions = perLanguage((): SelectOption[] =>
  [...SHEATHS]
    .sort((a, b) => Number(a.id !== NO_SHEATH) - Number(b.id !== NO_SHEATH))
    .map((x) => {
      const kind = sheathKind(x);
      return {
        value: String(x.id),
        // ID は出さない（ユーザー判断 2026-10-05）。同じ鞘を使う刃の読み・ja・en で検索できる
        label: sheathName(x),
        group: kind ? weaponKindLabel(kind) : undefined,
        keywords: x.names.flatMap((n) => weaponSearchTerms(n)),
        // 左端の画像アイコンにホバーすると、その鞘を使う完成武器の画像を出す
        leading: <PartImageTip completeIds={completeWeaponsUsingSheath(x.id)} />,
      };
    }),
);
const titleOptions = perLanguage((): SelectOption[] => [
  { value: NONE, label: tr({ ja: "なし", en: "None" }) },
  ...WEAPON_TITLES.map((t) => ({ value: String(t.no), label: t.label, icon: titleIcon(t.no) })),
]);

// 指定武器に変更する。刀・槍・特殊に分け、その中を部品と同じ読みの五十音順（英語では名前のアルファベット順）に並べる（名前のないものは ID 順）
const completeOptions = perLanguage((): SelectOption[] =>
  [...COMPLETE_WEAPONS]
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
        group: weaponKindLabel(isSpecial ? "special" : w.build.type === 1 ? "spear" : "sword"),
        keywords: w.name ? weaponSearchTerms(w.name) : [],
      };
    }),
);

function makePartOptions(kind: PartKind, special: boolean): SelectOption[] {
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
      ? tr({
          ja: `${name}（鞘が不明・要分解→組み立て）`,
          en: `${name} (sheath unknown; disassemble and reassemble in the game)`,
        })
      : p.xExtended
        ? tr({ ja: `${name}（鞘は計算値）`, en: `${name} (calculated sheath)` }) // 🔶 X は規則から計算した値（U-3 案C、要ゲーム内確認）
        : name;
    const group = special ? undefined : weaponKindLabel(weaponKind(p.name));
    // 読み・ja・en の部分一致で検索できる（ユーザー判断 2026-10-05）
    // 左端の画像アイコンにホバーすると、そのパーツを使う完成武器の画像を出す
    const leading = <PartImageTip completeIds={completeWeaponsUsingPart(kind, p)} />;
    return { value: partKey(p), label, group, keywords: weaponSearchTerms(p.name), leading };
  });

  return options;
}
const partOptionsByKind = perLanguage(() => ({
  normal: { blade: makePartOptions('blade', false), guard: makePartOptions('guard', false), grip: makePartOptions('grip', false) },
  special: { blade: makePartOptions('blade', true), guard: [], grip: [] },
}));

function parseNumber(key: NumberKey, input: string, advanced: boolean): ParseResult<number> {
  return parseInteger(input, (value) => validateWeaponNumber(key, value, { advanced }), { signed: true });
}

/** 入力欄の下に出す範囲。上級者モードではシステム上の範囲も出す */
function numberHint(key: NumberKey, advanced: boolean) {
  const { game, system } = WEAPON_NUMBER_RANGES[key];
  return advanced
    ? tr({
        ja: `ゲーム上 ${formatRange(game)}／システム上 ${formatRange(system)}`,
        en: `In game ${formatRange(game)} / save limit ${formatRange(system)}`,
      })
    : `${formatRange(game)}`;
}

function parseName(input: string): ParseResult<string> {
  const error = validateWeaponName(input);
  return error ? { ok: false, error } : { ok: true, value: input };
}

/**
 * 武器1件分の編集欄に共通の props。weapon が null ならセーブ未読み込み。offset はレコードの先頭で、丸ハテナにも書き込みにもこれを使う。
 * offset を省くのは、位置の決まらない欄（索引に載せるためだけに描く欄）。丸ハテナに位置を出さず、書き込めない。
 * 欄の並べ方は WeaponEditor で決める
 */
export type WeaponFieldProps = { weapon: WeaponView | null; offset?: number };

/** 攻撃力・耐久・質・斬殺数などの数値 */
export function WeaponNumberRow({
  weapon,
  offset,
  field: key,
  label = tr(NUMBER_LABELS[key]),
}: WeaponFieldProps & { field: NumberKey; label?: string }) {
  const note = NUMBER_NOTES[key];
  const { advanced } = useAdvancedMode();
  const { write } = useWrite();
  return (
    <FieldRow
      label={label}
      offset={weaponFieldOffset(offset, key)}
      value={weapon?.numbers[key].value ?? null}
      problem={weapon?.numbers[key].problem ?? null}
      warning={formatWarnings(weapon?.numbers[key].warnings)}
      format={String}
      parse={(input) => parseNumber(key, input, advanced)}
      apply={(v) => write((b) => writeWeaponNumber(b, weaponRecordOffset(offset), key, v, { advanced }))}
      // 負の値を書けるときは、スマホでもマイナスを打てるよう text にする
      inputMode={advanced && WEAPON_NUMBER_RANGES[key].system.min < 0 ? "text" : "numeric"}
      hint={numberHint(key, advanced)}
      note={note && tr(note)}
    />
  );
}

/** 刃・鍔・柄 */
export function WeaponPartRow({ weapon, offset, kind }: WeaponFieldProps & { kind: PartKind }) {
  const { write } = useWrite();
  const field = weapon?.[kind] ?? null;
  const special = weapon?.special ?? false;
  return (
    <SearchSelectRow
      searchPlaceholder={tr(SEARCH_PLACEHOLDER)}
      label={tr(PART_LABELS[kind])}
      offset={weaponFieldOffset(offset, kind)}
      value={field ? (field.value.key ?? `raw:${field.value.value}`) : null}
      currentLabel={field ? (field.value.label ?? tr({ ja: "未登録", en: "Not in list" })) : undefined}
      options={partOptionsByKind()[special ? "special" : "normal"][kind]}
      problem={field?.problem ?? null}
      warning={formatWarnings(field?.warnings)}
      note={
        kind !== "blade"
          ? undefined
          : special
            ? tr({
                ja: "特殊武器の刃は特殊武器の刃の間だけで変えられます",
                en: "A special weapon's blade can only be changed to another special weapon's blade",
              })
            : // 🔶 X の計算は U-3 案C（要ゲーム内確認）、X 不明の刃の扱いは U-3 案B
              tr({
                ja: "一部の刃は、鞘を計算して書きます。鞘が不明な刃は鞘を元のまま残すので、ゲーム内で分解→組み立てて正しい鞘にしてください",
                en: "For some blades, the sheath is calculated and written. For blades whose sheath is unknown, the sheath is left as is, so disassemble and reassemble the weapon in the game to get the correct sheath",
              })
      }
      onChange={(v) => write((b) => writeWeaponPart(b, weaponRecordOffset(offset), kind, v))}
    />
  );
}

export function WeaponNameRow({ weapon, offset }: WeaponFieldProps) {
  const { write } = useWrite();
  return (
    <FieldRow
      label={tr({ ja: "武器名", en: "Weapon name" })}
      offset={weaponFieldOffset(offset, "name")}
      value={weapon?.name.value ?? null}
      problem={weapon?.name.problem ?? null}
      warning={formatWarnings(weapon?.name.warnings)}
      format={(v) => v}
      parse={parseName}
      apply={(v) => write((b) => writeWeaponName(b, weaponRecordOffset(offset), v))}
      hint={tr({ ja: `最大${WEAPON_NAME_MAX_CHARS}文字`, en: `Up to ${WEAPON_NAME_MAX_CHARS} characters` })}
      // 🟢
      note={tr({
        ja: "完成武器の名前を使う武器では、この名前は表示されません（自作の武器だけ表示されます）",
        en: "Not shown for weapons that use a finished weapon's name (shown only for custom weapons)",
      })}
    />
  );
}

/** 完成武器ID だけを変える */
export function WeaponIdRow({ weapon, offset }: WeaponFieldProps) {
  const { write } = useWrite();
  return (
    <SelectRow
      label={tr({ ja: "完成武器", en: "Finished weapon" })}
      offset={weaponFieldOffset(offset, "weaponId")}
      value={weapon ? String(weapon.weaponId.value) : null}
      currentLabel={weapon ? tr(UNKNOWN) : undefined}
      options={weaponIdOptions()}
      problem={weapon?.weaponId.problem ?? null}
      warning={formatWarnings(weapon?.weaponId.warnings)}
      note={tr({ ja: "名前・パーツは変わりません", en: "The name and parts do not change" })}
      onChange={(v) => write((b) => writeWeaponId(b, weaponRecordOffset(offset), Number(v)))}
    />
  );
}

export function WeaponTypeRow({ weapon, offset }: WeaponFieldProps) {
  const { write } = useWrite();
  return (
    <OverrideRow
      label={tr({ ja: "武器種", en: "Weapon type" })}
      offset={weaponFieldOffset(offset, "weaponType")}
      value={weapon ? String(weapon.weaponType.value) : null}
      currentLabel={weapon ? tr(UNKNOWN) : undefined}
      options={typeOptions()}
      problem={weapon?.weaponType.problem ?? null}
      warning={formatWarnings(weapon?.weaponType.warnings)}
      note={tr({ ja: "パーツは変わりません", en: "The parts do not change" })}
      idleHint={tr({ ja: "パーツに合わせて決まります", en: "Determined by the parts" })}
      overrideHint={tr(BACKUP_HINT)}
      // OverrideRow は「武器種を上書き」を押したときだけ選べるので、選んだことが上書きの印になる
      onChange={(v) => write((b) => writeWeaponType(b, weaponRecordOffset(offset), Number(v), { override: true }))}
    />
  );
}

export function WeaponNameHiddenRow({ weapon, offset }: WeaponFieldProps) {
  const { write } = useWrite();
  return (
    <SwitchRow
      label={tr({ ja: "名前を隠す（「*****」と表示）", en: "Hide name (shown as \"*****\")" })}
      offset={weaponFieldOffset(offset, "nameHidden")}
      checked={weapon?.nameHidden.value ?? false}
      disabled={!weapon || weapon.nameHidden.problem !== null}
      onChange={(on) => write((b) => writeWeaponNameHidden(b, weaponRecordOffset(offset), on))}
    />
  );
}

/** 指定武器に変更（完成武器の構成をまとめて書く） */
export function CompleteWeaponRow({ weapon, offset }: WeaponFieldProps) {
  const { write } = useWrite();
  return (
    <SearchSelectRow
      label={tr({ ja: "指定武器に変更", en: "Change to weapon" })}
      offset={weaponFieldOffset(offset, "weaponId")}
      searchPlaceholder={tr(SEARCH_PLACEHOLDER)}
      value={weapon ? (weapon.matchesComplete ? String(weapon.weaponId.value) : "mismatch") : null}
      currentLabel={tr({
        ja: "どの完成武器の構成とも一致しない",
        en: "Does not match any finished weapon",
      })}
      options={completeOptions()}
      problem={weapon?.problem ?? weapon?.weaponType.problem ?? null}
      hint={tr({
        ja: "完成武器・武器種・刃・鞘・鍔・柄（固有武器の秘伝を含む）をその武器のものに置き換えます。名前・攻撃力・耐久・質・魅力・銘は変わりません",
        en: "Replaces the finished weapon, weapon type, blade, sheath, guard and grip (including a unique weapon's secret) with those of the chosen weapon. The name, strength, durability, degradation, charms and signature do not change",
      })}
      note={tr({ ja: "特殊武器との間でも変更できます", en: "Can also change to or from special weapons" })}
      // 特殊武器との間の変更をゲームが読めるかは要ゲーム内確認
      onChange={(v) => write((b) => writeCompleteWeapon(b, weaponRecordOffset(offset), Number(v)))}
    />
  );
}

export function WeaponSheathRow({ weapon, offset }: WeaponFieldProps) {
  const { write } = useWrite();
  return (
    <OverrideRow
      label={tr({ ja: "鞘", en: "Sheath" })}
      offset={weaponFieldOffset(offset, "sheath")}
      value={weapon ? String(weapon.sheath.value) : null}
      currentLabel={weapon ? tr({ ja: "表にない鞘", en: "Sheath not in list" }) : undefined}
      options={sheathOptions()}
      searchPlaceholder={tr({ ja: "刃の読み・名前・英語名で検索", en: "Search by blade name or reading" })}
      problem={weapon?.sheath.problem ?? null}
      warning={formatWarnings(weapon?.sheath.warnings)}
      // 一覧にない値ではロード時にエラーが出たので、一覧にあるものだけ選べる
      note={tr({
        ja: "名前は同じ鞘を使う刃。一覧にない鞘ではロード時にエラーが出て鞘が表示されませんでした（ゲーム内で分解・再組み立てすると直りました）",
        en: "Named after the blades that use the same sheath. A sheath not in this list caused an error on load and the sheath was not shown (disassembling and reassembling in the game fixed it)",
      })}
      idleHint={tr({
        ja: "刃を選び直すと、刃に合わせて書き換わります",
        en: "Selecting the blade again rewrites it to match the blade",
      })}
      overrideHint={tr(BACKUP_HINT)}
      // OverrideRow は「鞘を上書き」を押したときだけ選べるので、選んだことが上書きの印になる
      onChange={(v) => write((b) => writeWeaponSheath(b, weaponRecordOffset(offset), Number(v), { override: true }))}
    />
  );
}

export function WeaponTitleRow({ weapon, offset }: WeaponFieldProps) {
  const { write } = useWrite();
  return (
    <SelectRow
      label={tr({ ja: "銘", en: "Signature" })}
      offset={weaponFieldOffset(offset, "title")}
      value={weapon ? (weapon.title.value === null ? NONE : String(weapon.title.value)) : null}
      currentLabel={weapon ? (weapon.title.label ?? tr(UNKNOWN)) : undefined}
      options={titleOptions()}
      problem={weapon?.title.problem ?? null}
      warning={formatWarnings(weapon?.title.warnings)}
      onChange={(v) => write((b) => writeWeaponTitle(b, weaponRecordOffset(offset), v === NONE ? null : Number(v)))}
    />
  );
}
