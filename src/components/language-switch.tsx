import { Languages } from 'lucide-react'
import { FilterSelect } from '@/components/filter-select'
import { tr, type Language } from '@/lib/i18n'
import { useLanguage } from '@/lib/language-context'

/** 言語の名前は、どちらの言語で開いていても読めるようにその言語自身で書く */
const OPTIONS: { value: Language; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
]

/** トップバー右の言語の切り替え。セーブに触れないので、未読み込みでも使える */
export function LanguageSwitch() {
  const { lang, setLang } = useLanguage()
  return (
    <div className="flex items-center gap-1">
      <Languages className="text-muted-foreground size-4" aria-hidden />
      <FilterSelect options={OPTIONS} value={lang} onChange={setLang} className="h-8 w-28" aria-label={tr({ ja: '言語', en: 'Language' })} />
    </div>
  )
}
