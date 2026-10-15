import { InfoTip } from "@/components/info-tip";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { SearchPath } from "@/lib/search-context";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { DOJO_ANCHORS } from "./anchors";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatOffset } from "@/lib/format";
import { NPC_LINKS } from "@/features/scenario/anchors";
import { useNavigation } from "@/lib/navigation-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { tr } from "@/lib/i18n";
import { useMemo } from "react";
import {
  ALL_LOOKS,
  PUPIL_COUNT_OFFSET,
  PUPIL_CODEC,
  PUPIL_KINDS,
  PUPIL_MAX,
  RAID_OFFSET,
  REPUTATION_RANK_MAX,
  RANK_OFFSET,
  POINTS_OFFSET,
  REPUTATION_RANGES,
  lookLabel,
  pupilKind,
  pupilOffset,
  readDojo,
  writePupilKind,
  writePupilLook,
  writeRaid,
  type DojoView,
  type PupilView,
} from "@/save/dojo";

// 道場（🟢 chunks/dojo）。名簿の書き換え・道場破りを帰す操作のゲームへの反映は要ゲーム内確認。
// 評判の点は種類ごとの値の合計で、段階（☆）を決める。段階の範囲は REPUTATION_RANGES（🟢）。

const EMPTY_VALUE = "empty";

/** 同じ名前の種類（点や強さが違う）に「（その n）」を付ける */
function numberDuplicates(options: SelectOption[]): SelectOption[] {
  const key = (o: SelectOption) => `${o.group}/${o.label}`;
  const total = new Map<string, number>();
  for (const o of options) total.set(key(o), (total.get(key(o)) ?? 0) + 1);
  const seen = new Map<string, number>();
  return options.map((o) => {
    if ((total.get(key(o)) ?? 0) <= 1) return o;
    const n = (seen.get(key(o)) ?? 0) + 1;
    seen.set(key(o), n);
    return { ...o, label: tr({ ja: `${o.label}（その${n}）`, en: `${o.label} (${n})` }) };
  });
}

/** 種類の選択肢。空き、女性、男性の順。同じ性別の中は評判が高い順（今の言語で作るので描画中に呼ぶ） */
function kindOptions(): SelectOption[] {
  const kinds = (["f", "m"] as const).flatMap((sex) =>
    PUPIL_KINDS.filter((k) => k.sex === sex)
      .slice()
      .sort((a, b) => b.point - a.point),
  );
  const named = numberDuplicates(
    kinds.map(
      (k): SelectOption => ({
        value: String(k.id),
        label: tr(k.label),
        group: k.sex === "f" ? tr({ ja: "女性", en: "Female" }) : tr({ ja: "男性", en: "Male" }),
      }),
    ),
  );
  return [
    { value: EMPTY_VALUE, label: tr({ ja: "空き", en: "Empty" }) },
    ...named.map((o, i) => {
      const label = tr({ ja: `${o.label}（評判 +${kinds[i].point}）`, en: `${o.label} (reputation +${kinds[i].point})` });
      return { ...o, label, selectedLabel: label };
    }),
  ];
}

/** 空きの枠の見た目の欄に出す選択肢（選べない） */
const EMPTY_LOOK_OPTIONS: readonly SelectOption[] = [{ value: EMPTY_VALUE, label: "—" }];

const unknownLabel = () => tr({ ja: "不明", en: "Unknown" });

const lookOption = (look: number): SelectOption => ({ value: String(look), label: lookLabel(look) ?? unknownLabel() });

/** 見た目の選択肢。通常は種類の候補、上級者モードは見た目の表の全部 */
function lookOptions(pupil: PupilView, advanced: boolean): SelectOption[] {
  const kind = pupilKind(pupil.kind);
  const own = kind ? kind.looks : [];
  if (!advanced) return own.map(lookOption);
  return [
    ...own.map((l) => ({ ...lookOption(l), group: tr({ ja: "この種類の見た目", en: "Looks for this type" }) })),
    ...ALL_LOOKS.filter((l) => !own.includes(l)).map((l) => ({ ...lookOption(l), group: tr({ ja: "ほかの見た目", en: "Other looks" }) })),
  ];
}

function stars(rank: number): string {
  return "★".repeat(rank) + "☆".repeat(REPUTATION_RANK_MAX - rank);
}

/**
 * 道場に関わるフラグ（NPC_DOJO_FLAGS：先生の段階 0x0126・道場主との話 0x0129・授業料の話 0x012E・
 * 師範になったことがある 0x0130・先生と道場 0x0131・先生が師範代 0x379A）は 世界 / NPC にあるのでリンクする
 */
function RelatedFlagsNote() {
  const { go } = useNavigation();
  return (
    <p className="text-muted-foreground text-sm">
      {tr({
        ja: "師範になったか、道場主との話、先生が師範代かなど、道場に関わるフラグは",
        en: "Dojo-related flags, such as whether you have become the master, talks with the dojo owner, or whether the Sensei is the acting master, can be edited in",
      })}
      <button
        type="button"
        className="text-primary mx-1 underline underline-offset-4"
        onClick={() => go("npc", NPC_LINKS.dojoFlags)}
      >
        {tr({ ja: "世界 / NPC の「道場・先生」", en: "World / NPCs: Dojo & Sensei" })}
      </button>
      {tr({ ja: "で編集できます。", en: "." })}
    </p>
  );
}

function ReputationCard({ view }: { view: DojoView | null }) {
  const { write: update } = useWrite();
  const problem = view?.problem ?? null;
  const next = view && view.rank < REPUTATION_RANK_MAX ? REPUTATION_RANGES[view.rank + 1][0] : null;

  return (
    <AnchoredCard
      anchor={DOJO_ANCHORS.reputation}
      title={tr({ ja: "道場の評判", en: "Dojo reputation" })}
      description={
        <>
          {tr({
            ja: "弟子の評判の合計で道場の評判（☆）が決まります。☆5 で鍛冶屋の「強く」「硬く」が安くなります。",
            en: 'The total of your pupils\' reputation sets the dojo reputation (☆). At ☆5, "Make Stronger" and "Make Harder" at the smithy cost less.',
          })}
          <br />
          {tr({
            ja: "☆5 で弟子が全員女性だと、留守のあいだに弟子が道場破りを追い払いやすくなります。",
            en: "At ☆5 with only female pupils, your pupils are more likely to repel challengers while you are away.",
          })}
        </>
      }
    >
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2">
          {tr({ ja: "評判：", en: "Reputation: " })}
          {view ? stars(view.rank) : "—"}
          <InfoTip offset={RANK_OFFSET} />
        </p>
        <p className="flex items-center gap-2">
          {tr({ ja: "評判の合計：", en: "Reputation total: " })}
          {view ? view.points : "—"}
          {view && next !== null && (
            <span className="text-muted-foreground text-xs">{tr({ ja: `次の☆は ${next} 以上`, en: `Next ☆ at ${next} or more` })}</span>
          )}
          <InfoTip offset={POINTS_OFFSET} />
        </p>
        <p className="flex items-center gap-2">
          {tr({ ja: "弟子の数：", en: "Pupils: " })}
          {view ? tr({ ja: `${view.count} / ${PUPIL_MAX} 人`, en: `${view.count} / ${PUPIL_MAX}` }) : "—"}
          <InfoTip offset={PUPIL_COUNT_OFFSET} />
        </p>
        <div className="sm:col-span-2">
          {/* 🟢 種類と人数（0x1406A・0x1415C〜）は、道場に入るたびにゲームが評判の段階ごとの組から選び直すので選ばせない。
              来ている間は、場面が変わるたびに先生（師範代のとき 80%）か弟子（段階ごとの確率）が追い払うことがある */}
          <SelectRow
            label={tr({ ja: "道場破り", en: "Challengers" })}
            offset={RAID_OFFSET}
            value={view ? (view.raid ? "on" : "off") : null}
            options={[
              { value: "off", label: tr({ ja: "来ていない", en: "Not here" }) },
              { value: "on", label: tr({ ja: "来ている", en: "Here" }), disabled: view !== null && view.count === 0 },
            ]}
            problem={problem}
            hint={
              <>
                {tr({
                  ja: "どんな道場破りが何人来るかは、道場に入ったときに評判に応じて決まります。道場に戻るまでに、先生や弟子が追い払うことがあります。弟子がいないと来ません。",
                  en: "Which challengers come and how many is decided by the reputation when you enter the dojo. The Sensei or your pupils may drive them off before you return. They do not come if you have no pupils.",
                })}
                {view &&
                  view.raiderCount > 0 &&
                  tr({
                    ja: `今は道場に ${view.raiderCount} 人います。`,
                    en: ` ${view.raiderCount} ${view.raiderCount === 1 ? "is" : "are"} at the dojo now.`,
                  })}
              </>
            }
            onChange={(v) => update((b) => writeRaid(b, v === "on"))}
          />
        </div>
      </CardContent>
    </AnchoredCard>
  );
}

function PupilRow({ index, view }: { index: number; view: DojoView | null }) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const problem = view?.problem ?? null;
  const pupil = view?.pupils[index] ?? null;
  const offset = pupilOffset(index);
  const kindValue = view === null ? null : pupil ? String(pupil.kind) : EMPTY_VALUE;
  const kinds = useMemo(() => kindOptions(), []);
  const pupilLabel = tr({ ja: `弟子 ${index + 1}`, en: `Pupil ${index + 1}` });

  return (
    <div className="grid gap-3 py-3 sm:grid-cols-2">
      <SelectRow
        label={pupilLabel}
        offset={offset}
        value={kindValue}
        currentLabel={tr({ ja: "弟子にできる種類の表にない人", en: "A person not in the list of pupil types" })}
        options={kinds}
        problem={problem}
        note={tr({
          ja: "種類で性別と評判の上がり方が決まります。名前は種類の名前になります",
          en: "The type sets the sex and how much the reputation rises. The name becomes the type's name",
        })}
        onChange={(v) => update((b) => writePupilKind(b, index, v === EMPTY_VALUE ? null : Number(v)))}
      />
      {/* 検索では「弟子 n > 見た目」で引く */}
      <SearchPath label={pupilLabel}>
        <SelectRow
          label={tr({ ja: "見た目", en: "Look" })}
          offset={PUPIL_CODEC.offset(offset, 'look')}
          // 空きの枠は「—」を出して選べなくする（null を渡すと「未読み込み」になる）
          value={view === null ? null : pupil ? String(pupil.look) : EMPTY_VALUE}
          currentLabel={pupil ? (lookLabel(pupil.look) ?? unknownLabel()) : undefined}
          options={pupil ? lookOptions(pupil, advanced) : EMPTY_LOOK_OPTIONS}
          problem={problem}
          disabled={view !== null && pupil === null}
          hint={view !== null && pupil === null ? tr({ ja: "空きの枠です", en: "This slot is empty" }) : undefined}
          onChange={(v) => update((b) => writePupilLook(b, index, Number(v), { advanced }))}
        />
      </SearchPath>
    </div>
  );
}

function PupilsCard({ view }: { view: DojoView | null }) {
  return (
    <AnchoredCard
      anchor={DOJO_ANCHORS.pupils}
      title={tr({ ja: "弟子", en: "Pupils" })}
      // 1人 PUPIL_SIZE（12）B × 20 枠
      extra={<InfoTip offset={`${formatOffset(pupilOffset(0))}〜${formatOffset(pupilOffset(PUPIL_MAX) - 1)}`} />}
      description={
        <>
          {tr({
            ja: "弟子の種類と見た目を変えたり、弟子を増やしたり外したりできます。",
            en: "Change your pupils' types and looks, or add and remove pupils.",
          })}
          <br />
          {tr({
            ja: "弟子の数と道場の評判は、弟子に合わせて変わります。",
            en: "The number of pupils and the dojo reputation follow the pupils.",
          })}
        </>
      }
    >
      <CardContent className="flex flex-col divide-y">
        {Array.from({ length: PUPIL_MAX }, (_, i) => (
          <PupilRow key={i} index={i} view={view} />
        ))}
      </CardContent>
    </AnchoredCard>
  );
}

export function DojoPage() {
  const { view, error: readError, problem } = useSaveView(readDojo);

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />
      <RelatedFlagsNote />
      <ReputationCard view={view} />
      <PupilsCard view={view} />
    </div>
  );
}
