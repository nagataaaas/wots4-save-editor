import { tr, type Localized } from "@/lib/i18n";
import { readCycleCounts } from "@/save/cycle-counts";
import { readDifficulty } from "@/save/difficulty";
import { readPublicOrder } from "@/save/public-order";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { AMIHAMA_ANCHORS } from "./anchors";
import { FieldRow } from "@/components/field-row";
import { FieldShell } from "@/components/field-shell";
import { ActionButton } from "@/components/action-button";
import { startNewCycle, type CycleEnd, type NewCycleReport } from "@/save/new-cycle";
import { PLAY_COUNT_MAX, PLAY_COUNT_OFFSET, PLAY_COUNT_REVEALS_BEST_ROUTE, validatePlayCount, writePlayCount } from "@/save/cycle-counts";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatWarnings } from "@/lib/format";
import { PUBLIC_ORDER_LEVELS, PUBLIC_ORDER_MAX, PUBLIC_ORDER_OFFSET, validatePublicOrder, writePublicOrder } from "@/save/public-order";
import { useWrite } from "@/lib/use-write";
import { DIFFICULTIES, DIFFICULTY_OFFSET, writeDifficulty } from "@/save/difficulty";
import { DATE_OFFSETS } from "@/save/scenario-date";
import { parseCount } from "./scenario-input";

const difficultyOptions = (): SelectOption[] =>
  DIFFICULTIES.map((d) => ({
    value: String(d.value),
    label: d.label,
  }));

const CYCLE_END_LABELS: Record<CycleEnd, Localized> = {
  clear: { ja: "クリアとして終える", en: "End as a clear" },
  gone: { ja: "立ち去りとして終える", en: "End by leaving" },
};

function cycleReportText(r: NewCycleReport): string {
  const parts = [
    r.end === "clear"
      ? tr({ ja: "周回数とクリア回数を1つ増やしました", en: "Added 1 to the playthrough count and the clear count" })
      : tr({
          ja: "周回数と立ち去った回数を1つ増やしました",
          en: "Added 1 to the playthrough count and the times left",
        }),
    tr({ ja: `金庫に ${r.vaultAdded.toLocaleString()} 両`, en: `${r.vaultAdded.toLocaleString()} ryo to the Treasury` }),
    tr({ ja: `武器箪笥へ ${r.weaponsMoved} 本`, en: `${r.weaponsMoved} weapons to the weapon chest` }),
    tr({ ja: `道具の箪笥へ ${r.itemsMoved} 枠`, en: `${r.itemsMoved} slots to the item chest` }),
    tr({ ja: `部品の箪笥へ ${r.partsMoved} 個`, en: `${r.partsMoved} parts to the parts chest` }),
    tr({ ja: `取り除いた貴重品 ${r.valuablesRemoved} 枠`, en: `${r.valuablesRemoved} valuables slots removed` }),
  ];
  const left = [
    r.weaponsLeft && tr({ ja: `武器袋に ${r.weaponsLeft} 本`, en: `${r.weaponsLeft} weapons in the weapon sack` }),
    r.itemsLeft && tr({ ja: `手持ちに ${r.itemsLeft} 枠`, en: `${r.itemsLeft} slots in hand` }),
    r.partsLeft && tr({ ja: `部品 ${r.partsLeft} 個`, en: `${r.partsLeft} parts` }),
  ].filter(Boolean);
  const sep = tr({ ja: "、", en: ", " });
  return tr({
    ja: `${parts.join(sep)}。${left.length ? `箪笥に入りきらず残ったもの：${left.join(sep)}。` : ""}`,
    en: `${parts.join(sep)}.${left.length ? ` Left behind because the chests are full: ${left.join(sep)}.` : ""}`,
  });
}

const readCycle = (b: Uint8Array) => ({ difficulty: readDifficulty(b), counts: readCycleCounts(b), publicOrder: readPublicOrder(b) });

/**
 * 難易度（0x0000）、治安（0x0015。✅ [U] 書き換えはゲームに反映される）、周回数（0x0B8C）と、
 * 新しい周回を始める書き込み（new-cycle.ts）。view が null ならセーブ未読み込み
 */
export function CycleCard() {
  const { view: data, error: readError } = useSaveView(readCycle);
  const view = data?.difficulty ?? null;
  const counts = data?.counts ?? null;
  const publicOrder = data?.publicOrder ?? null;
  // message は新しい周回の結果（成功文かエラー）。読み込み直すと消える
  const { write: update, tryWrite, message } = useWrite();
  const { advanced } = useAdvancedMode();

  const start = (end: CycleEnd) => tryWrite((b) => startNewCycle(b, end), cycleReportText);
  // セーブ未読み込みなら「—」。読めたが段階の表にない値なら「不明」
  const unknown = tr({ ja: "不明", en: "Unknown" });
  const publicOrderLevelText = publicOrder ? (publicOrder.level ?? unknown) : "—";
  const clearsText = counts
    ? counts.clears.map((n, i) => `${DIFFICULTIES[i]?.label ?? unknown} ${n}`).join(tr({ ja: "・", en: ", " }))
    : "—";

  // 確度：難易度の書き換えの反映は ✅。新しい周回は ✅（以前の版で確認）。
  // 普通＝1・難しい＝2 は 0 と 3 の間を埋めた 🔶 推測。治安の 1日目 0 の例と初期値 50 の食い違いは ❓。
  // 周回数が PLAY_COUNT_REVEALS_BEST_ROUTE 以上で真ルートの枠と線が全部出るのは ❓ 要ゲーム内確認、死亡で増えるかは ❓
  return (
    <AnchoredCard
      anchor={AMIHAMA_ANCHORS.cycle}
      title={tr({ ja: "難易度・治安・周回", en: "Difficulty, public order & playthroughs" })}
      description={
        <>
          {tr({
            ja: "難易度・治安・周回数を編集できます。「新しい周回」で、物語を終えたときと同じように次の周回を始められます。",
            en: "Edit the difficulty, public order and playthrough count. \"New playthrough\" starts the next playthrough the same way as finishing the story.",
          })}
          {/* 新しい周回：物語を終えたときにゲームが行う引き継ぎと初期化を同じ順序で行う。終わり方はクリアか立ち去り。
              次のロードの「続きから」で難易度と主人公の設定に進み、序章（船上の侍）から遊べる。
              段階だけを序章に戻すのは「主人公」画面のボタン */}
          <br />
          {tr({ ja: "今の治安：", en: "Current public order: " })}
          {publicOrderLevelText}
          <br />
          {tr({ ja: "クリア回数：", en: "Clears: " })}
          {clearsText}
          {tr({ ja: "／立ち去った回数：", en: " / Times left: " })}
          {counts ? counts.goneCount : "—"}
        </>
      }
    >
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <PageBanner error={readError} className="col-span-full" />
        <SelectRow
          label={tr({ ja: "難易度", en: "Difficulty" })}
          offset={DIFFICULTY_OFFSET}
          value={view ? String(view.value) : null}
          currentLabel={view ? unknown : undefined}
          options={difficultyOptions()}
          problem={view?.problem ?? null}
          warning={formatWarnings(view?.warnings)}
          note={tr({
            ja: "書き換えはゲーム内の難易度に反映されます",
            en: "Changing this changes the difficulty in the game",
          })}
          onChange={(v) => update((b) => writeDifficulty(b, Number(v)))}
        />
        <FieldRow
          label={tr({ ja: "治安", en: "Public order" })}
          offset={PUBLIC_ORDER_OFFSET}
          value={publicOrder?.value ?? null}
          problem={publicOrder?.problem ?? null}
          warning={formatWarnings(publicOrder?.warnings)}
          format={String}
          parse={(input) => parseCount(input, (v) => validatePublicOrder(v, { advanced }))}
          apply={(v) => update((b) => writePublicOrder(b, v, { advanced }))}
          inputMode="numeric"
          hint={advanced ? "0〜255" : `0〜${PUBLIC_ORDER_MAX}`}
          note={tr({
            ja: `初期値は 50 です。${publicOrderLevelsText()}`,
            en: `Starts at 50. ${publicOrderLevelsText()}`,
          })}
        />
        <FieldRow
          label={tr({ ja: "周回数", en: "Playthroughs" })}
          offset={PLAY_COUNT_OFFSET}
          value={counts?.playCount ?? null}
          problem={counts?.problem ?? null}
          warning={formatWarnings(counts?.warnings)}
          format={String}
          parse={(input) => parseCount(input, (v) => validatePlayCount(v, { advanced }))}
          apply={(n) => update((b) => writePlayCount(b, n, { advanced }))}
          inputMode="numeric"
          hint={advanced ? "0〜4,294,967,295" : `0〜${PLAY_COUNT_MAX.toLocaleString()}`}
          note={tr({
            ja: `終えた周回の数で、クリアでも立ち去りでも物語を終えるたびにゲームが1つ増やします。新しい周回の初期化では 0 になりません。${PLAY_COUNT_REVEALS_BEST_ROUTE} 以上だと、イベントチャートに真ルートの枠と線が全部出ます`,
            en: `The number of finished playthroughs. The game adds 1 each time you finish the story, whether by clearing it or leaving. Starting a new playthrough doesn't reset it to 0. At ${PLAY_COUNT_REVEALS_BEST_ROUTE} or more, all true-route boxes and lines appear on the event chart`,
          })}
        />
        <FieldShell
          label={tr({ ja: "新しい周回", en: "New playthrough" })}
          offset={DATE_OFFSETS.dayTime}
          problem={view?.problem ?? null}
          hint={message && !message.error ? message.text : undefined}
          error={message?.error ? message.text : null}
          note={tr({
            ja:
              "引き継ぎ：周回数と、クリアなら難易度ごとのクリア回数、立ち去りなら立ち去った回数を1つ増やします。" +
              " 過去の周回の記録を更新し、なりわいの一部のフラグを初期化します。" +
              " 武器袋の武器は武器箪笥へ、所持金は金庫へ、手持ちの道具は道具の箪笥へ、持っている刃・鍔・柄は部品の箪笥へ移します。箪笥に入りきらないものは元の場所に残ります。帯刀はそのまま次の主人公が持ちます。" +
              " 初期化：難易度は普通、段階は序章、現在地は港、時間帯・時間帯を進める保留量・所持金は 0、周回中の記録・技ごとの斬殺数・道具の使用回数もリセット、" +
              " HP・活力は初期値、イベントの状態は未到達、シナリオのフラグは初期値（施設・門柵の一部などは残す）、ヒントはなし、" +
              " 貴重品は鉄4種だけを残す、夜這いの記録・約束を消す（回数は残す）、町の人の状態を初期化。" +
              " ゲームが流通の武器を確率で消したり変えたりする処理は行いません。元に戻す操作はないので、書き換える前のセーブを残してください",
            en:
              "Carried over: adds 1 to the playthrough count, and to the clear count for the difficulty (when clearing) or the times left (when leaving)." +
              " Updates the records of past playthroughs and resets some mission flags." +
              " Moves weapons in the weapon sack to the weapon chest, funds to the Treasury, items in hand to the item chest, and blades, guards and grips you carry to the parts chest. Anything that doesn't fit stays where it was. The equipped weapons go with the next character as they are." +
              " Reset: difficulty to Normal, story stage to the prologue, location to the Harbor; time of day, queued time advance and funds to 0; this playthrough's records, kills per move and item use counts are reset;" +
              " HP and Vitality to their starting values, events to not reached, story flags to their starting values (some, such as facilities and some gates and fences, are kept), no hint;" +
              " only the four iron items are kept among valuables; night crawling records and promises are erased (counts are kept); townsfolk status is reset." +
              " The game's random removal or change of weapons in circulation is not done. There is no undo, so keep a copy of the save before writing",
          })}
        >
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CYCLE_END_LABELS) as CycleEnd[]).map((end) => (
              <ActionButton
                key={end}
                size="sm"
                disabled={!view || view.problem !== null}
                label={tr(CYCLE_END_LABELS[end])}
                confirm="repeat"
                onAction={() => start(end)}
              />
            ))}
          </div>
        </FieldShell>
      </CardContent>
    </AnchoredCard>
  );
}

const publicOrderLevelsText = () =>
  PUBLIC_ORDER_LEVELS.map(
    (l, i) =>
      `${l.label} ${l.min}${tr({ ja: "〜", en: "–" })}${i === 0 ? PUBLIC_ORDER_MAX : PUBLIC_ORDER_LEVELS[i - 1].min - 1}`,
  ).join(tr({ ja: "／", en: " / " }));
