import { useMemo, useState, type ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatOffset } from "@/lib/format";
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
import { charmLabel, type NumberKey, type WeaponView } from "@/save/weapon";
import { WeaponEditor } from "./weapon-editor";
import { Chevron, SwitchRow, WeaponImage } from "./weapon-rows";
import { COLLAPSIBLE_ANIMATION, NONE, isOnButton, type WeaponUpdate } from "./weapon-ui";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

      {/* 🟢 レコードの先頭・0x1A6B2 付近の別の記録・帯刀の読み込み元。❓ 用途不明の領域 */}
      <p className="text-muted-foreground text-xs">
        各フィールドのバイトだけを書き換えます。用途不明の領域は変えません。レコードの位置は、完成武器ID
        の位置を先頭として表示します（既存エディタ [TS] の位置より 6 B 後ろ）。0x1A6B2
        付近にある帯刀と同じ並び（帯刀のコピーではない別の記録）は書き換えません。ゲームは帯刀を
        0xA4C8〜 と帯刀の状態から読みます。
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
          {/* 位置は [U] の差分、ロード時の扱いは 🟢。🔶 書き換えたときのゲーム内の反映は未確認（要ゲーム内確認） */}
          <InfoTip offset={`${formatOffset(BELT_STATE.count)}〜0xA6AF`} />
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
            // 🟢 ロード時の二刀流の解除。🔶 どの組み合わせで持てるか（種類の制限）は未確認
            note="左手に持てない武器ならロード時に二刀流が解除されます"
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
  const charmIds = weapon.charms.value.filter((id): id is number => id !== null);
  const charms: string[] = charmIds.length > 3
    ? [...new Set(charmIds)].map((id) => `${charmLabel(id)} ×${charmIds.filter((value) => value === id).length}`)
    : charmIds.map((id) => charmLabel(id) ?? `?${id}`);
  while (charms.length < 3) charms.push("---");
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
            {charms.map((label, slot) => (
              <li key={slot} aria-label={`魅力 ${slot + 1}：${label === "---" ? "なし" : label}`}>
                <span>{label}</span>
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
  update: WeaponUpdate;
}) {
  const base = beltOffset(index);
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
              <Chevron />
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
              // 🟢 帯刀の本数より後ろはゲームが読まない
              <Badge variant="outline">帯刀の本数より後ろ（読まれない）</Badge>
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
          <CardContent className="pt-6">
            <WeaponEditor weapon={weapon} base={base} update={update} />
          </CardContent>
        </CollapsibleContent>
    </Collapsible>
  );
}
