# docs

## `./save_format`

- `README.md`: 現時点でわかっているフォーマットに関する情報。どのメモリ範囲がどういう情報のまとまりかを記載し、それぞれのまとまりごとに `./save_format/chunks/{chunk_slug}` にまとめる。まとまりの追加・削除・統合・修正時には必要があればこれも更新する。
- `chunks/{chunk_slug}`: 
  - `chunks/{chunk_slug}/README.md` (template=`chunks/_templates/README.md`): そのまとまりの意味、メモリ範囲、データ構造を記載する。データとして何らかのリストのIDを参照する場合は、 `./save_format/datatable/` 以下のファイルへの参照をして表現する。**調査を行っている最中の実データを書いたりせず、その時点での情報を簡潔に記載すること。以前正しいとされていたが覆されていた情報を「○○だとされていたが～」などと残さない。編集・試行錯誤の痕跡を残さず、その時点での情報を簡潔に記載すること。**
  - `chunks/{chunk_slug}/reserch/`: そのまとまりに関する調査を格納するディレクトリ。まとまりについて、調査したカテゴリごとにファイルで分割する。
  　　- `chunks/{chunk_slug}/reserch/README.md` (template=`chunks/_templates/reserch/README.md`): そのまとまりに関する調査を行った際、どの兄弟ファイルが何を調査した情報化を記載する。
  　　- `chunks/{chunk_slug}/reserch/{yyyy-mm-dd}_{topic}.md` (template=`chunks/_templates/reserch/TEMPLATE.md`): 個々の調査の記録。差分を取ったサンプルと操作内容、差分、結論を記載する。
- `datatable/`: IDを持つデータの集まり (e.g. 武器刃パーツ一覧)。悩んだ時はリストを分割する(e.g. 刃パーツと鍔パーツは分ける。さらに、刃を刀用と槍用に分けてもよい)。
  - `datatable/README.md`: ディレクトリ・ファイルを記載し、どこにどのデータが格納されているかを保存する。各リストの参照元・ID空間・保存形式、CSVの列の意味もここに書く。
  - `datatable/**/*.csv` (template=`datatable/TEMPLATE.csv`): 単一のリストを表すファイル。

## event.md

イベントの分岐・内容・条件などを記載している。

## `./events`

- `README.md`: ファイル名の付け方、フラグの位置・イベントの状態の値の凡例、全イベントの索引。
- `TEMPLATE.md`: 1イベントのひな形。フロントマターにタイトル・勢力（ルート概要）・概要（`summary`）とその英訳（`summary_en`。どちらもエディタのイベントの一覧に出る）・発生タイミング・発生場所・発生条件・失敗条件・書き換えるフラグを書き、本文に流れ・選択肢・変化する内容を書く。
- `{kind}__{phase_label_slug}__{title_en_slug}.md`: 1イベント1ファイル（例：`prajna__1_day__encounter_with_the_patriots.md`）。