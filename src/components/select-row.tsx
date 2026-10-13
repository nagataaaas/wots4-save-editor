import { type ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { LazySelect } from "@/components/lazy-select";
import { groupOptions, type SelectOption } from "@/components/select-options";
import { WarningTip } from "@/components/warning-tip";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/lib/search-context";
import { errorMessage } from "@/lib/error-message";
import { useScopedError } from "@/lib/use-scoped-error";
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";

function OptionContent({ option: o }: { option: SelectOption }) {
  return (
    <>
      {o.icon && <o.icon />}
      {o.label}
    </>
  );
}

function OptionItem({ option: o }: { option: SelectOption }) {
  return (
    <SelectItem value={o.value} disabled={o.disabled}>
      <OptionContent option={o} />
    </SelectItem>
  );
}

type Props = {
  label: string;
  offset: number;
  badges?: ReactNode;
  /** null はセーブ未読み込み */
  value: string | null;
  /** 現在の値が options にないときに表示する名前（例：未知の ID）。選び直すことはできない */
  currentLabel?: string;
  options: readonly SelectOption[];
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
  /** 検証は通っているが、今は変更させないとき（例：上書きを明示していない）。hint はそのまま表示する */
  disabled?: boolean;
  warning?: string | null;
  /** バリデーション（文字数・数値の範囲など）だけを簡潔に書く。下に常に表示する */
  hint?: ReactNode;
  /** 備考。項目名の端の丸ハテナにホバーで表示する */
  note?: ReactNode;
  /** 現在値と違う値を選んだときだけ呼ばれる。例外はその場で表示する */
  onChange: (value: string) => void;
};

/** 選択肢から1つ選ぶ1フィールド分の欄。FieldRow と同じ見た目にする */
export function SelectRow({
  label,
  offset,
  badges,
  value,
  currentLabel,
  options,
  problem,
  disabled,
  warning,
  hint,
  note,
  onChange,
}: Props) {
  const [error, setError] = useScopedError();
  const listed = value === null || options.some((o) => o.value === value);
  // トリガーに出す名前（Base UI の Select は閉じている間は選択肢を描かないので、items から引く）
  const items: Record<string, ReactNode> = {};
  for (const o of options)
    items[o.value] = (
      <OptionContent option={o.selectedLabel ? { ...o, label: o.selectedLabel } : o} />
    );
  if (!listed && value !== null) items[value] = `${currentLabel ?? "不明"}（現在の値）`;

  return (
    <SearchField label={label} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label>{label}</Label>
        <InfoTip offset={offset}>{note}</InfoTip>
        {!problem && <WarningTip warning={warning} />}
        {badges}
      </div>
      <LazySelect
        // null でプレースホルダー表示になる
        value={value}
        items={items}
        placeholder="未読み込み"
        className="w-full"
        disabled={disabled || value === null || problem !== null || options.length === 0}
        onValueChange={(v) => {
          if (v === value) return;
          setError(null);
          try {
            onChange(v);
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
      >
        {!listed && value !== null && (
          <SelectItem value={value} disabled>
            {currentLabel ?? "不明"}（現在の値）
          </SelectItem>
        )}
        {groupOptions(options).map((g, i) =>
          g.name === undefined ? (
            g.items.map((o) => <OptionItem key={o.value} option={o} />)
          ) : (
            <SelectGroup key={g.name}>
              {i > 0 && <SelectSeparator />}
              <SelectLabel>{g.name}</SelectLabel>
              {g.items.map((o) => (
                <OptionItem key={o.value} option={o} />
              ))}
            </SelectGroup>
          ),
        )}
      </LazySelect>
      {problem ? (
        <p className="text-muted-foreground text-xs">読み取り専用：{problem}</p>
      ) : (
        // hint は常に出し、エラーはその下に足す。警告は項目名の横のアイコン（FieldRow と同じ）
        <>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}
        </>
      )}
    </SearchField>
  );
}
