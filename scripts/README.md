# Scripts 資料夾說明

此處預留給 GitHub Actions 或其他自動化腳本使用，可在此新增：

- `update-data.js`：串接行情 / 新聞 API，寫入 `data/market_data.json`。
- `generate-narrative.js`：呼叫 LLM 服務，自動產生 `narrative` 內容。
- `workflow/`：儲存 GitHub Actions 工作流程檔案範例。

> 靜態網站部署於 GitHub Pages 時，只要更新 JSON 與前端檔案就能立即反映最新市場敘事。
