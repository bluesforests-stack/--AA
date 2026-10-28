# Hengqin-Macau Sensory Atlas

主頁、Visual、Space、Sound 統一使用無彩色介面，影片區為純白背景。保留原模型和原有互動。

## 本次更新

- 主標題改為 Hengqin-Macau Sensory Atlas。
- 主頁第一段影片換為 A.mp4 的網頁壓縮版本。
- 25 張圖像以三層不同速度穿插排列，交替角度，長條圖片加寬；可點擊放大。
- Visual「感知邊界」新增「海報展示」，依 B 資料夾 01–05 順序展示。
- Sound 的「聲音影像」設為外部影片入口，排列於「城市聲音打孔機」之前。舊影片頁及檔案已移除。

## 本機開啟

請用 HTTP 伺服器開啟，避免直接雙擊 index.html 造成模型資源無法載入。

在包含 index.html 的資料夾執行：

```sh
python3 -m http.server 8000
```

瀏覽器開啟 http://localhost:8000/ 。本地版也可雙擊「啟動網站.command」，或執行 `python3 preview.py`。

## 上傳 GitHub Pages

ZIP 是下載用的壓縮包，請先解壓，將裡面的網站檔案上傳，請勿把 ZIP 本身作為網站上傳。

1. 建立 Public GitHub 倉庫，使用 GitHub Desktop Clone 到電腦。
2. 將本資料夾內全部內容複製到倉庫，根目錄直接看到 index.html、assets、visual、space、sound 和 media。
3. 在 GitHub Desktop Commit to main，再 Push origin。
4. 倉庫 Settings → Pages → Deploy from a branch → main → /(root) → Save。
5. 完成後使用 Pages 顯示的網址向觀眾展示。

每個網站檔案均小於 25 MiB；完整網站有超過 100 個檔案，使用 GitHub Desktop 可一次提交。如果使用網頁上傳，請分批上傳並保留資料夾結構。assets 下的模型分塊不可遺漏或改名。

## 互動與素材

Visual 的位置選擇保留在目前瀏覽器，GitHub Pages 不提供跨裝置統計後端。Sound 的 JPG、WAV 由瀏覽器生成。聲音影像入口需要網路連線。

- shared/ui.css：統一字體、背景和介面。
- editorial.js、editorial.css：三層圖像排版與捲動。
- media/gallery.json：圖片分組與標題。
- visual/poster-assets：新增五張海報及有序清單。

第三方授權保留於 licenses，聲音素材說明見 sound/CREDITS.md。
