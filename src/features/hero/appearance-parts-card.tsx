import { HERO_APPEARANCE_ANCHORS } from "./anchors";
import { ActionButton } from "@/components/action-button";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldShell } from "@/components/field-shell";
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import {
  APPEARANCE_PARTS_OFFSETS,
  BODY_KIND_CRASH,
  BODY_KIND_NAMES,
  BODY_KIND_PARTS,
  canNude,
  HAIR_COLOR_ADVANCED_MAX,
  HAIR_COLOR_MAX,
  HAIR_COLOR_MIN,
  HAIR_COLOR_NAMES,
  PERSON_CUSTOM,
  partNoneWarning,
  bodyKindLabel,
  isNude,
  LAYER_COUNT,
  layersCustomized,
  partOffset,
  partLayerOffset,
  readAppearanceParts,
  validatePart,
  writeBodyKind,
  writeHairColor,
  writeLayer,
  writeNude,
  writePart,
  writePerson,
  type PartValue,
} from "@/save/appearance-parts";
import {
  BODY_KIND_LABELS,
  PARTS,
  PART_GROUP_LABELS,
  PART_KINDS,
  PART_KIND_LABELS,
  PERSONS,
  findPart,
  findPerson,
  partGroup,
  type PartEntry,
  type PartLayer,
  type PartGroup,
  type PartKind,
} from "@/save/master/appearance-parts";
import { tr } from "@/lib/i18n";

const GROUP_ORDER: readonly PartGroup[] = ["男", "女", "共通", "セット用", "未使用"];
const personHiddenGroup = () => tr({ ja: "主人公設定に出ない人物", en: "Not in Character Settings" });
const noneLabel = () => tr({ ja: "なし", en: "None" });

function partLabel(p: PartEntry): string {
  const tags = [p.dlc !== null ? "DLC" : null, p.unlockId !== null ? tr({ ja: "特典", en: "Unlock" }) : null].filter(Boolean);
  // 同じ名前の色違い（下半身のさらしなど）は、見た目の別名を添えて区別する
  const name = p.ja ? tr({ ja: p.ja, en: p.en }) : "";
  const unnamed = tr({ ja: "名前なし", en: "Unnamed" });
  const alias = tr({ ja: p.alias, en: p.aliasEn });
  const label = name
    ? alias ? `${name}${tr({ ja: "：", en: ": " })}${alias}` : name
    : alias ? `${unnamed}${tr({ ja: "：", en: ": " })}${alias}` : unnamed;
  return `${label}${tags.length ? ` [${tags.join(tr({ ja: "・", en: ", " }))}]` : ""}`;
}

/**
 * 通常モード：主人公のタイプに合う名前のある部品（ローラ・子供はそのタイプ用の部品）。上級者モード：全部を「男・女・共通・セット用・未使用」の順に（ユーザー判断 2026-10-08）。
 * クラッシュする部品はどのモードでも出さない（✅ [U] 2026-10-08）。上半身・下半身の「なし」は出して、選ばれていれば警告する
 */
function partOptions(kind: PartKind, heroBodyKind: number, advanced: boolean): SelectOption[] {
  const none: SelectOption[] =
    validatePart(kind, -1, heroBodyKind, { advanced }) === null
      ? [{ value: "-1", label: noneLabel(), group: advanced ? noneLabel() : undefined }]
      : [];
  const parts = PARTS[kind].filter((p) => validatePart(kind, p.id, heroBodyKind, { advanced }) === null);
  if (!advanced)
    return [
      ...none,
      ...parts.map((p) => ({ value: String(p.id), label: partLabel(p), keywords: [String(p.id), p.ja, p.en] })),
    ];
  const opts = GROUP_ORDER.flatMap((g) =>
    parts
      .filter((p) => partGroup(kind, p) === g)
      .map((p) => ({
        value: String(p.id),
        label: partLabel(p),
        group: tr(PART_GROUP_LABELS[g]),
        keywords: [String(p.id), tr(PART_GROUP_LABELS[g]), p.alias, p.aliasEn, p.ja, p.en],
      })),
  );
  return [...none, ...opts];
}

/** 層の選択肢：なし＋その形の色違い。部品の標準の色に印を付ける（ユーザー判断 2026-10-08） */
function layerOptions(def: PartLayer, standard: number): SelectOption[] {
  return [
    { value: "-1", label: tr({ ja: "なし（この層を消す）", en: "None (remove this layer)" }) },
    ...def.textures.map((t, i) => ({
      value: String(t),
      label: tr({
        ja: `色${i + 1}${t === standard ? "［標準］" : ""}`,
        en: `Color ${i + 1}${t === standard ? " [default]" : ""}`,
      }),
    })),
  ];
}

/**
 * 上級者モードだけ：部品の層ごとに「なし」か色違いを選ぶ。部品の番号（形）は変えない。
 * 値はテクスチャの番号で、形は部品の番号で決まる（✅ [U] 2026-10-08）
 */
function LayerEditor({
  kind,
  part,
  problem,
  onChange,
}: {
  kind: PartKind;
  part: PartValue;
  problem: string | null;
  onChange: (layer: number, value: number) => void;
}) {
  const entry = part.id === -1 ? undefined : findPart(kind, part.id);
  if (!entry) return null;
  const customized = layersCustomized(kind, part);
  const layers = Array.from({ length: LAYER_COUNT }, (_, i) => i).filter(
    (i) => entry.layers[i] !== null || part.models[i] !== -1,
  );
  if (layers.length === 0) return null;
  return (
    <details className="rounded-md border px-3 py-2" open={customized}>
      <summary className="cursor-pointer text-sm">
        {tr({ ja: "層ごとに選ぶ", en: "Choose per layer" })}
        {customized && (
          <span className="text-muted-foreground ml-2 text-xs">
            {tr({ ja: "（今は部品の標準と違います）", en: "(differs from the part's default)" })}
          </span>
        )}
      </summary>
      <div className="mt-2 grid gap-3">
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: "形は部品で決まります。層ごとに、消すか色違いを選べます。部品を選び直すと標準に戻ります。",
            en: "The shape is set by the part. For each layer, you can remove it or choose a color variant. Choosing the part again restores the default.",
          })}
        </p>
        {layers.map((layer) => {
          const def = entry.layers[layer];
          const value = part.models[layer];
          return (
            <SelectRow
              key={layer}
              label={tr({
                ja: `層${layer + 1}：${def?.mesh ?? "この部品にない層"}`,
                en: `Layer ${layer + 1}: ${def?.mesh ?? "not in this part"}`,
              })}
              offset={partLayerOffset(kind, layer)}
              value={String(value)}
              currentLabel={def ? tr({ ja: "この形にない色", en: "Color not for this shape" }) : tr({ ja: "不明", en: "Unknown" })}
              options={def ? layerOptions(def, entry.models[layer]) : []}
              problem={problem}
              disabled={!def}
              hint={def ? undefined : tr({ ja: "この部品にはない層です", en: "This part does not have this layer" })}
              // 🟢 値はテクスチャの番号、形は部品の番号（✅ [U] 2026-10-08）。なしで層が消える（足元の層2で履物が消えた ✅ [U]）
              note={tr({
                ja: "形は部品で決まる。なしにすると層が消える（足元の層2なら履物が消える）",
                en: "The shape is set by the part. None removes the layer (for Feet layer 2, the footwear disappears)",
              })}
              onChange={(v) => onChange(layer, Number(v))}
            />
          );
        })}
      </div>
    </details>
  );
}

/**
 * 部品ごとの注記。確度：上半身・下半身・顔・髪型・手・足元の構造は 🟢。
 * 上半身・下半身・足元の書き込みの反映は ❓ 要ゲーム内確認（U-19）。顔・髪型・手（J.J の手）の書き込みの反映は ✅ [U]。
 * 籠手・脛当て・前掛け・外套は ✅ [U]
 * 書く内容：部品の番号とモデルの値（u16 × 4。籠手などは色違いまで含めた値）。男の裸は上半身 117（110）・下半身 88（196）、女は上半身 98（152）・下半身 26（233）
 */
const VARIANT_NOTE = { ja: "色違いも含めて選ぶ", en: "Includes color variants" };
const NO_NOTE = { ja: "", en: "" };
const PART_NOTES: Record<PartKind, { ja: string; en: string }> = {
  upper: NO_NOTE,
  lower: NO_NOTE,
  face: NO_NOTE,
  hair: NO_NOTE,
  body: { ja: "手のモデル（名前のない15種）。上級者モードだけ", en: "Hand models (15 unnamed kinds). Advanced mode only" },
  feet: NO_NOTE,
  gauntlet: VARIANT_NOTE,
  leggings: VARIANT_NOTE,
  apron: VARIANT_NOTE,
  cape: VARIANT_NOTE,
};

/** 部品の欄の下に出す説明。裸のときはそのことを、通常モードでは体の種類で絞った選択肢であることを出す */
function partSelectionHint(kind: PartKind, bodyKind: number | null, advanced: boolean, nude: boolean): string | undefined {
  if ((kind === "upper" || kind === "lower") && nude)
    return kind === "upper"
      ? tr({
          ja: "今は上裸です（服の層を外して体の層だけにしています）",
          en: "Currently bare upper body (clothing layers removed, only the body layer remains)",
        })
      : tr({
          ja: "今は下裸です（服の層を外して体の層だけにしています）",
          en: "Currently bare lower body (clothing layers removed, only the body layer remains)",
        });
  if (advanced || bodyKind === null) return undefined;
  const label = bodyKindLabel(bodyKind) ?? tr({ ja: "不明", en: "Unknown" });
  if (canNude({ bodyKind }))
    return tr({
      ja: `${label}用と共通の、名前のある部品だけを表示しています`,
      en: `Showing only named parts for ${label} and shared parts`,
    });
  if (BODY_KIND_PARTS[bodyKind])
    return tr({ ja: `${label}用の部品だけを表示しています`, en: `Showing only parts for ${label}` });
  return tr({
    ja: `タイプが${label}のときは、通常モードでは部品を選べません。上級者モードで選んでください`,
    en: `Parts cannot be chosen in normal mode when the type is ${label}. Use Advanced mode`,
  });
}

/** 上裸・下裸のボタン。体の種類が男・女のときだけ使える（✅ [U] 2026-10-08、ユーザー判断 2026-10-08） */
function NudeButtons({
  disabled,
  onNude,
}: {
  disabled: boolean;
  onNude: (kind: "upper" | "lower") => void;
}) {
  return (
    <div className="sm:col-span-2">
      <FieldShell
        label={tr({ ja: "裸", en: "Undress" })}
        offset={APPEARANCE_PARTS_OFFSETS.parts}
        note={tr({ ja: "服の層を外して、体の層だけにします", en: "Removes the clothing layers, leaving only the body layer" })}
        problem={null}
        hint={tr({
          ja: "タイプが男・女のときだけ使えます。足元は変えません",
          en: "Only available when the type is Male or Female. Feet are not changed",
        })}
      >
        <div className="flex flex-wrap gap-2">
          <ActionButton
            size="sm"
            disabled={disabled}
            label={tr({ ja: "上裸にする", en: "Bare upper body" })}
            onAction={() => onNude("upper")}
          />
          <ActionButton
            size="sm"
            disabled={disabled}
            label={tr({ ja: "下裸にする", en: "Bare lower body" })}
            onAction={() => onNude("lower")}
          />
        </div>
      </FieldShell>
    </div>
  );
}

/** 人物・タイプ・髪の色・顔・髪型・服（0x3AAD4〜0x3AB5B）。U-19 */
export function AppearancePartsCard() {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const { view, error, problem } = useSaveView(readAppearanceParts);
  const heroBodyKind = view?.bodyKind ?? null;

  // タイプ（男・女）の順に主人公設定の人物、続けて主人公設定に出ない見た目の組（ローラ・男の子・女の子 ✅ [U]）。どのモードでも出す（ユーザー判断 2026-10-09）
  const bodyKindNames = BODY_KIND_NAMES.map((k) => tr(BODY_KIND_LABELS[k]));
  const hiddenGroup = personHiddenGroup();
  const personGroups: string[] = [...bodyKindNames, hiddenGroup];
  const personOptions: SelectOption[] = PERSONS.map((p) => ({
      value: String(p.id),
      label: `${tr({ ja: p.ja, en: p.en })}${p.dlc !== null ? " [DLC]" : ""}`,
      group: p.selectable ? bodyKindNames[p.bodyKind] : hiddenGroup,
      keywords: [String(p.id), p.ja, p.en],
    })).sort((a, b) => personGroups.indexOf(a.group) - personGroups.indexOf(b.group));
  const person = view ? findPerson(view.person) : undefined;

  const hairMin = advanced ? 0 : HAIR_COLOR_MIN;
  const hairMax = advanced ? HAIR_COLOR_ADVANCED_MAX : HAIR_COLOR_MAX;
  // 髪の色：0〜4 は ✅ [U]、5＝赤・6〜9 は 🔶（U-19）
  const hairLabel = (i: number) => {
    const name = HAIR_COLOR_NAMES[i];
    return name ? tr(name) : tr({ ja: "色なし", en: "No color" });
  };
  const hairOptions: SelectOption[] = Array.from({ length: hairMax - hairMin + 1 }, (_, i) => ({
    value: String(hairMin + i),
    label: hairLabel(hairMin + i),
  }));

  const kinds = PART_KINDS.filter((kind) => advanced || kind !== "body");
  return (
    <CollapsibleCard
      anchor={HERO_APPEARANCE_ANCHORS.parts}
      title={tr({ ja: "容姿", en: "Appearance" })}
      description={
        <>
          {tr({
            ja: "主人公の見た目を変えられます。人物を選ぶと、その人物の見た目にまとめて揃えます。",
            en: "Change how the player character looks. Choosing a character applies that character's whole look.",
          })}
          <br />
          {tr({
            ja: "顔・髪型・服などを1つずつ選ぶこともできます。",
            en: "You can also choose the face, hairstyle, clothes and so on one by one.",
          })}
          {/* 人物を選ぶと、タイプ・身長・髪の色・顔・髪型・服をその人物の値で書く（体型・肌色は変えない）。
              人物を選んでいる間、ゲームは顔・髪型・服・髪の色を人物の値で表示する。部品や髪の色を変えると「個別に設定」になる */}
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-2"
    >
      <PageBanner error={error} problem={problem} className="sm:col-span-2" />
      <SearchSelectRow
        key="person"
        label={tr({ ja: "人物", en: "Character" })}
        offset={APPEARANCE_PARTS_OFFSETS.person}
        value={view ? String(view.person) : null}
        currentLabel={
          view?.person === PERSON_CUSTOM
            ? tr({ ja: "個別に設定", en: "Custom" })
            : tr({ ja: "不明な人物", en: "Unknown character" })
        }
        options={personOptions}
        problem={problem}
        hint={
          person
            ? tr({ ja: `身長 ${person.height}cm（ふつう）`, en: `Height ${person.height} cm (Average)` })
            : view?.person === PERSON_CUSTOM
              ? tr({ ja: "顔・髪型・服を個別に設定しています", en: "Face, hairstyle and clothes are set individually" })
              : undefined
        }
        // 🟢 人物の番号。✅ [U] 選び直して見た目が変わることを確認。0x3AAD6 に書く値は 🔶（U-19）
        note={tr({
          ja: "選び直すと見た目が変わる。身長は今の低い・高いの倍率を引き継ぐ",
          en: "Choosing another character changes the look. The height keeps the current Short/Tall ratio",
        })}
        searchPlaceholder={tr({ ja: "人物を検索", en: "Search characters" })}
        onChange={(v) => update((b) => writePerson(b, Number(v)))}
      />
      <SelectRow
        key="body-kind"
        label={tr({ ja: "タイプ", en: "Type" })}
        offset={APPEARANCE_PARTS_OFFSETS.bodyKind}
        value={view ? String(view.bodyKind) : null}
        currentLabel={tr({ ja: "不明", en: "Unknown" })}
        options={bodyKindNames.flatMap((g, i) =>
          BODY_KIND_CRASH.includes(i) ? [] : [{ value: String(i), label: g }],
        )}
        problem={problem}
        disabled={!advanced}
        hint={
          advanced
            ? tr({
                ja: "上級者モード：タイプだけを書き換えます。異なるタイプの部品と組み合わさると表示が崩れるおそれがあります",
                en: "Advanced mode: changes only the type. Combined with parts for a different type, the display may break",
              })
            : tr({ ja: "人物を選ぶと決まります", en: "Set by choosing a character" })
        }
        // 🔶 0＝男、1＝女。2＝ローラ・3＝子供は ✅ [U] 人物として表示を確認。4＝動物のクラッシュは ✅ [U]
        note={tr({
          ja: "男・女のほか、ローラ・子供がある。動物はロードでゲームが止まるので出さない",
          en: "Besides Male and Female, there are Laura and Child. Animal is not offered because the game stops on load",
        })}
        onChange={(v) => update((b) => writeBodyKind(b, Number(v), { advanced }))}
      />
      <SelectRow
        key="hair-color"
        label={tr({ ja: "髪の色", en: "Hair color" })}
        offset={APPEARANCE_PARTS_OFFSETS.hairColor}
        value={view ? String(view.hairColor) : null}
        currentLabel={hairLabel(view?.hairColor ?? 0)}
        options={hairOptions}
        problem={problem}
        hint={
          advanced
            ? tr({
                ja: "上級者モード：名前のない色を選ぶと髪の色がつきません",
                en: "Advanced mode: choosing an unnamed color leaves the hair uncolored",
              })
            : undefined
        }
        // ✅ [U] 0〜4。🔶 5＝赤・6〜9（U-19）
        note={tr({
          ja: "主人公設定の髪の色の一覧と同じ順に並ぶ",
          en: "Listed in the same order as the hair colors in Character Settings",
        })}
        onChange={(v) => update((b) => writeHairColor(b, Number(v), { advanced }))}
      />
      <NudeButtons
        disabled={view === null || problem !== null || !canNude(view)}
        onNude={(kind) => update((b) => writeNude(b, kind))}
      />
      {kinds.map((kind) => {
        const part = view?.parts[kind];
        const current = part && part.id !== -1 ? findPart(kind, part.id) : undefined;
        return (
          <div key={kind} className="flex flex-col gap-1">
            <SearchSelectRow
              label={tr(PART_KIND_LABELS[kind])}
              offset={part?.offset ?? partOffset(kind)}
              value={part ? String(part.id) : null}
              currentLabel={
                part?.id === -1
                  ? noneLabel()
                  : current
                    ? partLabel(current)
                    : tr({ ja: "表にない部品", en: "Unknown part" })
              }
              options={heroBodyKind === null ? [] : partOptions(kind, heroBodyKind, advanced)}
              problem={problem}
              hint={partSelectionHint(
                kind,
                heroBodyKind,
                advanced,
                view !== null && (kind === "upper" || kind === "lower") && isNude(view, kind),
              )}
              // その項目が「なし」のときだけ（止めない。ユーザー判断 2026-10-08）
              warning={part ? partNoneWarning(kind, part.id) : null}
              note={tr(PART_NOTES[kind])}
              searchPlaceholder={tr({
                ja: `${PART_KIND_LABELS[kind].ja}を検索`,
                en: `Search ${PART_KIND_LABELS[kind].en.toLowerCase()}`,
              })}
              onChange={(v) => update((b) => writePart(b, kind, Number(v), { advanced }))}
            />
            {advanced && part && (
              <LayerEditor
                kind={kind}
                part={part}
                problem={problem}
                onChange={(layer, v) => update((b) => writeLayer(b, kind, layer, v, { advanced }))}
              />
            )}
          </div>
        );
      })}
    </CollapsibleCard>
  );
}
