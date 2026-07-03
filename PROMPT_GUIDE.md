# BIRD-DEX 卡牌 AI 生圖提示詞指南 (Prompt Guide)

為了讓圖鑑中的鳥類圖片具有類似寶可夢卡牌的插畫風格，同時保證「**純圖片無卡框**」且「**不失去真實鳥類特徵**」，請嚴格使用以下提示詞公式進行生圖 (適用於 Midjourney / Niji 6 / Stable Diffusion 等工具)。

## 📸 核心觀念：我需要生幾張圖？

**絕大多數情況下，每隻鳥你只需要生 1 張圖！**
系統會自動在「你提供的那唯一一張圖」上面疊加金框與全息閃光特效。
只有當你想給高等級玩家驚喜時，才需要生第 2 張圖（異圖卡 UR）。

---

## 🎨 基礎生圖公式 (純插畫鐵壁版)

為了避免 AI 自己畫出卡框、HP、或是寶可夢的 Logo，我們必須將提示詞改為「概念插畫」並加入強烈的反向提示詞。

### ✅ 正向提示詞 (Prompt)
```text
Pokemon concept art by Ken Sugimori, official character illustration, [這裡替換成鳥的英文名稱], (anatomically correct realistic bird species:1.5), beautiful natural habitat background, edge-to-edge full illustration, highly detailed, vibrant colors, masterpiece, 8k, sunny day, soft natural lighting --ar 3:4
```
*(將 `[這裡替換成鳥的英文名稱]` 換成鳥名，例如 `Eurasian Tree Sparrow`)*

### ❌ 反向提示詞 (Negative Prompt) - 必須加入！
```text
card frame, card border, text, hp, numbers, letters, logos, pokemon logo, trading card UI, white border, black border, watermarks, signature, human, hands
```

---

## 🌟 進階生圖：滿版異圖卡 (UR / LR 神聖插畫) 

如果你想為特定的鳥（例如猛禽）準備 12 級以上才會顯示的「異圖版 (Alt-Art)」，請替換正向提示詞的環境描述，並改用有田滿弘 (Mitsuhiro Arita) 的風格。

### 🟣 SSR / Ultra Rare (極稀 - 魔法全息風格)
> Pokemon concept art by Mitsuhiro Arita, official character illustration, [鳥的英文名稱], (anatomically correct realistic bird species:1.5), magical aura, swirling holographic glowing elements, magical glitters, dramatic contrast, epic wind trails, vivid rim lighting, edge-to-edge full illustration, masterpiece --ar 3:4

### 🟡 Legendary Rare (傳說 - 史詩神聖風格)
> Pokemon concept art by Mitsuhiro Arita, official character illustration, [鳥的英文名稱], (anatomically correct realistic bird species:1.5), mythical atmosphere, divine golden glowing aura, cosmic light rays, floating golden feathers, epic low angle, majestic legendary presence, edge-to-edge full illustration, masterpiece --ar 3:4

*(記得同樣要套用上方的 ❌ 反向提示詞！)*
