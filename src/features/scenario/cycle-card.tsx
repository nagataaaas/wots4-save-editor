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

const difficultyOptions: SelectOption[] = DIFFICULTIES.map((d) => ({
  value: String(d.value),
  label: d.label,
}));

const CYCLE_END_LABELS: Record<CycleEnd, string> = {
  clear: "クリアとして終える",
  gone: "立ち去りとして終える",
};

function cycleReportText(r: NewCycleReport): string {
  const parts = [
    r.end === "clear"
      ? "周回数とクリア回数を1つ増やしました"
      : "周回数と立ち去った回数を1つ増やしました",
    `金庫に ${r.vaultAdded.toLocaleString()} 両`,
    `武器箪笥へ ${r.weaponsMoved} 本`,
    `道具の箪笥へ ${r.itemsMoved} 枠`,
    `部品の箪笥へ ${r.partsMoved} 個`,
    `取り除いた貴重品 ${r.valuablesRemoved} 枠`,
  ];
  const left = [
    r.weaponsLeft && `武器袋に ${r.weaponsLeft} 本`,
    r.itemsLeft && `手持ちに ${r.itemsLeft} 枠`,
    r.partsLeft && `部品 ${r.partsLeft} 個`,
  ].filter(Boolean);
  return `${parts.join("、")}。${left.length ? `箪笥に入りきらず残ったもの：${left.join("、")}。` : ""}`;
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
  const publicOrderLevelText = publicOrder ? (publicOrder.level ?? "不明") : "—";
  const clearsText = counts
    ? counts.clears.map((n, i) => `${DIFFICULTIES[i]?.label ?? "不明"} ${n}`).join("・")
    : "—";

  // 確度：難易度の書き換えの反映は ✅。新しい周回は ✅（以前の版で確認）。
  // 普通＝1・難しい＝2 は 0 と 3 の間を埋めた 🔶 推測。治安の 1日目 0 の例と初期値 50 の食い違いは ❓。
  // 周回数が PLAY_COUNT_REVEALS_BEST_ROUTE 以上で真ルートの枠と線が全部出るのは ❓ 要ゲーム内確認、死亡で増えるかは ❓
  return (
    <AnchoredCard
      anchor={AMIHAMA_ANCHORS.cycle}
      title="難易度・治安・周回"
      description={
        <>
          難易度・治安・周回数を編集できます。「新しい周回」で、物語を終えたときと同じように次の周回を始められます。
          {/* 新しい周回：物語を終えたときにゲームが行う引き継ぎと初期化を同じ順序で行う。終わり方はクリアか立ち去り。
              次のロードの「続きから」で難易度と主人公の設定に進み、序章（船上の侍）から遊べる。
              段階だけを序章に戻すのは「主人公」画面のボタン */}
          <br />
          今の治安：{publicOrderLevelText}
          <br />
          クリア回数：{clearsText}／立ち去った回数：{counts ? counts.goneCount : "—"}
        </>
      }
    >
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <PageBanner error={readError} className="col-span-full" />
        <SelectRow
          label="難易度"
          offset={DIFFICULTY_OFFSET}
          value={view ? String(view.value) : null}
          currentLabel={view ? "不明" : undefined}
          options={difficultyOptions}
          problem={view?.problem ?? null}
          warning={formatWarnings(view?.warnings)}
          note="書き換えはゲーム内の難易度に反映されます"
          onChange={(v) => update((b) => writeDifficulty(b, Number(v)))}
        />
        <FieldRow
          label="治安"
          offset={PUBLIC_ORDER_OFFSET}
          value={publicOrder?.value ?? null}
          problem={publicOrder?.problem ?? null}
          warning={formatWarnings(publicOrder?.warnings)}
          format={String}
          parse={(input) => parseCount(input, (v) => validatePublicOrder(v, { advanced }))}
          apply={(v) => update((b) => writePublicOrder(b, v, { advanced }))}
          inputMode="numeric"
          hint={advanced ? "0〜255" : `0〜${PUBLIC_ORDER_MAX}`}
          note={`初期値は 50 です。${publicOrderLevelsText}`}
        />
        <FieldRow
          label="周回数"
          offset={PLAY_COUNT_OFFSET}
          value={counts?.playCount ?? null}
          problem={counts?.problem ?? null}
          warning={formatWarnings(counts?.warnings)}
          format={String}
          parse={(input) => parseCount(input, (v) => validatePlayCount(v, { advanced }))}
          apply={(n) => update((b) => writePlayCount(b, n, { advanced }))}
          inputMode="numeric"
          hint={advanced ? "0〜4,294,967,295" : `0〜${PLAY_COUNT_MAX.toLocaleString()}`}
          note={`終えた周回の数で、クリアでも立ち去りでも物語を終えるたびにゲームが1つ増やします。新しい周回の初期化では 0 になりません。${PLAY_COUNT_REVEALS_BEST_ROUTE} 以上だと、イベントチャートに真ルートの枠と線が全部出ます`}
        />
        <FieldShell
          label="新しい周回"
          offset={DATE_OFFSETS.dayTime}
          problem={view?.problem ?? null}
          hint={message && !message.error ? message.text : undefined}
          error={message?.error ? message.text : null}
          note={
            <>
              引き継ぎ：周回数と、クリアなら難易度ごとのクリア回数、立ち去りなら立ち去った回数を1つ増やします。
              過去の周回の記録を更新し、なりわいの一部のフラグを初期化します。
              武器袋の武器は武器箪笥へ、所持金は金庫へ、手持ちの道具は道具の箪笥へ、持っている刃・鍔・柄は部品の箪笥へ移します。箪笥に入りきらないものは元の場所に残ります。帯刀はそのまま次の主人公が持ちます。
              初期化：難易度は普通、段階は序章、現在地は港、時間帯・時間帯を進める保留量・所持金は 0、周回中の記録・技ごとの斬殺数・道具の使用回数もリセット、
              HP・活力は初期値、イベントの状態は未到達、シナリオのフラグは初期値（施設・門柵の一部などは残す）、ヒントはなし、
              貴重品は鉄4種だけを残す、夜這いの記録・約束を消す（回数は残す）、町の人の状態を初期化。
              ゲームが流通の武器を確率で消したり変えたりする処理は行いません。元に戻す操作はないので、書き換える前のセーブを残してください
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CYCLE_END_LABELS) as CycleEnd[]).map((end) => (
              <ActionButton
                key={end}
                size="sm"
                disabled={!view || view.problem !== null}
                label={CYCLE_END_LABELS[end]}
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

const publicOrderLevelsText = PUBLIC_ORDER_LEVELS.map(
  (l, i) =>
    `${l.label} ${l.min}〜${i === 0 ? PUBLIC_ORDER_MAX : PUBLIC_ORDER_LEVELS[i - 1].min - 1}`,
).join("／");
