# 明愛慳電 · 燈泡比較

明愛（Caritas）慳電教育——比較 LED、CFL 慳電膽同鎢絲燈：睇溫度、計電費、小測驗。

**Live：** https://caritasfsc-anthony.github.io/power-save/

## 功能

- 💡 三種 3D 燈泡：LED 9W · CFL 14W · 鎢絲 60W
- 🌡️ 熱成像模式 + 3D 溫度計
- 💰 半年電費比較（可調每日開燈時數、燈泡數量）
- 📊 光 vs 熱能量比例
- 📝 慳電小測驗（3 題）

## 技術

單檔靜態網頁：Tailwind CDN + Three.js r128 + Lucide。無需 build。

## 本機預覽

用任何靜態伺服器開 `index.html`，例如：

```bash
python3 -m http.server 8080
```

然後開 http://localhost:8080/
