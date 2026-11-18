# 居合斩 · 无限连闪（独立版）

从《Emoji地牢：活武器》的营地街机厅里拆出来的单机小游戏。
**目标不是重做，而是 1:1 迁移**：手感、数值、音效触发时序、特效与 HUD 都照搬原版。

---

## 运行

```bash
npm start          # 启动本地服务器（默认 8080）
# 然后打开 http://localhost:8080
```

Windows 上也可以直接双击 `启动游戏.bat`。

> 必须走 http：居合斩的拔刀音是 `fetch` 预解码的 wav/mp3，`file://` 下会被浏览器拦掉，
> 只能落到合成音兜底（会明显不跟手）。

---

## 操作（与原版一致）

| 输入 | 行为 |
|---|---|
| 鼠标移动 | 瞄准（准星为 DOM 元素，不受震屏影响） |
| **左键 / J** | 朝光标方向居合突进（判定：上帧位置→当前帧位置的线段 vs 靶圆，容差 28px） |
| **右键 / K** | 原地扇形挥砍（110px / 160°） |
| **空格** | 充能满 100 点后释放【无我】大招 |
| **T / U** | 切换「无 CD 无我」测试模式 |
| **B** | 打开/关闭居合大殿（刀痕 · 道场 · 音律 · 奥义），打开时整局暂停 |
| **M** | 静音 |
| **Esc** | 关闭面板优先，否则结束本局回主菜单 |

规则：斩中立即刷新突进 CD；挥空或靶子超时断连，扣 1 命（共 3 命）；连斩数即成绩，
同时决定刀痕/道场/音律/奥义的解锁进度。

---

## 和原版的关系

`js/modes/iaijutsu/` 下的五个模块是**原样搬运**的：

- `iaijutsu_mode.js` —— 主循环、突进/命中/断连、连斩与充能
- `iaijutsu_targets.js` —— 三种靶（普通 / 飞梭 / 黄金）与巡逻运动
- `iaijutsu_fx.js` —— 刀痕、残影、道场光影背景
- `iaijutsu_ultimates.js` —— 6 种【无我】奥义演出
- `iaijutsu_skins.js` —— 8 套刀痕 / 5 套道场 / 6 首 BGM 定义

它们直接读写 `Player` / `MiniGames` / `Main` / `FX` / `SFX` / `CFG` / `Physics` / `Utils`，
所以独立版没有改这些模块，而是**按同名 API 复刻了一层宿主**：

| 原版全局 | 独立版实现 | 说明 |
|---|---|---|
| `MiniGames` | `js/modes/minigames.js` | 房间、连斩、粒子、HUD、结算流程，API 同名 |
| `Main` | `js/core/main.js` | 相机/震屏/粒子/飘字/拖尾/光照/暗角/CRT，绘制顺序与公式照抄 |
| `Player` | `js/entities/player.js` | 只保留街机小游戏实际走到的那条 update 路径 |
| `SFX` | `js/core/sfx.js` | 原文件整体搬运（音色配方、居合 BGM、试听逻辑不变） |
| `Utils` / `Physics` | 原文件搬运 | 碰撞算法逐行一致 |
| `UI` | `js/ui/ui.js` | 横幅、皮肤工坊、标题与结算页 |

音频素材原样复制：`assets/audio/juhe1.wav / juhe2.mp3 / juhe3.mp3`（拔刀音，按顺序尝试加载）；
BGM 共 6 首：`iaijutsu_bgm.ogg`（默认，音量比 0.12）+ `bgm_iaijutsu_1..5.mp3`（0.28）。

> 音频文件（约 32MB）**不入 git**，按 game4 的惯例忽略 `*.mp3/*.wav/*.ogg`。
> 克隆后需从 `game4/assets/audio/` 复制，清单与文件名见 `assets/audio/README.md`；
> 缺文件时游戏仍可玩，只是拔刀音回落到合成音、BGM 静音。

> 与原版的一处**有意差异**：原版把「居合心流音律」页签用 `display:none !important` 隐藏了
> （渲染时还会把 tab 强制拉回刀痕页），所以那套音乐商店代码在 game4 里永远走不到。
> 独立版按你的要求把它放了出来：6 首曲目、试听/停止、装备、文件路径提示全部可用，
> 换曲立即生效并写入 `localStorage('iaijutsu_bgm_track')`。

---

## 一致性怎么验证的

`tests/iaijutsu_golden.js` 是发给两边的**同一份脚本**：

1. 固定随机种子（mulberry32）与 `performance.now`，用固定 `dt = 1/60`；
2. 脚本化输入（锁最近靶、每 9 帧一刀、定期开大、故意背身挥空），跑 7 局：
   5 种奥义各一局 + 随机觉醒 + 一局专门打到 3 次断连；
3. 逐帧记录玩家/靶子/连斩/充能/大招/粒子/音效调用，最后算 SHA-256。

结果（两端完全一致）：

```
帧数          : 3854
音效调用      : 11752 次 -> dc2fac728d507490
HASH=74c601f224b8a30483abed0db6bd54c134ce10aa044558fc1ec6e14eee052832
```

这条哈希同时覆盖了随机数消耗序列（靶子生成、粒子、刀痕），所以只要它相同，
移动/瞄准/命中/断连/连斩/充能/大招/RNG 顺序就是同一套。

运行方式：

```bash
npm test                                  # 本目录
node tests/iaijutsu_golden.js             # 原版 game4 目录里同名脚本，输出应完全相同
```

---

## 已知的原版小瑕疵（故意保留）

- HUD 顶部标题条与「连斩」状态文字在 960px 宽度下会轻微重叠（原版同样如此）。
- `powerup` 音效在原版 SFX 表里没有对应配方，因此开启「无 CD 无我」时是静音的（关闭时有 click），这里保持一致。

这些属于原版行为，不做「顺手修一下」，否则就不再是 1:1 迁移。

---

## 没声音怎么办

音频全部是 Web Audio 现场合成 + 一个 `<audio>` BGM，浏览器有自动播放策略：

1. 标题页点「拔刀出鞘」或按空格（任意一次真实点击/按键都会解锁音频）。
2. 如果开局后仍然没声音，画面顶部会提示「浏览器拦住了声音：在画面里点一下即可开启」，
   点一下画面任意处即可；`M` 可以切换静音。
3. 在 IDE 的内嵌预览面板里，iframe 可能没有 autoplay 权限，声音会被整段拦掉。
   这种情况请用系统浏览器直接打开 `http://localhost:8080`（`启动游戏.bat` 就是这么做的）。

---

## 目录

```
index.html              标题 / 结算 / 工坊 / 准星 / 画布
css/style.css           页面样式 + 居合大殿（样式搬运自原版）
js/load_order.js        脚本清单（index.html 与 tests 共用）
js/core/                config / utils / physics / game / fx / input / sfx / main
js/entities/player.js   玩家（街机路径）
js/modes/minigames.js   宿主：房间、更新、渲染、HUD
js/modes/iaijutsu/      居合五模块（原版搬运）
js/ui/ui.js             横幅、标题、结算、皮肤工坊
assets/audio/           拔刀音 + 6 首 BGM（本地自备，不入 git；清单见其 README）
tests/iaijutsu_golden.js 行为指纹测试
```
