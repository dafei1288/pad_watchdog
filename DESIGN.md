---
name: Pad 时间管家
description: 遥控器与节目单——家长手里那支遥控器，和一张印好的电视节目单，是界面仅有的两件实物。
colors:
  sheet: "#f4f1e8"
  sheet-2: "#e9e4d6"
  ink: "#22262b"
  ink-2: "#5a6167"
  rule: "#c6cbd0"
  shell: "#e7e4dc"
  key: "#cfcbc0"
  key-deep: "#b4afa3"
  rec: "#d93a2b"
  rec-ink: "#b02a1f"
  play: "#2e7d4f"
  play-ink: "#1f5c39"
  timer: "#b4761a"
  timer-ink: "#7a4e0c"
  timer-lit: "#e8a63c"
  wood: "#b08a5e"
  focus: "#1f5c39"
typography:
  big:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  read:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    letterSpacing: "0.01em"
  body:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    letterSpacing: "normal"
  note:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  xs: "2px"
  sm: "3px"
  md: "6px"
  lg: "10px"
  dot: "50%"
spacing:
  s1: "6px"
  s2: "10px"
  s3: "16px"
  s4: "26px"
  s5: "40px"
components:
  remote:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 14px 14px"
    width: "200px"
  key:
    backgroundColor: "{colors.key}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "34px"
  btn:
    backgroundColor: "{colors.key}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "7px 15px"
  btn-play:
    backgroundColor: "{colors.play}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "7px 15px"
  btn-rec:
    backgroundColor: "{colors.rec}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "7px 15px"
  btn-quiet:
    textColor: "{colors.ink-2}"
    padding: "7px 4px"
  blank:
    textColor: "{colors.ink}"
    padding: "3px 2px"
  tab:
    backgroundColor: "{colors.sheet-2}"
    textColor: "{colors.ink-2}"
    padding: "6px 15px 7px"
  tag:
    textColor: "{colors.ink-2}"
    padding: "1px 7px"
  label-tape:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
  pen-note:
    textColor: "{colors.rec-ink}"
    rounded: "{rounded.sm}"
    padding: "2px 9px"
  read-big:
    textColor: "{colors.ink}"
    typography: "{typography.big}"
---

# Design System: Pad 时间管家

## Overview

**Creative North Star: 「遥控器与节目单」**

这个界面里只有两件实物：家长手里那支遥控器，和压在电视柜上的一张印好的节目单。遥控器管动作——绿色播放键是「开始看」，方形暂停键是「到这儿」，数字键是「这次看多久」，深色显示窗里亮着一行琥珀读数，红点亮着就是正在录。节目单管记录——纸是地面，墨是文字，表格线把七天、一个月、八周排成能竖着扫下来的列，红笔在超掉的那一行上画圈、划线、打星。屏幕上的每一块颜色、每一道形状都必须属于这两件东西之一；答不上来是哪一件的，就不该出现。

两件材料的分工是硬性的。节目单平：页面、版块、表格、行都没有投影，分栏只靠 2px 的墨线和 `--sheet` / `--sheet-2` 的明度差。遥控器有厚度：壳和键站着，靠零模糊的硬边侧影（`0 2px 0` / `0 4px 0` 的 `--key-deep`）和不大于 1px 的位移，让键看起来真的能按下去。全站唯一的柔性投影是到点提醒那个弹层——它必须是抬起来的，因为那是产品仅有的强制手段。

颜色全部从这两件实物上取，不从色相表上取：节目单的纸、印刷墨、表格线；遥控器的壳、橡胶键、键侧、深色显示窗；以及三种各管一件事的灯色——红是「在录／正在播出／红笔」，绿是「开始」，琥珀是「还剩多久」。全站只有一个红，它同时是录制点、在播红杠和红笔。

**Key Characteristics:**
- 只有两件实物：遥控器（壳／键／深色显示窗）与节目单（纸／墨／表格线）；`--wood` 电视柜木色只做遥控器下面那条 12px 底座
- 全站一种红（`--rec` 图形 / `--rec-ink` 文字）：录制点、正在播出的红杠、红笔的圈划星，从不铺面
- 三个灯色各管一件事：绿＝开始／播放，琥珀＝剩余时间（深色窗上用亮琥珀 `--timer-lit`），红＝在录／超了
- 纸面零投影，深度只来自键的硬边行程与唯一的到点弹层
- 数字一律 `tabular-nums`：节目单是表，列必须对得齐
- 全站一道断点：`600px`

## Colors

一套从纸、墨、塑料和三种指示灯上取来的颜色：纸做地面，墨做字与线，橡胶键的侧影做深度，红绿琥珀各占一件事。

### Primary
- **遥控器壳 Remote Shell** (`#e7e4dc`) 与 **橡胶键 Rubber Key** (`#cfcbc0`)、**键侧 Key Cap Side** (`#b4afa3`): 壳是遥控器的机身，键是能被按下去的那一层，键侧那个深一档的米灰同时是键的边界、键的侧影和整个遥控器的投影色。三者一起才是「一颗键」。
- **印刷墨 Printed Ink** (`#22262b`): 正文、`h2`、版块顶上的 2px 分栏线、表格里的 2px 强调线。在节目单纸上对比度 13.47:1。

### Secondary
- **录制红 Recording Red** (`#d93a2b`) 与 **红笔文字 Red-Pen Ink** (`#b02a1f`): 同一个红的两种用法。`--rec` 只做图形——录制灯、正在播出的红杠、红圈、划线、星；`--rec-ink` 是它落到文字上的版本（红笔批注、超支数字，5.82:1）。
- **播放绿 Play Green** (`#2e7d4f`) 与 **播放绿文字 Play Green Ink** (`#1f5c39`, 7.02:1): 播放键的键面与「已记下」这类确认文字。绿只说一件事：开始／成立。

### Tertiary
- **定时琥珀 Timer Amber** (`#b4761a`) 与 **定时琥珀文字 Timer Amber Ink** (`#7a4e0c`, 6.36:1): 睡眠定时的灯与文字——「这次定了几分钟」「还剩多少」。
- **显示窗亮琥珀 Display Amber** (`#e8a63c`): 只出现在遥控器那个深色显示窗里（`#20242a` 底上 7.39:1）。遥控制式的读数必须比纸面上的琥珀亮一档，才像发光。
- **电视柜木色 TV-Cabinet Wood** (`#b08a5e`): 遥控器底座那一条 12px。非文字，非按钮，只是让遥控器有地方站着。

### Neutral
- **节目单纸 Listings Paper** (`#f4f1e8`): 页面地面，也是所有表格与版块的底。
- **次纸 Second Stock** (`#e9e4d6`): 表头行、未选中的页签、月表里不属于本月的日子、头像槽。比纸低一档，用来分「印过的区域」和「空白的区域」。
- **次级墨 Secondary Ink** (`#5a6167`): 次级文字、单位、脚注、未选中的页签（5.57:1）。
- **表格线 Table Rule** (`#c6cbd0`): 1px 的格线与下划线。非文字色。
- **焦点环 Focus Ring** (`#1f5c39`): `:focus-visible` 的 2px 外环，以及 `.blank` 聚焦时那条下画线（7.02:1）。

### Named Rules
**The Two Objects Rule（只有两件实物）.** 新颜色先回答它是遥控器上的还是节目单上的——壳、键、键侧、显示窗、灯；纸、墨、表格线。答不上来就不加。

**The One Red Rule（一种红）.** 全站只有一个红（`--rec`），它同时是录制点、正在播出和红笔；文字上用 `--rec-ink`。红不铺面，只做点、杠、圈、划、星。

**The Lamp Colors Rule（灯色各管一件事）.** 绿＝开始，琥珀＝剩余时间，红＝在录／超了。三个灯色永不复用为装饰或品牌色。

## Typography

**Display Font:** 无自定义字体；全部走系统中文栈 `'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif`
**Body Font:** 同上
**Label/Mono Font:** 无；数字靠 `font-variant-numeric: tabular-nums` 等宽，不靠换字体

**Character:** 这是一套印刷体和模压字：节目单上的字是印上去的，遥控器上的数字是印在键上的。整个应用没有手写体、没有装饰字体，四个字号步都从 `:root` 取。

### Hierarchy
- **Big** (700, 40px / `--t-big`, line-height 1): 节目单右上角那个剩余分钟读数（`.read-big`），以及倒计时结束时的确认数。全应用最大的字。
- **Read** (400, 19px / `--t-read`, 字距 +0.01em): 表格里的分钟数、补记输入框（`.manual-min`）。朗读级的数，比正文明显大一档。
- **Body** (400, 14.5px / `--t-body`): 正文、按钮、页签、说明。
- **Note** (400, 12px / `--t-note`): 表头行、单位（「分钟」）、图例、标签、遥控器名字条、深色显示窗旁的小字。

### Named Rules
**The Tabular Rule（数字成列）.** 所有数字都挂 `.num`：`font-variant-numeric: tabular-nums; letter-spacing: 0.01em`。数字不加字距、不换字体、不右对齐以外的花活——七天横条、月表、8 周账本都要能竖着扫下来。

**The Printed Label Rule（表头是印上去的）.** `h2` 一律 13px / 700 / 字距 0.14em，颜色 `--ink-2`（在 `.block` 里落 `--ink`）。标题不是 display，它只是节目单上的栏头，靠字距而不是字号立住。

## Layout

单栏节目单：`.sheet-page` 是 `max-width: 900px` 居中，左右 `--s3`(16px)、底 `--s5`(40px)。页眉 `.masthead` 底边压 2px 实心 `--ink`，标题 21px（窄屏 18px），右边四个页签像印在纸上的签条——`--sheet-2` 底、1px `--rule` 边、底边不封，选中的一张换成纸色、加粗，并在顶边压一笔 3px 的红（`inset 0 3px 0 var(--rec)`）。

版块用印刷横线分栏，不用盒子：`.block` = 顶边 2px `--ink` + `padding-top: --s2`，`margin-bottom: --s4`。首屏 `.console-block` 是 flex：左边 200px 遥控器（下面坐一条 12px `--wood` 底座，再下面才是折行），右边是节目单主体（`gap: --s4`）。

表格是排版的主体。`.table` 顶底各 1px `--rule`，`.row` 是 CSS grid，`.cell` 右侧 1px `--rule`、`padding: 5px 6px`；最后一行去底线、最后一格去右线。几种网格：七天横条 `repeat(7, minmax(0,1fr))`；周表 `minmax(7em,1.4fr) + repeat(7, minmax(0,1fr)) + minmax(2.6em,.7fr)`；月表 `repeat(7, 1fr)`，每天最小高 58px；8 周账本 `7.6em + repeat(var(--cols,8), minmax(0,1fr))`。

垂直节奏只有五步：`--s1` 6px、`--s2` 10px、`--s3` 16px、`--s4` 26px、`--s5` 40px。表格内部固定用 `--s2` 一档，版块之间用 `--s4`。

窄屏只有一道 `@media (max-width: 600px)`：`.sheet-page` 左右收到 12px、遥控器 `width: 100%`（键仍然不缩小到按不准）、显示窗读数 22→20px、页签 padding 收到 `6px 11px 7px` 且字号 13px、周表列收窄、月表日格收到 52px。`StatsView` 另有一个 `matchMedia('(max-width: 600px)')`，同一个分界：8 周账本在窄屏只排最近 5 周。

### Named Rules
**The One Breakpoint Rule（一道断点）.** 全站只认 `600px`。窄屏是同一张节目单印小一点：先让遥控器占满一行，再收表格列，最后把 8 周账本收到 5 周。不加第二道断点，不隐藏信息。

**The Rule Line Rule（分栏靠墨线）.** 版块与表格之间只用 2px `--ink`（分栏）与 1px `--rule`（分格）两条线，不画卡片、不加底色块。

## Elevation & Depth

这是一套「纸平、键有行程」的系统。节目单没有任何投影：分层靠墨线（2px 分栏、1px 分格）与纸的明度差（`--sheet` 地面 / `--sheet-2` 次纸 / `--shell` 塑料壳）。深度只属于遥控器——壳和键用零模糊的硬偏移影立起来（`0 4px 0` 的壳、`0 2px 0` 的键，都是 `--key-deep`），键面再补一道 `inset 0 1px 0 rgba(255,255,255,…)` 的高光；键区是一个凹进去的 `.pad`（`inset 0 1px 2px rgba(34,38,43,.12)`），所以键是从槽里冒出来的。唯一的柔性投影是到点提醒弹层。

### Shadow Vocabulary
- **键帽** (`box-shadow: 0 2px 0 var(--key-deep), inset 0 1px 0 rgba(255,255,255,0.65)`): 每颗数字键与按钮的静止态。
- **遥控器壳** (`box-shadow: 0 4px 0 var(--key-deep), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -2px 0 rgba(0,0,0,0.06)`): 整支遥控器站在柜面上的厚度。
- **键区凹槽** (`box-shadow: inset 0 1px 2px rgba(34,38,43,0.12)`): `.pad`，让键看起来嵌在壳里。
- **名字条** (`box-shadow: 0 1px 1px rgba(34,38,43,0.12)`): 贴在壳上的纸签，一层几乎看不见的浮起。
- **电视柜底座** (`box-shadow: 0 4px 6px rgba(34,38,43,0.18)`): `.stand` 那条木色把遥控器的重量放到纸面上。
- **到点弹层** (`box-shadow: 0 8px 24px rgba(34,38,43,0.3)`，遮罩 `rgba(34,38,43,0.55)`): 全站唯一真正抬起来的面。
- **焦点下划** (`box-shadow: 0 2px 0 var(--focus)`): `.blank` 聚焦时在横线下再描一道。
- **红笔圈** (`box-shadow: inset 0 0 0 2px rgba(217,58,43,0.55)`): `.circled`，把今天那个号数圈起来。
- **在播红杠** (`box-shadow: inset 0 -3px 0 var(--rec)`): 并排表今天那一列的列头。
- **选中页签** (`box-shadow: inset 0 3px 0 var(--rec)`): 当前页签顶边压的一笔红。

### Named Rules
**The Keys Have Travel Rule（键有行程）.** 遥控器上的键必须按得下去：常态 `0 2px 0 --key-deep`，hover `translateY(-1px)` 配 `0 3px 0`，按下 `translateY(1px)` 且影归零，过渡 0.08s ease。行程只属于键。

**The Flat Paper Rule（纸不带影）.** 除到点提醒弹层外，任何纸面元素（版块、表格、行、标签）都不得有外投影；纸面也永远不用零模糊的硬偏移影——硬边侧影是塑料键的语言，不是纸的。

## Shapes

两套形态，界限清楚。遥控器是模压塑料件：壳 10px 圆角、键 6px 圆角、名字条 2px 圆角（一张贴上去的纸签，还转 −2°）、顶部一道 22×4px 的深色发射头。节目单是印刷品：版块和表格全是直角，靠线条分栏；直角的例外只有两处纸制品——`.pen-note`（3px 圆角、转 −1.2°，一张夹在纸上的红笔小条）和页签的 2px 小弧。

圆角只有四档：2px（名字条）、3px（红笔批注条）、6px（所有按钮、数字键、深色显示窗、头像槽、键区凹槽）、10px（遥控器壳与到点弹层）。圆形（`50%`）只给「点」：孩子色点 `.kid-dot`（表内 9px，小号 7px）、录制灯 10px、定时灯 16px。

### Named Rules
**The Straight Sheet Rule（纸是裁直的）.** 节目单与表格永远是直角；圆角只属于遥控器上的塑料件和两三张小纸签。不要把版块、行、格子做成圆角卡片。

**The One Circle Rule（圆只给点）.** `border-radius: 50%` 只用于孩子色点、录制灯和定时灯；按钮不做胶囊——这是遥控器，不是药丸。

## Components

每个组件都是这两件实物上的一处细节：它在什么时候出现，它的状态怎么被材质表达。

### Buttons
- **Shape:** 6px 圆角、1px `--key-deep` 边、`padding: 7px 15px`，键感（`0 2px 0`）。
- **Primary:** `.btn` 是默认的橡胶键（`--key` 面、`--ink` 字）；`.btn-play` 是绿键（`--play` 面、白字、边 `#24603d`）；`.btn-rec` 是红键（`--rec` 面、白字、边 `#a72c20`，用于「确认删除」）。三种键形状完全一样，只有颜色换。
- **Hover / Focus:** hover `translateY(-1px)` + `0 3px 0`；`:active` `translateY(1px)` + 影归零；`:focus-visible` 是 2px `--focus` 外环、offset 2px。过渡 `transform 0.08s ease, box-shadow 0.08s ease`（绿键红键另加 0.12s 的背景过渡）。
- **Secondary:** 与 `.btn` 同档（不设第二套次级按钮）。补记页里的 `.chip-btn`（分钟／时段选块）也是这套键感，选中换成 `--ink` 面 + `--sheet` 字。
- **Quiet:** `.btn-quiet` —— 无底无边、`--ink-2` 字、下划线 offset 3px；hover 只加深到 `--ink`，不位移不加影。用于「划掉」「改名」「收起」「重试」。
- **Disabled:** `opacity: 0.45`（遥控器的键是 0.4），取消位移与影，`cursor: not-allowed`。

### Chips / Tags
- **Style:** `.tag` —— 1px `--rule`、`--ink-2` 字、12px、直角、`padding: 1px 7px`。标记记录来源（「计时」／「补记」）。
- **State:** `.tag-rec` 换 `--rec` 边 + `--rec-ink` 字，写「在录」。

### Cards / Containers
- **Corner Style:** 直角。`.block` 没有圆角，只靠顶边 2px `--ink` 分栏。
- **Background:** `--sheet`；表头行、未选中的日、头像槽用 `--sheet-2`。
- **Shadow Strategy:** 无影（见 Elevation & Depth）；纸面上唯一的抬起面是到点弹层。
- **Border:** 表格顶底与格线 1px `--rule`；分栏 2px `--ink`。
- **Internal Padding:** `--s2`(10px) 起，版块之间 `--s4`(26px)。
- **`--kid`:** 每个孩子一个固定色，以行内 `style="--kid: …"` 注入；只喂 `.kid-dot`、名字条和图表里的孩子标记，不做底色不做边框。

### Inputs / Fields
- **Style:** `.blank` —— 没有框，只有一条 1.5px `--rule` 下划线，`padding: 3px 2px`；数字输入挂 `.num`，额度表里的数字右对齐。
- **Focus:** 去掉 outline，下划线换 `--focus` 并加一道 `0 2px 0 var(--focus)`——像用绿笔在格子线上再描一遍。
- **Placeholder:** `--ink-2`。错误文字用 `.danger`（`--rec-ink`）紧挨字段，并加 `role="alert"`。

### Navigation
- **Style:** `.tabs` 四个纸签——`--sheet-2` 底、1px `--rule` 边、底边不封、`padding: 6px 15px 7px`、14.5px。
- **Default / Hover / Active:** 默认 `--ink-2`；hover 换 `--sheet` 面、字变 `--ink`；选中（`.router-link-active`）换纸面 + 700 + 顶边 `inset 0 3px 0 var(--rec)`。窄屏只收 padding（`6px 11px 7px`）与字号（13px）。

### Signature: 遥控器 Remote
`.remote`（`RemoteControl.vue`）是这个世界唯一的实物，四件套固定：**壳**（`--shell`、1px `--key-deep` 边、10px 圆角、厚影 `0 4px 0`、顶部一道 22×4px 发射头）；**名字条**（`.label-tape`：`--sheet` 纸签、1px `--rule`、2px 圆角、`rotate(-2deg)`、名字前一颗 7px `--kid` 圆点或头像，超出省略——像贴上去的标签）；**深色显示窗**（`.dvr`：`#20242a` 底、`#14171b` 边、6px 圆角，读数 22px/700 `--timer-lit` 等宽，右边 11px `#9aa3ab` 的小字写「正在录」或「本次定时」）；**键区**（`.pad` 凹槽：左边 3×4 数字键，右边竖排 46×46 的绿播放键、46×38 的暂停键、10px 录制灯）。录制灯未录是 `rgba(217,58,43,0.25)` 的灰红，在录换 `--rec` 并以 1.4s 呼吸。计时中数字键与播放键禁用、占位键 `—` 永久禁用。

### Signature: 节目单 Listings Sheet
表格就是节目单，一套骨架三种用途：**七天横条**（本周每天分钟 + 今天那格一道 3px 红杠在走 + 一天一排红笔小星）；**月表**（`repeat(7,1fr)`，每格号数 + 当天分钟 + 孩子色点；今天用 `.circled` 红圈圈住号数，选中日 `.day.on` 用 `inset 0 0 0 2px --ink` 框住整格，非本月用 `--sheet-2`）；**周账本**（`--cols` 个等宽数字列，本周那格 `.circled` 红圈，窄屏 8→5 列）。表头行永远是 `--sheet-2` + 12px `--ink-2`。

### Signature: 红笔星级 Red-Pen Stars
`StarMark.vue` + `starPath.js`：五颗手画的星（`STAR_PATHS` 是五条顶点各偏一点的 SVG path，所以每颗都不一样）。未评是 `--rule` 描边的空心星（16px、stroke 1.5）；评过的换成 `--rec` 填充（`fill-opacity: 0.85`）+ `--rec-ink` 描边，并 `rotate(-7deg)`（偶数颗 +5°）——笔尖没走直。hover 是 `scale(1.12)` 变 `--ink-2`，过渡 `transform 0.1s ease, color 0.12s ease`。点第 N 颗给 N 分，再点同一颗清零；表格里用同一颗 path 缩到 9px。

### Signature: 红笔批注 Red-Pen Note
`.pen-note`：`--sheet` 底、1.5px `--rec` 边、3px 圆角、`--rec-ink` 字、12px、`rotate(-1.2deg)`、`padding: 2px 9px`。只在透支或预扣时贴到节目单边上（「下周先划掉 X 分钟」）。配套的 `.struck` 用 2px `--rec` 的 `line-through` 划掉一条记录。

### Signature: 打印空格 Printed Blank
`.blank` 是节目单上留给人填的那条线：1.5px `--rule` 下划线、无框、`padding: 3px 2px`、占位字 `--ink-2`；聚焦时下划线换 `--focus` 并加一道 2px 同色下影。额度表（每周放多少／一次最多投／最多能欠）、补一行、批注、密码都用它。

### Signature: 后盖 Back Cover
`LoginView` / `SettingsView` 的锁屏是一张 340px 宽的节目单页：`h2` 写「拧开后盖」，密码是一个字距 0.16em 的 `.blank`，按钮整行 100%。设置页把额度写成 `.quota` 三行（13px `--ink-2` 标签 + 右对齐数字 `.blank` + 单位），头像坐在一个 48px 的 `--sheet-2` 槽里（6px 圆角、1px `--rule`），孩子名字旁永远跟着一颗 `--kid` 圆点。

### Named Rules
**The Record Lamp Rule（红点说话）.** 「正在录」只用那盏 10px 红灯（1.4s 呼吸）和 `.tag-rec`，不用按钮变色、不用整行高亮。

**The Printed Blank Rule（填空在线上）.** 一切可输入处都写成节目单上的横线（`.blank`），不出现带框输入框。

## Do's and Don'ts

### Do:
- **Do** 从 `:root` 取色与尺寸（`var(--sheet)`、`var(--rec)`、`var(--s3)`）；新颜色必须先回答它是遥控器上的还是节目单上的。
- **Do** 给所有数字挂 `.num`（`tabular-nums` + 0.01em 字距），让七天横条、月表、8 周账本的数字竖着对得齐。
- **Do** 用 2px `--ink` 分版块、1px `--rule` 分格——节目单靠墨线，不靠卡片盒子。
- **Do** 让键有行程：常态 `0 2px 0 var(--key-deep)`、hover 抬 1px、按下影归零，过渡 0.08s ease。
- **Do** 把「今天」印成红笔：七天横条上一道 3px `--rec` 红杠（`live-sweep 2.6s ease-in-out infinite` 在走）、月表号数与账本本周格用 `.circled`（`inset 0 0 0 2px rgba(217,58,43,0.55)`）、并排表今天那列压 `inset 0 -3px 0 var(--rec)`。
- **Do** 用 `.unfold`（`grid-template-rows` 0fr→1fr，0.26s ease）收起明细与补记，别动 `height`。
- **Do** 保留 `prefers-reduced-motion: reduce` 里的全局收敛（动画与过渡 0.01ms），新增动效自动被兜住。
- **Do** 把到点提醒做成唯一的抬起面：`.timer-box` 纸底 + 2px `--ink` 边、16px 琥珀灯以 1.2s 呼吸、`0 8px 24px` 影、`rgba(34,38,43,0.55)` 遮罩，并且必须点「知道了」才停。

### Don't:
- **Don't** 让红铺面：`--rec` 只做点、杠、圈、划、星，`--play` / `--timer` 只出现在键、灯和读数上。
- **Don't** 用色相词命名颜色（「橙色」「灰色」）；用实物命名——节目单纸、印刷墨、表格线、遥控器壳、橡胶键、录制红、电视柜木色。
- **Don't** 在纸面上加投影，也别用模糊影做深度；纸面的深度只来自墨线，立体只来自键的硬边行程。
- **Don't** 把按钮做成胶囊，也别给版块、表格、行加圆角；圆角只属于塑料件（6px／10px）和两三张小纸签（2px／3px）。
- **Don't** 混用灯色：绿＝开始、琥珀＝剩余时间、红＝在录／超了，一个都不许挪作他用。
- **Don't** 新增第二道断点，也不用 `md:`／`lg:` 这类命名；全站只有 `600px`。
- **Don't** 用 emoji 或 Unicode 字符去替能画出来的界面符号——播放／暂停是 SVG path，录制灯和定时灯是 CSS 圆点，星是 SVG path；emoji 只留给孩子头像与相册入口这类内容。
