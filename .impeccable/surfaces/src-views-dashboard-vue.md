---
version: 1
slug: "src-views-dashboard-vue"
primary_target: "src/views/Dashboard.vue"
related_targets: ["src/App.vue","src/views/CalendarView.vue","src/views/StatsView.vue","src/views/SettingsView.vue","src/views/LoginView.vue","src/components/RemoteControl.vue"]
---

## Direction contract

THESIS: 家长手里那支遥控器，和贴在电视柜上的一张节目单。播放＝开始，暂停＝结束，睡眠定时＝到点提醒；应用里没有"关机"这个动作。它拒绝的类别默认：流媒体式的卡片墙 + 环形进度 + 柱状图；也拒绝把遥控器做成管控道具。

OWN-WORLD: 节目单纸 #F4F1E8 与印刷墨 #22262B、表格线 #C6CBD0、红笔；遥控器壳 #E7E4DC 与橡胶键 #CFCBC0；录制红 #D93A2B、播放绿 #2E7D4F、定时琥珀 #B4761A；电视柜木色地面。圆角只有两种：遥控器壳（10px）与按键/按钮（6px），纸片（名字条、红笔小条）用 2px；线只有两种：1px 印刷表格线、红笔手绘（细、略带抖动）。字号只有四档：节目单小字 / 正文 / 读数 / 大读数；中文用系统黑体（印刷语汇本来就是工作字体），数字一律 tabular-nums 对齐，不再依赖自托管圆体字。控件要有行程：按下 = 真实位移 + 回弹 + 一声轻响。

STORY: 家长按播放就开始、按暂停就结束、睡眠定时到点就响；"本周还剩多少"印在节目单右上；超用是"下周先划掉"；每天那格可以打星。

FIRST VIEWPORT: 手机首屏自上而下：一支贴着孩子名字标签纸的遥控器（数字键、播放/暂停、睡眠定时、亮着的红录制点）；遥控器下面铺着本周节目单——周一到周日七列，今天那格有一条"正在播出"的红杠在走；节目单右上角印着本周还剩；底部两个动作：按播放开始、补记一行。透支时节目单边缘夹着一张红笔小条："下周先划掉 60 分钟"。

FORM: 自写 grounded 列表第 1 条（共鸣度排序：遥控器与节目单 > 播放进度条与缩略图轴 > 动画片的一集 > 投屏控制条与录制红点 > 录像带与计数器 > 播出控制台 > 碟机章节菜单）；掷骰 seed key d6fc070b，本轮是换界重掷（旧世界及其展示过的方向全部作废），用户在换界轮选了 IMPECCABLE'S PICK（遥控器·节目单），压过掷中的录像带。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
