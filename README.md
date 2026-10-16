# 長洲節能減碳小先鋒計劃 · 明愛慳電

明愛（Caritas）慳電教育互動課——長洲節能減碳小先鋒計劃。

**Live：** https://caritasfsc-anthony.github.io/power-save/

| 課 | 連結 |
|---|---|
| 第一回 · 燈泡比較 | [index.html](https://caritasfsc-anthony.github.io/power-save/) |
| 第二回 · 冷氣慳電 | [ac.html](https://caritasfsc-anthony.github.io/power-save/ac.html) |

## 功能

### 燈泡（第一回）
- 三種 3D 燈泡：LED 9W · CFL 14W · 鎢絲 60W
- 熱成像 + 溫度計 · 半年電費 · 小測驗

### 冷氣（第二回）
- 3D 睡房 · 冷氣 + 循環扇擺位
- 4 招慳電（25.5°C、循環扇、短出唔熄、清隔塵網）
- 氣流可視化 · 半年電費 · 小測驗

## 技術

靜態網頁：Tailwind CDN + Three.js r128 + Lucide。無需 build。

## 本機預覽

```bash
python3 -m http.server 8080
```

然後開 http://localhost:8080/ 同 http://localhost:8080/ac.html
