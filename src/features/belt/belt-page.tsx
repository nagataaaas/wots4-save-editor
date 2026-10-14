import { AnchoredCard } from "@/components/anchored-card";
import { CollapsibleCard } from "@/components/collapsible-card";
import { InfoTip } from "@/components/info-tip";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteError } from "@/components/write-error";
import { useIndexing } from "@/lib/search-collector";
import {
  BELT_COUNT,
  BELT_STATE,
  BELT_STATE_LAST,
  beltOffset,
  readBelt,
  usableBeltWeapons,
  writeBeltDual,
  writeBeltDualEnabled,
  writeBeltRight,
  type BeltState,
  type BeltView,
} from "@/save/belt";
import { weaponDisplayName, type WeaponView } from "@/save/weapon";
import { BELT_ANCHORS } from "./anchors";
import { WEAPON_ANCHORS } from "@/features/weapon/anchors";
import { WeaponEditor } from "@/features/weapon/weapon-editor";
import { WeaponPanel } from "@/features/weapon/weapon-panel";
import { SwitchRow } from "@/features/weapon/weapon-rows";
import { NONE } from "@/features/weapon/weapon-ui";

/** 「n本目：名前」。空き枠は「n本目：空き」、未読み込みは「n本目」 */
const weaponTitle = (w: WeaponView | null, i: number) =>
  `${i + 1}本目${!w ? "" : w.empty ? "：空き" : `：${weaponDisplayName(w)}`}`;

export function BeltPage() {
  const { save } = useSave();
  const { view, error: readError, problem } = useSaveView(readBelt, { problem: (v) => v.problem });
  const k = save?.loadId ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      <StateCard view={view} />

      {Array.from({ length: BELT_COUNT }, (_, i) => (
        <WeaponCard key={`${k}-${i}`} index={i} weapon={view?.weapons[i] ?? null} state={view?.state ?? null} />
      ))}

      {/* 🟢 レコードの先頭は完成武器ID の位置（既存エディタ [TS] の位置より 6 B 後ろ）。0x1A6B2 付近に帯刀と同じ並びの別の記録があるが書き換えない（帯刀のコピーではない）。ゲームは帯刀を 0xA4C8〜 と帯刀の状態から読む。❓ 用途不明の領域は変えない */}
      <p className="text-muted-foreground text-xs">
        用途が分かっていない領域は変更しません。
      </p>
    </div>
  );
}

/** 帯刀の状態（右手・二刀流の左手）。view が null ならセーブ未読み込み */
function StateCard({ view }: { view: BeltView | null }) {
  const { write, tryWrite, error } = useWrite();
  const state = view?.state ?? null;
  const indexing = useIndexing();
  const problem = state?.problem ?? null;
  const disabled = state === null || problem !== null;

  // 🟢 手に持てるのは、帯刀の本数の内側にある空きでない武器
  const usableOptions = (exclude: number | null): SelectOption[] =>
    view
      ? usableBeltWeapons(view, exclude).map((i) => ({ value: String(i), label: weaponTitle(view.weapons[i], i) }))
      : [];

  return (
    // 位置は [U] の差分、ロード時の扱いは 🟢。🔶 書き換えたときのゲーム内の反映は未確認（要ゲーム内確認）
    <AnchoredCard
      anchor={BELT_ANCHORS.state}
      title="帯刀の状態"
      extra={<InfoTip offset={`${formatOffset(BELT_STATE.count)}〜${formatOffset(BELT_STATE_LAST)}`} />}
      description="手に持つ武器と、二刀流にするかを選べます。"
    >
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
          <SwitchRow
            label="二刀流"
            offset={BELT_STATE.dual}
            checked={state?.left != null}
            disabled={disabled}
            // オンにしたときの左手は save 側で決める（右手のほかで持てる最初の武器）
            onChange={(on) => tryWrite((b) => writeBeltDualEnabled(b, on))}
          />
        </div>
        <SelectRow
          label="右手（選んでいる武器）"
          offset={BELT_STATE.right}
          value={state ? (state.right === null ? NONE : String(state.right)) : null}
          currentLabel={state && state.right !== null ? `${state.right + 1}本目` : undefined}
          options={[{ value: NONE, label: "何も選んでいない" }, ...usableOptions(state?.left ?? null)]}
          problem={problem}
          onChange={(v) => write((b) => writeBeltRight(b, v === NONE ? null : Number(v)))}
        />
        {(state?.left != null || indexing) && (
          <SelectRow
            label="左手"
            offset={BELT_STATE.left}
            value={state?.left != null ? String(state.left) : null}
            options={usableOptions(state?.right ?? null)}
            problem={problem}
            // 🟢 ロード時の二刀流の解除。🔶 どの組み合わせで持てるか（種類の制限）は未確認
            note="左手に持てない武器ならロード時に二刀流が解除されます"
            onChange={(v) => write((b) => writeBeltDual(b, Number(v)))}
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
          <WriteError error={error} className="sm:col-span-2" />
        )}
      </CardContent>
    </AnchoredCard>
  );
}

/** 帯刀1本分。weapon が null ならセーブ未読み込み */
function WeaponCard({
  index,
  weapon,
  state,
}: {
  index: number;
  weapon: WeaponView | null;
  state: BeltState | null;
}) {
  // レコードの先頭。丸ハテナにも、編集欄の書き込みにもこれを使う
  const offset = beltOffset(index);
  // 最初は閉じておく（ユーザー判断 2026-10-05）。リンク先なら開く
  const searchLabel = `${index + 1}本目`;
  const roles = [state?.right === index && "右手", state?.left === index && "左手"].filter(
    (role): role is string => typeof role === "string",
  );

  if (weapon?.empty) {
    return (
      <AnchoredCard
        anchor={WEAPON_ANCHORS.weapon(index)}
        searchLabel={searchLabel}
        title={weaponTitle(weapon, index)}
        extra={<InfoTip offset={offset} />}
        description="空き枠は編集できません（武器を新しく作る機能はありません）。"
      />
    );
  }

  const recordProblem = weapon?.problem ?? null;

  return (
    <CollapsibleCard
      anchor={WEAPON_ANCHORS.weapon(index)}
      searchLabel={searchLabel}
      title={(open) => (
        <>
          {searchLabel}
          <span className="text-muted-foreground text-xs font-normal">{open ? "編集を閉じる" : "編集する"}</span>
        </>
      )}
      extra={
        <>
          <InfoTip offset={offset} />
          {roles.map((r) => (
            <Badge key={r}>{r}</Badge>
          ))}
          {weapon && state && index >= state.count && (
            // 🟢 帯刀の本数より後ろはゲームが読まない
            <Badge variant="outline">帯刀の本数より後ろ（読まれない）</Badge>
          )}
          {weapon?.nameHidden.value && <Badge variant="outline">名前を隠す</Badge>}
        </>
      }
      headerExtra={<WeaponPanel weapon={weapon} />}
      description={recordProblem && <span className="text-destructive">読み取り専用：{recordProblem}</span>}
    >
      <WeaponEditor weapon={weapon} offset={offset} />
    </CollapsibleCard>
  );
}
