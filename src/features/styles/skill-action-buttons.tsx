import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n";
import { skillActions } from "@/save/sects";

/**
 * 技の行の「習得する」「俺流で表示」「忘れさせる」（流派・技の画面で共通）。出すボタンは skillActions で決める。
 * state が null（未読み込み）のときも、無効にした「習得する」を出す。learnable が false の技は習得できない
 */
export function SkillActionButtons({
  state,
  unique,
  advanced,
  disabled,
  learnable = true,
  onLearn,
  onShowInOreRyu,
  onForget,
}: {
  state: number | null;
  unique: boolean;
  advanced: boolean;
  disabled: boolean;
  learnable?: boolean;
  onLearn: () => void;
  onShowInOreRyu: () => void;
  onForget: () => void;
}) {
  const actions = skillActions(state, unique, advanced);
  const learnDisabled = disabled || state === null || !learnable;
  return (
    <span className="flex justify-end gap-1">
      {actions.showInOreRyu && (
        <Button size="sm" variant="outline" disabled={learnDisabled} onClick={onShowInOreRyu}>
          {tr({ ja: "俺流で表示", en: "Show in My Style" })}
        </Button>
      )}
      {actions.learn && (
        <Button
          size="sm"
          variant="outline"
          disabled={learnDisabled}
          title={
            learnable
              ? undefined
              : tr({ ja: "この技が入っている流派がないので習得できません", en: "No style includes this move, so it cannot be learned" })
          }
          onClick={onLearn}
        >
          {tr({ ja: "習得する", en: "Learn" })}
        </Button>
      )}
      {actions.forget && (
        <Button size="sm" variant="ghost" disabled={disabled} onClick={onForget}>
          {tr({ ja: "忘れさせる", en: "Forget" })}
        </Button>
      )}
    </span>
  );
}
