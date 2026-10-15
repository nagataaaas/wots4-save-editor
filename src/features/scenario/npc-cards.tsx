import { tr } from "@/lib/i18n";
import { SearchField, SearchScope } from "@/lib/search-context";
import { NPC_ANCHORS } from "./anchors";
import { CollapsibleCard } from "@/components/collapsible-card";
import { InfoTip } from "@/components/info-tip";
import { Label } from "@/components/ui/label";
import { FlagRow } from "@/components/flag-row";
import { CHARACTER_FLAGS } from "@/save/flags/characters";
import { FACTION_EXIT_FLAGS } from "@/save/flags/faction-exit";
import { NPC_DOJO_FLAGS, NPC_OTHER_FLAGS, NPC_SMITH_FLAGS } from "@/save/flags/npc-events";
import { TOWNSFOLK_PEOPLE, personOffset, reviveNote, writePersonDead, readTownsfolk, isPersonDead } from "@/save/townsfolk";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { Checkbox } from "@/components/ui/checkbox";
import { WarningTip } from "@/components/warning-tip";
import { useWrite } from "@/lib/use-write";
import { WriteError } from "@/components/write-error";
import { FlagSection } from "./flag-section";

/** 勢力の退場（FACTION_EXIT_FLAGS） */
export function FactionExitCard() {
  // 確度：3つとも ✅ 書き換えで確認
  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.factionExit}
      title={tr({ ja: "勢力の退場", en: "Faction exit" })}
      contentClassName="grid gap-4 sm:grid-cols-3"
      description={
        <>
          {tr({
            ja: "幕府・外国・攘夷の勢力を、町から退場させるかを選べます。",
            en: "Choose whether the Shogunate, the Foreigners or the Prajnas leave town.",
          })}
          <br />
          {tr({
            ja: "退場した勢力の人物は町に出てこなくなります。",
            en: "People of a faction that has left no longer appear in town.",
          })}
          {/* 外国・攘夷は物語の中でも退場する（ローラの死・帰国、般若党の壊滅など）。幕府が退場する場面はない */}
        </>
      }
    >
      {FACTION_EXIT_FLAGS.map((flag) => (
        <FlagRow key={flag.offset} flag={flag} />
      ))}
    </CollapsibleCard>
  );
}

/**
 * 🟢 重要人物と寿司屋の状態（CHARACTER_FLAGS）。
 * 朱美・ローラ・J.J. に 1 を書くといなくなるのは ✅。ほかの人物の書き換えの効果は ❓ 要ゲーム内確認
 */
export function CharactersCard() {
  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.characters}
      title={tr({ ja: "人物の状態", en: "Character status" })}
      contentClassName="grid gap-4 sm:grid-cols-3 lg:grid-cols-5"
      description={
        <>
          {tr({
            ja: "重要人物と寿司屋の生死などの状態を選べます。",
            en: "Choose whether key characters and the Sushi-ya are alive or dead, and other states.",
          })}
          <br />
          {tr({
            ja: "各欄の説明に、状態が変わる場面と、影響するイベントを書いています。",
            en: "Each field's help explains when the state changes and which events it affects.",
          })}
          {/* 周回の始めはすべて生存（通常）。赤城には病院に運ばれて助かった状態、J.J. には伯爵救出の成功・打ち解けた・逮捕された状態がある。
              鬼怒川怨仙は船上の侍で生存になり、大老暗殺計画で倒すと偽物が死亡になる。朱美・ローラ・J.J. は死亡にするといなくなる */}
        </>
      }
    >
      {CHARACTER_FLAGS.map((flag) => (
        <FlagRow key={flag.offset} flag={flag} />
      ))}
    </CollapsibleCard>
  );
}

/**
 * 🟢 町の人（人物番号 p）の死亡のビット（0x015C + 12 × p の bit0）。view が null ならセーブ未読み込み。
 * 堂島・寿司屋・鍛冶屋のおやじの死亡の位置は ✅ 差分で確認、寿司屋と鍛冶屋のおやじが外すと生き返るのは ✅。
 * ほかの人が外せば町に出てくるかは ❓ 要ゲーム内確認
 */
export function PeopleCard() {
  const { view, error: readError, problem } = useSaveView(readTownsfolk);
  const groups = [...new Set(TOWNSFOLK_PEOPLE.map((x) => x.group))];
  const deadOf = (p: number) => (view ? isPersonDead(view, p) : null);

  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.townsfolk}
      title={tr({ ja: "町の人の生死", en: "Townsfolk alive/dead" })}
      contentClassName="flex flex-col gap-4"
      description={
        <>
          {tr({
            ja: "死亡した（町からいなくなった）町の人を、チェックを外して生き返らせられます。",
            en: "Uncheck townsfolk who died (left town) to bring them back.",
          })}
          <br />
          {tr({
            ja: "警告のアイコンが付いた人は、外すだけでは生き返りません。",
            en: "People with a warning icon don't come back just by unchecking.",
          })}
          {/* チェックの付いた人は町に出てこない（引退なども含む）。周回の終わりに全員が生き返る。
              重要人物・寿司屋・薬屋は、警告のアイコンに一緒に戻すものを書く */}
        </>
      }
    >
      <PageBanner error={readError} problem={problem} />
      {groups.map((g) => (
        <SearchScope key={g} title={g} className="flex flex-col gap-2">
          <p className="text-sm font-medium">{g}</p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {TOWNSFOLK_PEOPLE.filter((x) => x.group === g).map((x) => (
              <PersonRow key={x.p} p={x.p} name={x.name} dead={deadOf(x.p)} readOnly={problem !== null} />
            ))}
          </div>
        </SearchScope>
      ))}
    </CollapsibleCard>
  );
}

/** 町の人1人の死亡のチェック。dead が null ならセーブ未読み込み。書き込みのエラーはこの人の下に出す */
function PersonRow({ p, name, dead, readOnly }: { p: number; name: string; dead: boolean | null; readOnly: boolean }) {
  const { tryWrite, error } = useWrite();
  const revive = reviveNote(p);
  return (
    <SearchField label={name} className="flex flex-wrap items-center gap-1">
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox
          checked={dead ?? false}
          disabled={dead === null || readOnly}
          onCheckedChange={(on) => {
            tryWrite((b) => writePersonDead(b, p, on));
          }}
        />
        <span>{name}</span>
      </Label>
      <InfoTip offset={personOffset(p)} />
      {revive && (
        <WarningTip
          warning={tr({
            ja: `外すだけでは生き返りません：${revive}`,
            en: `Unchecking alone won't bring them back: ${revive}`,
          })}
        />
      )}
      <WriteError error={error} className="basis-full" />
    </SearchField>
  );
}

/**
 * 🟢 町の人（鍛冶屋・道場など）のイベントのフラグ（NPC_SMITH_FLAGS・NPC_DOJO_FLAGS・NPC_OTHER_FLAGS）。
 * 鍛冶屋の後継者イベント・鍛冶屋の状態・堂島が鍛冶屋を継いだかは ✅ 書き換えで確認。そのほかは ❓ 要ゲーム内確認
 */
export function NpcFlagsCard() {
  // 道場の画面から「道場・先生」（NPC_LINKS.dojoFlags）へリンクしている
  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.flags.card}
      title={tr({ ja: "NPCイベントフラグ", en: "NPC event flags" })}
      contentClassName="flex flex-col gap-6"
      description={
        <>
          {tr({
            ja: "鍛冶屋・道場・堂島・先生など、町の人のイベントの進み具合を編集できます。",
            en: "Edit the progress of townsfolk events, such as the Smithy, the dojo, Dojima and Sensei.",
          })}
          <br />
          {tr({
            ja: "連続なりわいの進み具合は「なりわい」画面にあります。",
            en: "Progress of mission series is on the Missions screen.",
          })}
          {/* 堂島が鍛冶屋を継いだかは、周回後に誰が鍛冶屋になるかを決める */}
        </>
      }
    >
      <FlagSection anchor={NPC_ANCHORS.flags.smith} title={tr({ ja: "鍛冶屋", en: "Smithy" })} flags={NPC_SMITH_FLAGS} />
      <FlagSection anchor={NPC_ANCHORS.flags.dojo} title={tr({ ja: "道場・先生", en: "Dojo & Sensei" })} flags={NPC_DOJO_FLAGS} />
      <FlagSection anchor={NPC_ANCHORS.flags.other} title={tr({ ja: "その他", en: "Others" })} flags={NPC_OTHER_FLAGS} />
    </CollapsibleCard>
  );
}
