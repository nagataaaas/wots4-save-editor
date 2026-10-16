import type { Localized } from '@/lib/i18n'

/**
 * 更新履歴。サイドバー下の「更新履歴」から見る。
 * 使う人に見える変更だけを、その日の項目に日英で書く（解析・docs・テストだけの変更は書かない）。
 * 「UI に確度を出さない」「UI には使う人が気にすることだけを書く」がそのまま当てはまる
 */
export type ChangelogEntry = {
  /** YYYY-MM-DD */
  date: string
  items: Localized[]
}

/** 新しい日付が先 */
export const changelog: ChangelogEntry[] = [
  {
    date: '2026-10-16',
    items: [
      {
        ja: '「テンプレート」の画面を足しました。剣術大会の直前（幕府・外国・攘夷・根無し草）と、なりわいの「四天王 対 四人組」「阿弥浜八人衆」（指揮官との一騎打ちの直前も）から遊べるように、セーブを書き換えられます',
        en: 'Added the Presets screen. You can rewrite the save to play from right before the Battle Tournament (Shogunate, Foreigners, Prajnas or Independent), or the missions "Four Samurai Lords vs. Yakuza Quartet" and "The Amihama Eight" (including right before the duel with the commander)',
      },
      {
        ja: 'NPCイベントフラグ：「鍛冶屋の後継者イベント・鍛冶屋の状態」の選択肢を増やし、踏み倒したあとの状態の名前を直しました（踏み倒した直後と、店をやめられたあとを分けました）',
        en: 'NPC event flags: added more choices to "Smithy successor event & smithy status" and fixed the names of the states after skipping payment (right after skipping, and after the smith quits the shop)',
      },
    ],
  },
  {
    date: '2026-10-15',
    items: [
      {
        ja: '画面の言語を日本語と英語で切り替えられるようにしました（トップバー）。URL に ?lang=ja・?lang=en を付けても選べます。武器・道具などの名前も選んだ言語で出します',
        en: 'Added a Japanese / English language switch to the top bar. You can also pick the language with ?lang=ja or ?lang=en in the URL. Names of weapons, items, and other game data follow the selected language',
      },
      {
        ja: '流派：持っていない流派を、持ち歩きか道場の箪笥に入れて手に入れられるようにしました。流派ごとにも、まとめてでも入れられます',
        en: 'Styles: you can now obtain styles you do not have, into your Style Library or the dojo storage, one by one or all at once',
      },
      {
        ja: 'Chrome・Edge では、サイドバーの「上書き」で開いたファイルに直接書き込めるようにしました',
        en: 'In Chrome and Edge, "Overwrite" in the sidebar now writes directly to the opened file',
      },
      {
        ja: '未保存の変更があるとき、サイドバーの「保存」ボタンを目立つ色にしました',
        en: 'The "Save" button in the sidebar now stands out when there are unsaved changes',
      },
      {
        ja: 'サイドバーの一番下に、ソースコード（GitHub）へのリンクとこの更新履歴を置きました',
        en: 'Added a link to the source code (GitHub) and this changelog at the bottom of the sidebar',
      },
    ],
  },
  {
    date: '2026-10-14',
    items: [
      {
        ja: '最初の版。主人公（所持金・侍点・名前・活力・HP・現在地・難易度・記録）、武器（帯刀・武器袋・刀箪笥）、道具、容姿・装飾品・特典、阿弥浜の状態・NPC・勢力・イベントの進み具合・道場、流派・技・俺流、なりわい、夜這い、生データを編集できます',
        en: 'First release. Edit the hero (money, samurai points, name, vitality, HP, location, difficulty, records), weapons (equipped, Weapon Sack, Weapon Chest), items, appearance, accessories and unlocks, the state of Amihama, NPCs, factions, event progress and the dojo, styles, moves and My Style, missions, night crawling, and raw data',
      },
    ],
  },
]

export const latestChangelogDate = changelog[0].date

/** 前回見た日付より新しい日付か。見たことがない（null）ときは false にして、全部に「新着」を付けない */
export function isUnseen(date: string, seen: string | null): boolean {
  return seen !== null && date > seen
}

/** 新しい更新があることをボタンに出すか。見たことがないときも出す */
export function hasUnseenChangelog(seen: string | null): boolean {
  return seen === null || latestChangelogDate > seen
}

const SEEN_STORAGE_KEY = 'wots4-save-editor:changelog-seen'

/** 最後に開いたときの一番新しい日付。読めない（プライベートモード・ストレージの無効化など）ときは null */
export function loadChangelogSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_STORAGE_KEY)
  } catch {
    return null
  }
}

/** 開いたことを残す。残せなくても表示は止めない */
export function storeChangelogSeen(date: string): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, date)
  } catch {
    // 残せないときは次に開いたときにまた印が出るだけ
  }
}
