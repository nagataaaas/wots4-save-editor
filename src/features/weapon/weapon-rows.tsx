import { useState, type ComponentProps } from "react";
import { ChevronRight } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { SearchSelectRow } from "@/components/search-select-row";
import { SelectRow } from "@/components/select-row";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchField } from "@/lib/search-context";
import { weaponIdLabel } from "@/save/weapon";
import { weaponImageUrl } from "@/save/master/weapon-images";

// 帯刀・武器袋・刀箪笥で共通の、武器の編集欄の部品。

/** 開閉の三角（Collapsible の Trigger の中に置く。開いていると下向き） */
export function Chevron() {
  return (
    <ChevronRight
      className="size-4 shrink-0 transition-transform group-data-panel-open:rotate-90"
      aria-hidden
    />
  );
}

export function SwitchRow({
  label,
  offset,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  /** 丸ハテナに出す位置。省くと出さない */
  offset?: number;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <SearchField label={label} className="flex items-center gap-2">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
      <Label>{label}</Label>
      <InfoTip offset={offset} />
    </SearchField>
  );
}

/**
 * ふだんは変更不可にし、武器ごとに「○○を上書き」を押したときだけ選べる欄（鞘・武器種。ユーザー判断 2026-10-05）。
 * 押したことを明示とみなし、onChange では書き込み関数に上書きの印（OverrideOpts の { override: true }）を渡す。
 * 上級者モードとは関係しない。どちらも 🔶 データ破損のおそれ
 */
export function OverrideRow({
  label,
  idleHint,
  overrideHint,
  searchPlaceholder,
  ...props
}: Omit<ComponentProps<typeof SelectRow>, "badges" | "disabled" | "hint"> & {
  /** 上書きしていないときの説明 */
  idleHint: string;
  /** 上書き中の注意 */
  overrideHint: string;
  /** あれば検索つきの欄（SearchSelectRow）にする */
  searchPlaceholder?: string;
}) {
  const [override, setOverride] = useState(false);
  const rowProps = {
    ...props,
    label,
    badges: !props.problem && (
      // 負のマージンで、ボタンが項目名の行の高さを変えないようにする（隣の欄と高さを揃える）。未読み込みのときは無効にして出す
      <Button
        variant="outline"
        size="xs"
        className="-my-1.5 ml-auto"
        disabled={props.value === null}
        onClick={() => setOverride(!override)}
      >
        {override ? "上書きをやめる" : `${label}を上書き`}
      </Button>
    ),
    disabled: !override,
    hint: override ? (
      <span className="text-amber-600 dark:text-amber-400">
        データ破損のおそれ。{overrideHint}
      </span>
    ) : (
      idleHint
    ),
  };
  return searchPlaceholder ? (
    <SearchSelectRow {...rowProps} searchPlaceholder={searchPlaceholder} />
  ) : (
    <SelectRow {...rowProps} />
  );
}

/**
 * 部品がすべて一致する完成武器の画像（10:3）。画像がない・読み込めないときは枠だけ出す。
 * small は細い一覧の行に置く小さい画像（文言は出さない）
 */
export function WeaponImage({ id, small = false }: { id: number | null; small?: boolean }) {
  const url = id === null ? null : weaponImageUrl(id);
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(url && !failed);
  const base = small ? "weapon-thumb" : "weapon-preview-image";
  return (
    <div className={hasImage ? base : `${base} ${base}-empty`}>
      {hasImage && url ? (
        <img
          src={url}
          alt={id === null ? "" : (weaponIdLabel(id) ?? "")}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : small ? null : (
        <div className="text-wots-label flex size-full items-center justify-center p-2 text-center font-serif text-xs">
          {url ? "画像を読み込めません" : "完成武器と部品が一致しないため画像なし"}
        </div>
      )}
    </div>
  );
}
