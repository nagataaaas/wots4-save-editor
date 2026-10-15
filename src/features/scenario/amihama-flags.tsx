import { tr } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { SearchScope } from "@/lib/search-context";
import { AMIHAMA_ANCHORS, EVENTS_LINKS } from "./anchors";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FlagGrid, FlagRow } from "@/components/flag-row";
import { useFlag } from "@/lib/use-flag";
import { flagProblem, readFlag } from "@/save/flags/byte-flag";
import { FACILITY_FLAGS, facilitiesReadyForLightOfHope, facilitySlotEvent, type FacilityFlag } from "@/save/flags/facilities";
import { GATE_CLOSE_FLAGS, GATE_DOOR_FLAGS, GATE_RECRUIT_FLAGS } from "@/save/flags/gates";
import { useSaveView } from "@/lib/use-save-view";
import { FlagSection } from "./flag-section";

/** 門・柵の状態（GATE_RECRUIT_FLAGS・GATE_CLOSE_FLAGS・GATE_DOOR_FLAGS） */
export function GateFlagsCard() {
  const { go } = useNavigation();
  // 確度：洞窟内の柵（0x3761）が 1 で降りて通行を塞ぐのは ✅、0 に戻したときの上昇・通行の回復は ❓ 要ゲーム内確認。
  // 表門（0x37FA）・外門（0x3764）・神社入口の柵（0x37C3）が 1 → 0 で開くのは ✅、裏門（0x37FB）の反映は ❓ 要ゲーム内確認。
  // 閉鎖フラグが大寄せ前にも有効なこと、大寄せ以降のルート分岐 02 で門・柵が閉じることは 🟢
  return (
    <CollapsibleCard
      anchor={AMIHAMA_ANCHORS.gates.card}
      title={tr({ ja: "門・柵の状態", en: "Gates and fences" })}
      contentClassName="flex flex-col gap-6"
      description={
        <>
          {tr({
            ja: "代官所・居留地・神社などの門や柵を開け閉めできます。",
            en: "Open or close the gates and fences of the Magistrate's Office, Little Britain, the Shrine and more.",
          })}
          <br />
          {tr({
            ja: "ルートやイベントによっても閉じるため、開けても通れないことがあります。",
            en: "Routes and events can also close them, so you may not be able to pass even when open.",
          })}
          {/* 神社は「入口の柵」と「洞窟内の柵」が別々の閉鎖の指定。洞窟内の柵は閉じると降りて通行を塞ぐ。
              代官所の表門・居留地の外門・神社入口の柵は、閉鎖指定なしにすると開く。閉鎖の指定は大寄せ前にも有効。
              初日勧誘の項目は序章〜1日目昼の開放判定に使われ、開いていれば通れる */}
        </>
      }
    >
      <FlagSection
        anchor={AMIHAMA_ANCHORS.gates.recruit}
        title={tr({ ja: "初日勧誘（1日目昼のみ影響）", en: "First-day invitations (affects Day 1 daytime only)" })}
        flags={GATE_RECRUIT_FLAGS}
      />
      <FlagSection
        anchor={AMIHAMA_ANCHORS.gates.close}
        title={tr({
          ja: "閉鎖（1日目夕～大老の大寄せまで）",
          en: "Closures (Day 1 evening to The Chief Minister's Big Move)",
        })}
        flags={GATE_CLOSE_FLAGS}
      />
      <SearchScope
        title={tr({ ja: "大老の大寄せ以降", en: "After The Chief Minister's Big Move" })}
        className="flex flex-col gap-2"
      >
        <h3 className="text-sm font-medium">
          {tr({ ja: "大老の大寄せ以降", en: "After The Chief Minister's Big Move" })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tr({ ja: "", en: "Once " })}
          <button type="button" onClick={() => go("event-chart", EVENTS_LINKS.routeJudge)} className="text-primary underline underline-offset-4">
            {tr({ ja: "剣術大会以後のルート分岐", en: "the route split after the Battle Tournament" })}
          </button>
          {tr({
            ja: "が「入れない」になった段階で、対応する勢力の門・柵が閉じます。",
            en: " is set to \"Can't enter\", that faction's gates and fences close.",
          })}
        </p>
        <p className="text-sm text-muted-foreground">
          {tr({
            ja: "グループ名は進行時期の目安です。初日勧誘は序章にも影響し、閉鎖の指定は初日昼以前・大寄せ以降にも有効です。",
            en: "Group names are a rough guide to the timing. First-day invitations also affect the prologue, and closures also apply before Day 1 daytime and after The Chief Minister's Big Move.",
          })}
          {tr({
            ja: "大寄せ以降は閉鎖指定なしにしても、ルート分岐が「入れない」なら閉じます。",
            en: " After The Chief Minister's Big Move, they stay closed if the route split is \"Can't enter\", even when set to \"Not set to close\".",
          })}
        </p>
      </SearchScope>
      <FlagGrid flags={GATE_DOOR_FLAGS} />
    </CollapsibleCard>
  );
}

const readFacilityValues = (b: Uint8Array) => ({
  problem: flagProblem(b),
  values: FACILITY_FLAGS.map((f) => readFlag(b, f).value),
});

/** 施設の状態（FACILITY_FLAGS。✅ 書き換えで反映を確認） */
export function FacilityFlagsCard() {
  const { view, problem } = useSaveView(readFacilityValues);
  // 読めないセーブでは判定を出さない
  const values = view && !problem ? view.values : null;

  return (
    <CollapsibleCard
      anchor={AMIHAMA_ANCHORS.facilities}
      title={tr({ ja: "施設", en: "Facilities" })}
      contentClassName="grid gap-4 sm:grid-cols-3"
      description={
        <>
          {tr({
            ja: "病院・カジノ・語学所の開閉を切り替えられます。2日目に起きるイベントが変わります。",
            en: "Open or close the Hospital, the Casino and the Language School. This changes which events happen on Day 2.",
          })}
          <br />
          {tr({
            ja: "真ルートで希望の光に進むには、病院・語学所が開き、カジノが閉じている必要があります",
            en: "To reach The Light of Hope on the true route, the Hospital and the Language School must be open and the Casino closed",
          })}
          {/* セーブ未読み込みのときは、今のセーブの判定を出さない（判定する値がない） */}
          {values &&
            (facilitiesReadyForLightOfHope(values)
              ? tr({ ja: "（今のセーブは満たしています）", en: " (this save meets it)" })
              : tr({ ja: "（今のセーブは満たしていません）", en: " (this save doesn't meet it)" }))}
          {tr({ ja: "。", en: "." })}
          {/* 初期状態は病院・語学所が閉、カジノが開。周回をまたいで引き継がれる */}
        </>
      }
    >
      {FACILITY_FLAGS.map((flag) => (
        <div key={flag.offset} className="grid content-start gap-2">
          <FlagRow flag={flag} />
          <FacilitySlots flag={flag} />
        </div>
      ))}
    </CollapsibleCard>
  );
}

/** 🟢 施設の値で入れ替わる2日目のイベント。選択肢の並びで「〇〇のとき△△」と書く */
function FacilitySlots({ flag }: { flag: FacilityFlag }) {
  const current = useFlag(flag).state?.value ?? null;
  return (
    <ul className="text-muted-foreground list-disc pl-5 text-xs">
      {flag.slots.map((slot) => {
        const now = current === null ? null : facilitySlotEvent(slot, current);
        return (
          <li key={slot.label}>
            {tr({ ja: `${slot.label}：`, en: `${slot.label}: ` })}
            {flag.values
              .map((v) => {
                const event = facilitySlotEvent(slot, v.value) ?? tr({ ja: "不明", en: "Unknown" });
                return tr({ ja: `${v.label}とき${event}`, en: `${v.label}: ${event}` });
              })
              .join(tr({ ja: "、", en: "; " }))}
            {now && tr({ ja: `（今は${now}）`, en: ` (now: ${now})` })}
          </li>
        );
      })}
    </ul>
  );
}
