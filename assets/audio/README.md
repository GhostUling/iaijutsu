# 音频资源（不入库，需本地自备）

本目录的 9 个音频文件体积合计约 32MB，因此按 game4 的惯例加入 `.gitignore`，
仓库里只保留这份清单。缺文件时游戏仍可运行：拔刀音会回落到 Web Audio 合成音，
BGM / 试听会静音，但玩法与手感不受影响。

## 文件清单

| 文件 | 体积 | 用途 | 缺失时 |
|---|---|---|---|
| `juhe3.mp3` | 5 KB | 拔刀音（首选） | 依次尝试下一级 |
| `juhe2.mp3` | 13 KB | 拔刀音（二级回退） | 依次尝试下一级 |
| `juhe1.wav` | 98 KB | 拔刀音（三级回退） | 回落合成音 |
| `iaijutsu_bgm.ogg` | 5.8 MB | 默认战歌（音量比 0.12） | 无 BGM |
| `bgm_iaijutsu_1.mp3` | 126 KB | 疾风迅雷 · 破晓 | 该曲试听/装备失败 |
| `bgm_iaijutsu_2.mp3` | 8.9 MB | 落樱幽瞑 · 禅心 | 同上 |
| `bgm_iaijutsu_3.mp3` | 7.9 MB | 修罗血海 · 焚天 | 同上 |
| `bgm_iaijutsu_4.mp3` | 8.3 MB | 太虚星海 · 绝巅 | 同上 |
| `bgm_iaijutsu_5.mp3` | 126 KB | 水墨玄机 · 无我 | 同上 |

## 恢复方式

从原项目直接复制（同源文件，勿改名）：

```bash
cp D:/Desktop/word/games/game4/assets/audio/{juhe1.wav,juhe2.mp3,juhe3.mp3,iaijutsu_bgm.ogg} assets/audio/
cp D:/Desktop/word/games/game4/assets/audio/bgm_iaijutsu_{1,2,3,4,5}.mp3 assets/audio/
```

曲目名、解锁门槛与音量比定义在 `js/modes/iaijutsu/iaijutsu_skins.js` 的 `BGM_LIST`，
文件名改动会导致对应曲目静音，别改。
