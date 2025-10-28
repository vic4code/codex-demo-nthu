# 市場敘事雷達 (Market Narrative Radar)

靜態化的金融市場觀測平台範例，專為 GitHub Pages / `github.io` 部署設計。透過同一條時間軸串連資產價格、重大事件、情緒指標，並搭配 AI 生成敘事摘要，協助使用者理解市場波動背後的故事。

## 功能亮點

- 📈 **雙軸行情圖表**：使用 Chart.js 呈現資產價格與情緒指數，並自動標註重要事件。
- 🧭 **事件敘事時間線**：以卡片呈現事件類型、影響強度與參考連結。
- 🧠 **AI 敘事摘要容器**：預留給 LLM 工作流程寫入的市場脈動、驅動因素與前瞻觀察。
- 🧮 **指標快照**：自訂指標卡片（如 VIX、美元指數、殖利率），即時顯示趨勢與評論。
- 📱 **行動裝置最佳化**：純前端、RWD 設計，手機瀏覽體驗良好。

## 專案結構

```
├─ index.html          # 主頁，引用 CSS/JS 與靜態資料
├─ assets/
│  ├─ style.css        # 深色系介面設計（含 RWD）
│  └─ main.js          # Chart.js 視覺化、事件時間線與敘事呈現
├─ data/
│  └─ market_data.json # 範例資料與敘事摘要，可由自動流程覆寫
└─ scripts/
   └─ README.md        # （預留）GitHub Actions / 資料更新腳本說明
```

## 自動化資料更新建議流程

1. **GitHub Actions 擷取資料**：
   - 建立排程工作 (`cron`) 透過公開 API（如 Alpha Vantage、FRED、NewsAPI 等）抓取行情與事件資料。
   - 於 Actions 中使用 `secrets` 儲存 API Key，產出 `data/market_data.json`。
2. **LLM 敘事摘要**：
   - 使用 OpenAI、Azure OpenAI 或其他 LLM 服務，在 GitHub Actions 工作流中根據最新資料產生敘事段落。
   - 將結果寫入 `narrative` 欄位，並更新 `generatedAt`。
3. **自動部署**：
   - 啟用 GitHub Pages（Branch: `main`, Folder: `/`），提交 JSON 與靜態檔案更新即可自動發布。

## 本地開發

1. 以任何靜態伺服器（如 VS Code Live Server、`python -m http.server`）啟動根目錄。
2. 開啟瀏覽器造訪 `http://localhost:8000`（或對應 port），即可在桌面與行動裝置模式下預覽。

## 授權

此專案示範用，依據個別資料來源的授權條款使用。請在上線前確認 API 與新聞來源的授權需求。
