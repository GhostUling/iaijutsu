# 居合斩独立版 · 设计方案

> 来源：`D:\Desktop\word\games\game4`（《Emoji地牢：活武器》营地街机厅小游戏之一）
> 状态：**已按 1:1 迁移完成**（2026-11-17）。本文第 3 节的改造设想**未实施**，保留为后续可选方向。
> 迁移结果与验证方式见 `README.md`；一致性指纹见 `tests/iaijutsu_golden.js`。

---

## 0. 实际做了什么（与下文方案的关系）

本次交付的第一原则是**迁移前后一模一样**，因此：

- 没有采用第 4 节的 Vite + TS 重写，而是用不打包的原生 JS，好处是 `js/modes/iaijutsu/` 五个模块
  可以逐字搬运、零改动，行为不会漂移。
- 没有执行第 3 节的五处改造（删右键、靶改敌、连斩变资源、大招还给玩家、黄金靶改里程碑）——
  这些是设计改进，会改变手感，与本轮目标相反。
- 第 5 节列出的全局依赖确实就是主要工作量：独立版按同名 API 复刻了 `MiniGames` / `Main` /
  `Player` / `FX` / `SFX` / `UI` 这一层宿主（约 2000 行，含 HUD 与工坊），原版模块一行未改。
- 第 8 节的音效策略落地为「原版音频素材原样复制 + 原版合成配方整体搬运」，
  拔刀音仍是 `juhe3/2/1` 三级回退，失败才落到合成音。

验收用的是可复现的行为指纹：同一份测试脚本在 game4 与独立版各跑 3854 帧（含 7 局、6 种奥义、
11752 次音效调用），SHA-256 完全相同。

---

## 1. 为什么要把它单独拎出来

原版 6 个小游戏里，只有它让作者（也是唯一的玩家兼开发者）反复回去玩。理由很具体：

- **斩中即续航**：斩中靶子立即刷新突进冷却，于是"打得准"能兑换"继续打"，形成正反馈闭环。
- **断连有代价**：挥空或超时未斩，扣一条命（共 3 条），把失误变成可见的损失。
- **音效补上了确认点**：作者自己加了居合音效与 BGM 后，同一次命中从"看起来砍到了"变成"砍到了"。

而它在大游戏里被稀释：外围特效 1319 行、大招演武 1432 行、皮肤 375 行，玩法主控只有 675 行。**外围比核心重一倍，是本末倒置。**

独立版的目标不是"搬过去能跑"，而是**把外围的血抽回核心**。

---

## 2. 原版机制清单（照抄数值，便于对照）

| 项 | 原版数值 | 位置 |
|---|---|---|
| 场上靶数 | 少于 3 个就补刷 | `iaijutsu_mode.js:368` |
| 靶子存活时限 | 普通 5.0s / 飞梭 5.8s / 黄金 6.5s | `iaijutsu_targets.js:34` |
| 突进（居合闪） | 朝鼠标方向，`lungeTime` 取 `WEAPONS[1]` | `iaijutsu_mode.js:394-415` |
| 命中判定 | 上帧位置到当前帧位置的线段 vs 靶圆，容差 28px | `iaijutsu_mode.js:464` |
| 斩中后 | 冷却归零 + 0.28s 无敌 + 0.16s 子弹时间 | `iaijutsu_mode.js:231-237` |
| 右键普攻 | 前方 110px / 160° 扇形 | `iaijutsu_mode.js:435` |
| 断连 | 挥空或超时，扣 1 命，3 命耗尽结束 | `iaijutsu_mode.js:97-135` |
| 连斩计分 | 普通 +1，飞梭 +2（`maxCombo` 即成绩） | `iaijutsu_mode.js:207` |
| 黄金靶 | 3% 概率、10s 冷却、击杀给 3s 无限居合 | `iaijutsu_mode.js:78-87` |
| 飞梭靶 | 8% 概率、场上最多 2 个、横或纵巡逻 | `iaijutsu_targets.js:82-153` |
| 大招充能 | 普通 +1 / 飞梭 +2 / 黄金 +3，满 100 开大 | `iaijutsu_mode.js:219-226` |
| 大招 | 5s 全自动斩击，结束 0.36s 收刀停顿 + 冲击波 | `iaijutsu_ultimates.js:142-380` |
| 结算奖励 | `连斩 × 2` 金币（上限 300）、`连斩 ÷ 4` 碎片 | `minigames.js:417-424` |

---

## 3. 独立版要改的五个地方

原版能玩，但下面五处是设计问题，照搬会把问题一起搬过来。

### 3.1 删掉右键
原地扇形挥砍不能位移，而靶子最近也生成在 90px 外（`iaijutsu_targets.js:25`），实际够不着。**两套输入做同一件事，多一个键，没有多一个决策。**

独立版只保留一个输入：**朝光标突进**。如果要第二个键，必须给它独立的战术价值（见 3.2）。

### 3.2 靶子换成会反击的敌人
纯靶子只考准头，不考胆量。改成敌人后：

- 敌人有攻击前摇，玩家必须在"再斩一刀"和"撤开"之间选。
- 敌人不会自己消失，**取消 5 秒超时**——惩罚只来自玩家判断，不来自运气。这是原版最伤手感的一条（场上 3 个靶随机分布，从一头赶到另一头时，时间在走而你没得选）。
- 第二个键的合理用途由此出现：格挡/见切。突进是进攻，格挡是防守，两者争夺同一个"时机"。

### 3.3 连斩从计分变成资源
现在是"连斩数 = 分数"。改成：

- 斩中回 1 格血，被击中扣 1 格，血满时溢出转成能量。
- 这样"我要不要赌这一刀"变成每秒都在做的决策，而不是一条只涨不跌的数字。

保留一个上限（比如 5 格），避免无限滚雪球。

### 3.4 大招还给玩家
原版 5 秒无我是**自动演武**，玩家在看播片。手感型游戏里最爽的 5 秒被剥夺了操作，这是反的。

改成：满能量时触发**子弹时间**（0.25 倍速），持续 3 秒，玩家自己连斩。斩击次数决定奖励。**最爽的时刻必须由手完成。**

### 3.5 黄金靶改成连斩里程碑
3% 概率 + 10s 冷却 ≈ 一局见不到两次，等于没做。改成"连斩到达 10 / 20 / 30 时刷新一个精英靶"，让玩家看得见、等得到、能规划。

---

## 4. 技术形态

### 推荐：Vite + TypeScript（和 game6_rogue 同栈）

理由：这个项目要长期迭代手感与数值，需要类型和单测；单文件 HTML 在 800 行之后就难以维护。

### 备选：单文件 HTML（只做验证时）

如果只想在 30 分钟内确认"这套改造对不对"，可以先用单文件（参考 `games/feellab/index.html` 的组织方式：一个 `step(dt)` 固定步长、一个 `draw()`、一个滑杆面板）。

---

## 5. 依赖拆解：原版拽着哪些全局

原版不是独立模块，它直接读写引擎的全局对象。**这是拆分的真正工作量所在。**

| 全局 | 引用次数 | 用途 | 独立版替代方案 |
|---|---|---|---|
| `Player` | 167 | 位置、速度、`dashT`/`dashAngle`、`skillTimers[1]`、`invulnTimer`、`aimAngle`、`fireTimer`、`swingT`/`swingAngle` | 自己写一个 80 行的 `Player` 类，字段同名，便于对照 |
| `SFX` | 33 | `play('iai'/'hit'/'hurt'/'victory')`、`playIaijutsuBgm()` | 新建 `audio.ts`，程序化合成（见第 7 节） |
| `Main` | 30 | `shakeTrauma` 震屏、`_burst` 爆散、`canvas` 引用 | 自建 `camera.shake` + `particles.burst()` |
| `CFG` | 23 | `CFG.W`/`CFG.H` 画布尺寸 | 常量或从 canvas 读 |
| `FX` | 23 | `floatText` / `slash` / `dash` / `trail` | 自建 `fx.ts`，先做飘字与斩痕 |
| `UI` | 22 | 皮肤商店 `isIaiShopOpen` / `openIaijutsuShop` | 第一版直接砍掉商店，皮肤写死在配置里 |
| `Utils` | 13 | `dist` / `clamp` / `distToSegment` | 复制这四个函数，20 行 |
| `Physics` | 5 | `checkSegmentOverlap` / `checkSectorOverlap` / `clampToBounds` | 复制，纯几何，可加单测 |
| `MiniGames` | 4 | 宿主状态机（`active` / `currentGame`） | 自建主循环，不再需要 |
| `Input` | 4 | `logicalPos()` 鼠标世界坐标 | 直接读 `pointer` 事件 |

**结论：需要 7 个桩 + 1 个 Player 类，约 300~400 行胶水代码。** 不是"复制过去就能跑"。

---

## 6. 迁移步骤（每步都可运行、可回退）

| 阶段 | 内容 | 验收 |
|---|---|---|
| P0 | 建目录、Vite+TS 脚手架、一个空画布 + 固定步长循环 | `npm run dev` 有画面、帧率稳定 |
| P1 | 移植 `Player` 的突进（`dashT`/`dashAngle`/冷却）+ 光标瞄准 | 能朝鼠标冲，冷却有可视化 |
| P2 | 移植靶子（`iaijutsu_targets.js` 的 `createDummy`/`drawDummy`）+ 线段命中 | 斩中靶子消失、连斩数上涨 |
| P3 | 断连判定 + 3 条命 + 结束结算 | 挥空扣命、3 次结束 |
| P4 | **改造 3.1~3.5**（删右键、靶→敌、血条、子弹时间大招、里程碑精英） | 手感自测：会不会想再来一把 |
| P5 | 程序化音效（斩/命中/破空/开大） | 关掉声音对比一次，确认音效是判定的一部分 |
| P6 | 迁移特效（先斩痕，后粒子，最后再考虑 5 种大招演出） | 只迁玩家看得见的那 20% |

**P4 之后如果不好玩，就停在那里重想，不要继续堆 P6 的特效。** 原版的教训就是外围堆太多。

---

## 7. 参考文件清单（要拿走什么）

### 必读（直接对应要移植的逻辑）

| 文件 | 行数 | 拿什么 |
|---|---|---|
| `D:\Desktop\word\games\game4\js\modes\iaijutsu\iaijutsu_mode.js` | 675 | **主循环骨架**：`update()` 的顺序（大招→狂暴→子弹时间→靶更新→输入→突进碰撞→结束结算）、`onKill()` 的连斩与充能逻辑、`triggerDisconnect()` 的断连处理 |
| `...\iaijutsu_targets.js` | 319 | 三种靶的数据结构与巡逻运动（`updateDummy`）、环形倒计时绘制（`drawDummy`）、生成时的半径与分布策略 |
| `...\iaijutsu_ultimates.js` | 1432 | **只读 `trigger()` 与 `update()` 的状态机骨架**（`ultimateTimer` / `pauseTimer` / `finisherWaves` 四段式），演武内容不要 |
| `...\iaijutsu_fx.js` | 1319 | `playSkinSlashFx` 的斩痕画法（激光斩痕 + 残影 + 粒子）；`renderFinisherWaves` 的冲击波；`renderDojoBackground` 的光影背景 |
| `...\iaijutsu_skins.js` | 375 | 皮肤数据结构（`primaryColor` / `particleColors` / `burstEmoji`）——第一版只留颜色，丢掉解锁逻辑 |
| `...\README.md` | 79 | 模块划分说明与扩展方式 |

### 需要抄小段代码的引擎文件

| 文件 | 拿什么 |
|---|---|
| `D:\Desktop\word\games\game4\js\core\physics.js`（229 行） | `checkSegmentOverlap`（冲刺线段 vs 圆）、`checkSectorOverlap`（扇形）、`clampToBounds` |
| `D:\Desktop\word\games\game4\js\core\sfx.js`（663 行） | 看 `play('iai')` / `play('hit')` / `play('hurt')` 的合成配方，照搬到自己的 `audio.ts`；注意它是程序化合成，无版权素材 |
| `D:\Desktop\word\games\game4\js\core\fx.js`（74 行） | `floatText` / `slash` / `dash` / `trail` 四个接口的形状（只是委托，看签名即可） |
| `D:\Desktop\word\games\game4\js\entities\player.js`（1730 行） | **只看突进相关的字段与更新**：`dashT`、`dashAngle`、`skillTimers`、`invulnTimer`、`aimAngle`，不要整个类 |
| `D:\Desktop\word\games\game4\js\modes\minigames.js`（2444 行） | `META.iaijutsu`（名称/描述/操作文案，第 50 行附近）、`finishGame()` 的结算与存档（第 410 行附近） |
| `D:\Desktop\word\games\game4\index.html` | 搜 `iaijutsu-reticle`：准星是 **DOM 元素**而不是 canvas 绘制，用 `translate3d` 硬件加速跟随，避免受震屏影响 |

### 手感与架构的样板（跨项目）

| 文件 | 拿什么 |
|---|---|
| `D:\Desktop\word\games\feellab\index.html`（890 行） | **实时滑杆调参 + 固定步长 + 拖尾/挤压反馈**的组织方式；`DEFAULTS`（第 173 行）里的手感参数写法可以直接照搬成 `config.ts` |
| `D:\Desktop\word\games\game6_rogue\AGENTS.md` | "数值只写一处""纯函数模块 + 单测""渲染只读"三条约束，独立版也值得照做 |
| `D:\Desktop\word\games\game6_rogue\src\game\infra\audio.ts`（980 行） | 比 game4 的 sfx 更干净的合成器写法：`playShoot/playHit/playExplosion` 的包络与噪声带通，适合当音效层模板 |
| `D:\Desktop\word\games\game6_rogue\docs\CONTRIBUTING.md` | 引擎分层范式（编排层只放状态与副作用，判断与算式抽纯函数） |

### 不要参考

- `iaijutsu_ultimates.js` 里五种流派的具体演出（时停/万剑/修罗/雷网）——那是外围，第一版不做。
- `iaijutsu_skins.js` 的 19 套皮肤与解锁曲线——第一版不做。
- game4 的 `load_order.js` 脚本清单机制——独立版用 bundler，不需要。

---

## 8. 音效与版权

原版参赛版不给额外音效，是因为要规避版权；作者自玩版加了自己的居合音与 BGM，体验立刻不同。

独立版的正确做法：

1. **默认程序化合成**（Web Audio 现场算波形，无素材文件，零版权风险）。一刀斩击拆三层：
   - whoosh：带通噪声 + 快速下扫（破空）
   - ring：两个高频正弦 + 长衰减（金属余韵，居合的味道）
   - hit：短噪声脉冲 + 低频冲击（重量）
2. **可选本地绑定**：允许玩家拖入自己的 wav/mp3 绑定到"斩中/挥空/里程碑/开大"，文件只存本地、`.gitignore` 掉，发布版回落到合成音。

**音效不是装饰，是判定的一部分**：延迟超过 60ms，手感立刻变糊。所以音频要和碰撞判定同阶段实现（P5 不能省）。

---

## 9. 验收标准

- 连续玩三局，第三局仍想开第四局（这是唯一有效的验收）。
- 挥空导致的失败与被敌人打死的失败，都能说出"我刚才错在哪"。
- 关掉音效后明显觉得不跟手（证明音效真的在承担判定反馈）。
- 单局时长 30~90 秒，死亡到重开不超过 1 秒。
