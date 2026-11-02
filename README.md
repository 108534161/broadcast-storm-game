# Broadcast Storm LIVE — RSTP 教學版 v2

本版保留原本 GitHub/Render Node.js 專案的路徑、即時同步和 QR Code；更新後 Render 可依原本設定重新部署。

## 這次更新

1. 起始畫面不再出現 B–C 連線；按「接上 Loop」才出現實體三角形。
2. 防護名稱改為 **RSTP**。教學模型固定以 B–C 顯示阻擋連接埠（不是完整 BPDU 或 Root Bridge 選舉）。
3. 未防護的完整環路中，廣播事件可持續繞圈；轉送量依每秒離散事件累積，不再設定流量憑空指數增加。
4. 增加 **A–C 主線故障**：啟用 RSTP 時，備援 B–C 轉送。
5. 投影畫面說明目前的路徑狀態，學生維持掃 QR Code 發送廣播。

## 4 分鐘演示

- 全部重置；全班加入並請一位同學發送一次廣播。
- 接上備援線路：觀察 B–C 在 RSTP 下被阻擋。
- 停用 RSTP：再請一人按一次廣播，觀察同一事件持續轉送。
- 啟用 RSTP：停止新增迴圈轉送。
- 按「模擬斷線」：A–C 中斷、B–C 開始備援轉送。

**注意：** 本教學模擬不是 Cisco Packet Tracer，也不是完整 IEEE 802.1w/RSTP 實作；未模擬 BPDU、根橋選舉、真實收斂時間、佇列、線速和封包複製。Network Traffic 是模擬指數，不能聲稱為真實網路量測。正式 Packet Tracer 實作需另行驗證。

## 本機啟動

Node.js 18+，執行 `npm start`，打開 http://localhost:3000 。

## 更新已部署的 GitHub/Render

到 GitHub 的 `broadcast-storm-game`，上傳 ZIP 內 `broadcast-storm-live/` 下面的檔案（維持 `server.js`、`package.json` 在 repository 根目錄），覆蓋舊檔並 Commit。原 Render 若設為自動部署，會進行新版部署。重新開啟網站建立新教室，舊教室不會保留。



## 2026-11 動畫與控制修正版
- 主持人畫面新增明確的目前狀態（備援線、RSTP、A–C 故障、封包循環）。
- 修正 SVG 圓點被每秒推播刪除而導致動畫不易看見的問題；每次學生送出廣播觸發約 2 秒的一次性動畫，未防護且有循環事件時改成持續動畫。
- A–C 故障只將 A–C 的圖線淡化，不影響 A–B；模擬斷線須先啟用備援及 RSTP。
- 這是簡化教學模型，非完整 IEEE RSTP 協定實作或真實網路封包量測。
- GitHub 更新方式：解壓縮後用同名檔案覆蓋儲存庫，提交 commit；Render 自動部署成功後重新建立教室。
