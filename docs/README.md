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