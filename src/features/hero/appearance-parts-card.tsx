import { HERO_APPEARANCE_ANCHORS } from "./anchors";
import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { InfoTip } from "@/components/info-tip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import { SearchField } from "@/lib/search-context";
import {
  APPEARANCE_PARTS_OFFSETS,
  BODY_KIND_CRASH,
  BODY_KIND_NAMES,
  BODY_KIND_PARTS,
  HAIR_COLOR_MAX,
  HAIR_COLOR_MIN,
  HAIR_COLOR_NAMES,
  PERSON_CUSTOM,
  partNoneWarning,
  bodyKindName,
  isNude,
  LAYER_COUNT,
  layersCustomized,
  partOffset,
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
  PARTS,
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

const GROUP_ORDER: readonly PartGroup[] = ["男", "女", "共通", "セット用", "未使用"];
const PERSON_HIDDEN_GROUP = "主人公設定に出ない人物";

function partLabel(p: PartEntry): string {
  const tags = [p.dlc !== null ? "DLC" : null, p.unlockId !== null ? "特典" : null].filter(Boolean);
  // 同じ名前の色違い（下半身のさらしなど）は、見た目の別名を添えて区別する
  const name = p.ja
    ? p.alias ? `${p.ja}：${p.alias}` : p.ja
    : p.alias ? `名前なし：${p.alias}` : "名前なし";
  return `${name}${tags.length ? ` [${tags.join("・")}]` : ""}`;
}

/**
 * 通常モード：主人公のタイプに合う名前のある部品（ローラ・子供はそのタイプ用の部品）。上級者モード：全部を「男・女・共通・セット用・未使用」の順に（ユーザー判断 2026-10-08）。
 * クラッシュする部品はどのモードでも出さない（✅ [U] 2026-10-08）。上半身・下半身の「なし」は出して、選ばれていれば警告する
 */
function partOptions(kind: PartKind, heroBodyKind: number, advanced: boolean): SelectOption[] {
  const none: SelectOption[] =
    validatePart(kind, -1, heroBodyKind, advanced) === null
      ? [{ value: "-1", label: "なし", group: advanced ? "なし" : undefined }]
      : [];
  const parts = PARTS[kind].filter((p) => validatePart(kind, p.id, heroBodyKind, advanced) === null);
  if (!advanced)
    return [
      ...none,
      ...parts.map((p) => ({ value: String(p.id), label: partLabel(p), keywords: [String(p.id)] })),
    ];
  const opts = GROUP_ORDER.flatMap((g) =>
    parts
      .filter((p) => partGroup(kind, p) === g)
      .map((p) => ({
        value: String(p.id),
        label: partLabel(p),
        group: g,
        keywords: [String(p.id), g, p.alias],
      })),
  );
  return [...none, ...opts];
}

/** 層の選択肢：なし＋その形の色違い。部品の標準の色に印を付ける（ユーザー判断 2026-10-08） */
function layerOptions(def: PartLayer, standard: number): SelectOption[] {
  return [
    { value: "-1", label: "なし（この層を消す）" },
    ...def.textures.map((t, i) => ({
      value: String(t),
      label: `色${i + 1}${t === standard ? "［標準］" : ""}`,
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
        層ごとに選ぶ
        {customized && (
          <span className="text-muted-foreground ml-2 text-xs">（今は部品の標準と違います）</span>
        )}
      </summary>
      <div className="mt-2 grid gap-3">
        <p className="text-muted-foreground text-xs">
          形は部品で決まります。層ごとに、消すか色違いを選べます。部品を選び直すと標準に戻ります。
        </p>
        {layers.map((layer) => {
          const def = entry.layers[layer];
          const value = part.models[layer];
          return (
            <SelectRow
              key={layer}
              label={`層${layer + 1}：${def?.mesh ?? "この部品にない層"}`}
              offset={part.offset + 4 + layer * 2}
              value={String(value)}
              currentLabel={def ? "この形にない色" : "不明"}
              options={def ? layerOptions(def, entry.models[layer]) : []}
              problem={problem}
              disabled={!def}
              hint={def ? undefined : "この部品にはない層です"}
              // 🟢 値はテクスチャの番号、形は部品の番号（✅ [U] 2026-10-08）。なしで層が消える（足元の層2で履物が消えた ✅ [U]）
              note="形は部品で決まる。なしにすると層が消える（足元の層2なら履物が消える）"
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
const PART_NOTES: Record<PartKind, string> = {
  upper: "",
  lower: "",
  face: "",
  hair: "",
  body: "手のモデル（名前のない15種）。上級者モードだけ",
  feet: "",
  gauntlet: "色違いも含めて選ぶ",
  leggings: "色違いも含めて選ぶ",
  apron: "色違いも含めて選ぶ",
  cape: "色違いも含めて選ぶ",
};

/** 上裸・下裸のボタン。体の種類が男・女のときだけ使える（✅ [U] 2026-10-08、ユーザー判断 2026-10-08） */
function NudeButtons({
  disabled,
  onNude,
}: {
  disabled: boolean;
  onNude: (kind: "upper" | "lower") => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const run = (kind: "upper" | "lower") => {
    setError(null);
    try {
      onNude(kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <SearchField label="裸" className="flex flex-col gap-1.5 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label>裸</Label>
        <InfoTip offset={APPEARANCE_PARTS_OFFSETS.parts}>
          服の層を外して、体の層だけにします
        </InfoTip>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => run("upper")}>
          上裸にする
        </Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => run("lower")}>
          下裸にする
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        タイプが男・女のときだけ使えます。足元は変えません
      </p>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </SearchField>
  );
}

/** 人物・タイプ・髪の色・顔・髪型・服（0x3AAD4〜0x3AB5B）。U-19 */
export function AppearancePartsCard() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const view = useMemo(() => (save ? readAppearanceParts(save.working) : null), [save]);
  const k = save?.loadId ?? 0;
  const problem = view === null ? (save ? "ファイルが小さすぎて読めません" : null) : view.problem;
  const heroBodyKind = view?.bodyKind ?? 0;

  // タイプ（男・女）の順に主人公設定の人物、続けて主人公設定に出ない見た目の組（ローラ・男の子・女の子 ✅ [U]）。どのモードでも出す（ユーザー判断 2026-10-09）
  const personGroups: string[] = [...BODY_KIND_NAMES, PERSON_HIDDEN_GROUP];
  const personOptions: SelectOption[] = PERSONS.map((p) => ({
      value: String(p.id),
      label: `${p.ja}${p.dlc !== null ? " [DLC]" : ""}`,
      group: p.selectable ? BODY_KIND_NAMES[p.bodyKind] : PERSON_HIDDEN_GROUP,
      keywords: [String(p.id), p.en],
    })).sort((a, b) => personGroups.indexOf(a.group) - personGroups.indexOf(b.group));
  const person = view ? findPerson(view.person) : undefined;

  const hairMin = advanced ? 0 : HAIR_COLOR_MIN;
  const hairMax = advanced ? 15 : HAIR_COLOR_MAX;
  // 髪の色：0〜4 は ✅ [U]、5＝赤・6〜9 は 🔶（U-19）
  const hairLabel = (i: number) => HAIR_COLOR_NAMES[i] ?? "色なし";
  const hairOptions: SelectOption[] = Array.from({ length: hairMax - hairMin + 1 }, (_, i) => ({
    value: String(hairMin + i),
    label: hairLabel(hairMin + i),
  }));

  const kinds = PART_KINDS.filter((kind) => advanced || kind !== "body");
  return (
    <CollapsibleCard
      anchor={HERO_APPEARANCE_ANCHORS.parts}
      title="容姿"
      description={
        <>
          主人公の見た目を変えられます。人物を選ぶと、その人物の見た目にまとめて揃えます。
          <br />
          顔・髪型・服などを1つずつ選ぶこともできます。
          {/* 人物を選ぶと、タイプ・身長・髪の色・顔・髪型・服をその人物の値で書く（体型・肌色は変えない）。
              人物を選んでいる間、ゲームは顔・髪型・服・髪の色を人物の値で表示する。部品や髪の色を変えると「個別に設定」になる */}
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-2"
    >
      <SearchSelectRow
        key={`${k}-person-${advanced}`}
        label="人物"
        offset={APPEARANCE_PARTS_OFFSETS.person}
        value={view ? String(view.person) : null}
        currentLabel={
          view?.person === PERSON_CUSTOM ? "個別に設定" : "不明な人物"
        }
        options={personOptions}
        problem={problem}
        hint={
          person
            ? `身長 ${person.height}cm（ふつう）`
            : view?.person === PERSON_CUSTOM
              ? "顔・髪型・服を個別に設定しています"
              : undefined
        }
        // 🟢 人物の番号。✅ [U] 選び直して見た目が変わることを確認。0x3AAD6 に書く値は 🔶（U-19）
        note="選び直すと見た目が変わる。身長は今の低い・高いの倍率を引き継ぐ"
        searchPlaceholder="人物を検索"
        onChange={(v) => update((b) => writePerson(b, Number(v)))}
      />
      <SelectRow
        key={`${k}-body-kind-${advanced}`}
        label="タイプ"
        offset={APPEARANCE_PARTS_OFFSETS.bodyKind}
        value={view ? String(view.bodyKind) : null}
        currentLabel="不明"
        options={BODY_KIND_NAMES.flatMap((g, i) =>
          BODY_KIND_CRASH.includes(i) ? [] : [{ value: String(i), label: g }],
        )}
        problem={problem}
        disabled={!advanced}
        hint={
          advanced
            ? "上級者モード：タイプだけを書き換えます。異なるタイプの部品と組み合わさると表示が崩れるおそれがあります"
            : "人物を選ぶと決まります"
        }
        // 🔶 0＝男、1＝女。2＝ローラ・3＝子供は ✅ [U] 人物として表示を確認。4＝動物のクラッシュは ✅ [U]
        note="男・女のほか、ローラ・子供がある。動物はロードでゲームが止まるので出さない"
        onChange={(v) => update((b) => writeBodyKind(b, Number(v), advanced))}
      />
      <SelectRow
        key={`${k}-hair-color-${advanced}`}
        label="髪の色"
        offset={APPEARANCE_PARTS_OFFSETS.hairColor}
        value={view ? String(view.hairColor) : null}
        currentLabel={hairLabel(view?.hairColor ?? 0)}
        options={hairOptions}
        problem={problem}
        hint={
          advanced
            ? "上級者モード：名前のない色を選ぶと髪の色がつきません"
            : undefined
        }
        // ✅ [U] 0〜4。🔶 5＝赤・6〜9（U-19）
        note="主人公設定の髪の色の一覧と同じ順に並ぶ"
        onChange={(v) => update((b) => writeHairColor(b, Number(v), advanced))}
      />
      <NudeButtons
        disabled={view === null || problem !== null || (view.bodyKind !== 0 && view.bodyKind !== 1)}
        onNude={(kind) => update((b) => writeNude(b, kind))}
      />
      {kinds.map((kind) => {
        const part = view?.parts[kind];
        const current = part && part.id !== -1 ? findPart(kind, part.id) : undefined;
        return (
          <div key={`${k}-${kind}-${advanced}`} className="flex flex-col gap-1">
            <SearchSelectRow
              label={PART_KIND_LABELS[kind]}
              offset={part?.offset ?? partOffset(kind)}
              value={part ? String(part.id) : null}
              currentLabel={
                part?.id === -1
                  ? "なし"
                  : current
                    ? partLabel(current)
                    : "表にない部品"
              }
              options={partOptions(kind, heroBodyKind, advanced)}
              problem={problem}
              hint={
                (kind === "upper" || kind === "lower") && view && isNude(view, kind)
                  ? `今は${kind === "upper" ? "上裸" : "下裸"}です（服の層を外して体の層だけにしています）`
                  : advanced || !view
                    ? undefined
                    : heroBodyKind === 0 || heroBodyKind === 1
                      ? `${bodyKindName(heroBodyKind)}用と共通の、名前のある部品だけを表示しています`
                      : BODY_KIND_PARTS[heroBodyKind]
                        ? `${bodyKindName(heroBodyKind)}用の部品だけを表示しています`
                        : `タイプが${bodyKindName(heroBodyKind) ?? "不明"}のときは、通常モードでは部品を選べません。上級者モードで選んでください`
              }
              // その項目が「なし」のときだけ（止めない。ユーザー判断 2026-10-08）
              warning={part ? partNoneWarning(kind, part.id) : null}
              note={PART_NOTES[kind]}
              searchPlaceholder={`${PART_KIND_LABELS[kind]}を検索`}
              onChange={(v) => update((b) => writePart(b, kind, Number(v), advanced))}
            />
            {advanced && part && (
              <LayerEditor
                kind={kind}
                part={part}
                problem={problem}
                onChange={(layer, v) => update((b) => writeLayer(b, kind, layer, v, advanced))}
              />
            )}
          </div>
        );
      })}
    </CollapsibleCard>
  );
}
