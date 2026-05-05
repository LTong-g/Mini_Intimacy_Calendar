> 提示：请使用 UTF-8 编码读取本文件。

# Developer Guide

## 1. 项目定位
`MinimalistWeaponEnhancementCalendar` 是一个基于 Expo + React Native 的移动端打卡应用。  
它围绕“按日期记录三类行为”这个核心目标，提供日历视图、数据统计和数据导入导出能力。
三类行为均为代称，实际意义是三种应当自律，合理控制频率的行为。即软件功能为记录没有自律的时候，并提供一些统计分析。

## 2. 功能总览
### 2.1 日历主流程
- `日视图`：查看某一天的记录状态、图标信息、间隔天数。
- `月视图`：按网格展示某月每天的打卡状态，支持左右滑动切月。
- 月视图点击当月日期时先选中日期，再次点击已选中的非未来日期会进入对应日期的日视图；点击已选中的未来日期不跳转；点击非未来的灰色日期会切到该日期所在月份并选中该日期；点击未来的灰色日期无操作。
- `年视图`：以 12 个月缩略日历展示全年分布，支持左右滑动切年。

### 2.2 打卡记录
- 三类打卡项：
- `tutorial`（观看教程）
- `weapon`（武器强化）
- `duo`（双人练习）
- 软件内部统一使用“按日期记录次数”的新格式。
- 同一天、同一类型支持多次记录。
- 未来日期不可编辑。
- 底部打卡面板短按某类型会将该类型次数加 `1` 并关闭面板。
- 日视图已有记录图标长按时会按秒减少该类型次数，达到连续操作阈值后打开次数编辑弹窗。
- 日视图中同类型次数大于 `1` 时，图标内部显示次数数字。
- 月视图底部打卡面板长按某类型时直接打开次数编辑弹窗。
- 次数编辑弹窗只接受整数输入；空值按 `0` 处理。
- 月视图与年视图按“某类型当天是否出现”展示状态，不展示同类型次数强度。

### 2.3 统计分析
- `总览统计`：总计、年均、分年统计。
- `年度统计`：指定年份总计、月均、逐月数据。
- `自定义区间统计`：按日期区间聚合统计。
- 自定义区间进入月统计时按真实年月倒序展示；跨年区间的月份标签显示为 `YYYY年M月`，避免不同年份的同名月份合并或错序。
- 统计口径按新格式中的次数累计，不再仅按每天每类型 `0/1` 计数。
- 折线图支持触摸查看点位数据；同一触摸点下多个项目数值相同时，数值标签按观看教程、武器强化、双人练习顺序逐个向右错开。
- 自定义统计图发生聚合时，触摸聚合点会隐藏其他横轴刻度和标签，仅显示该聚合点所在区间的起止日期；若两个日期标签重叠，标签会自适应分散，首个聚合区间仅移动终点标签，末个聚合区间仅移动起点标签。

### 2.4 数据管理
- `导出`：导出本地数据为 JSON 并分享。
- `导入`：从 JSON 恢复本地数据并做格式校验。

### 2.5 关于信息
- `关于`：展示应用图标和当前语义版本。
- `软件介绍`：展示应用定位、三种记录类型名称、主要功能和记录规则。
- `使用帮助`：展示日视图、月视图、年视图、统计页、设置页和关于页的基础操作方式。
- `隐私政策`：说明应用只记录用户主动输入的日期、记录类型和次数，记录保存在本地；导入、导出和分享由用户主动触发，应用不提供账号、云同步或主动上传记录数据的能力。
- `版本记录`：根据 Git 历史中的版本字段变化展示版本节点记录；正式发布后新开发但尚未发布的功能记录在 `Unreleased` 节点，发布时再改成对应正式版本号。`Unreleased` 显示时不加 `v`，其标题使用正常功能描述。版本记录只描述相对上一版本的最终变化，不记录同一版本开发过程中的中间调整。每个版本节点内按“修复、优化、新增”分组展示，初始版本不显示“新增”分类标题，并在每类内部按“视图、统计、设置”及对应子顺序排列。

## 3. 数据模型与规则
### 3.1 存储结构
- 存储：`AsyncStorage`
- 键名：`checkin_status`
- 结构：`{ "YYYY-MM-DD": { "tutorial": number, "weapon": number, "duo": number } }`
- 三个字段均为非负整数。
- 三个字段均为 `0` 的日期不落库。
- 旧格式 `{"YYYY-MM-DD": number}` 仅在读取迁移和导入边界兼容。

示例：
```json
{
  "2026-04-29": {
    "tutorial": 2,
    "weapon": 1,
    "duo": 0
  },
  "2026-04-30": {
    "tutorial": 0,
    "weapon": 1,
    "duo": 1
  },
  "2026-05-01": {
    "tutorial": 1,
    "weapon": 1,
    "duo": 1
  }
}
```

### 3.2 位掩码
- `1`：tutorial
- `2`：weapon
- `4`：duo
- 位掩码仅作为历史兼容和旧接口返回语义保留。

常见组合：
- `0`：无记录
- `3`：tutorial + weapon
- `5`：tutorial + duo
- `6`：weapon + duo
- `7`：三项全选

### 3.3 校验约束
- 日期键必须为 `YYYY-MM-DD`。
- 新格式值必须是对象，且字段只允许 `tutorial`、`weapon`、`duo`。
- 字段值必须是非负整数。
- 旧格式数值 `0..7` 仅在迁移和导入时兼容。
- 禁止未来日期修改。
- 导入 JSON 必须通过键值格式校验，并在导入时统一转换为新格式。

## 4. 技术栈
- React 19
- React Native 0.79
- Expo SDK 53
- React Navigation
- AsyncStorage
- react-native-svg + d3
- moment

## 5. 代码结构
```text
.
├─ App.js
├─ src
│  ├─ screens
│  │  ├─ DayView.js
│  │  ├─ MonthView.js
│  │  ├─ YearView.js
│  │  ├─ StatisticsScreen.js
│  │  ├─ SettingsScreen.js
│  │  ├─ AboutScreen.js
│  │  ├─ SoftwareIntroScreen.js
│  │  ├─ UsageHelpScreen.js
│  │  ├─ PrivacyPolicyScreen.js
│  │  ├─ VersionHistoryScreen.js
│  │  └─ DatePickerScreen.js
│  ├─ components
│  │  ├─ CheckInButtons.js
│  │  ├─ CountAdjustModal.js
│  │  ├─ CustomTabBar.js
│  │  └─ LineChartBase.js
│  ├─ hooks
│  │  ├─ useCheckinData.js
│  │  └─ useCheckinAggregation.js
│  └─ utils
│     ├─ checkInStorage.js
│     └─ statsUtils.js
└─ android
```

## 6. 运行方式
```bash
npm install
npm run start
npm run android
```

### 6.1 Windows 本地构建（临时短路径映射）
- 目的：避免 React Native native 模块在 Windows 下因工程路径过深导致的 CMake/Ninja 构建失败。
- 约束：每次构建前创建 `subst` 映射，每次构建后无论成功失败都取消映射，不让 `M:` 长驻。

推荐命令（仓库根目录执行）：
```powershell
npm run android:build:debug:tempmap
```

构建本地 Release APK（仓库根目录执行）：
```powershell
npm run android:build:release:tempmap
```

安装到已连接设备（仓库根目录执行）：
```powershell
npm run android:install:debug:tempmap
```

脚本位置：
- `scripts/android-build-tempmap.ps1`

准备发布或分发安装包时，先构建 Release APK，再将原始产物：
- `android/app/build/outputs/apk/release/app-release.apk`

复制归档到 `dist/`，并按以下格式重命名：
- `MinimalistWeaponEnhancementCalendar-v<语义版本>-android-<yyyyMMdd>.apk`

推荐归档命令（仓库根目录执行）：
```powershell
npm run android:archive:release
```

示例：
- `dist/MinimalistWeaponEnhancementCalendar-v1.3.0-android-20260505.apk`

Debug APK 仅用于开发调试，不能作为发布或分发归档来源。普通本机构建不要求执行复制归档和重命名步骤。

可选参数示例（直接运行脚本）：
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\android-build-tempmap.ps1 -DriveLetter M -GradleTask assembleDebug -NodeEnv development
```

## 7. 开发回归建议
- 改动打卡逻辑后至少验证：
- 底部打卡面板短按加一并关闭面板
- 日视图长按已有记录递减次数
- 日视图多次记录数字显示
- 月视图打卡面板长按直接编辑次数
- 次数编辑弹窗的空值、整数和 `0` 值处理
- 新格式数据自动迁移是否生效
- 旧格式导入是否被正确转换为新格式
- 导出是否始终输出新格式
- 日视图显示与撤销是否符合新格式读写
- 统计表与折线图数据一致性

## 8. 发布版本管理与统一工作流
### 8.1 版本定义位置
- 语义版本（`appVersion`）定义在：
- `package.json` -> `version`
- `app.json` -> `expo.version`
- 当前语义版本（截至 `2026-05-05`）：`1.3.0`。

### 8.2 统一策略
- `runtimeVersion` 统一使用 `policy: appVersion`（iOS/Android 一致）。
- 构建号统一由 EAS 远端管理：
- `eas.json` -> `cli.appVersionSource: remote`
- `eas.json` -> `build.production.autoIncrement: true`
- 发布前通过脚本同步远端版本状态到本地：
- `npm run release:sync-version`（执行 `eas build:version:sync`）。

### 8.3 版本更新时在哪里改
- 仅在发布新业务版本时修改语义版本：
- `package.json` 的 `version`
- `app.json` 的 `expo.version`
- 不手工维护 Android `versionCode`（由 EAS 递增与同步）。

### 8.4 推荐发布流程（Android）
1. 修改语义版本（示例：`1.3.0 -> 1.3.1`）。
2. 执行 `npm run release:sync-version`。
3. 执行 `eas build --platform android --profile production`。
4. 归档产物时带上语义版本与构建号（示例：`MinimalistWeaponEnhancementCalendar-v1.3.0+42-android.apk`）。

### 8.5 约束说明
- `expo run:android` 用于开发调试，不作为发布产物来源。
- 发布产物统一来自 EAS `production` profile（云构建或 `--local`）。

## 9. Git 提交防事故流程
适用场景：工作区存在多项改动，且本次只允许提交其中一部分。

### 9.0 提交类型约定
- `[feat]`：仅用于应用内用户可见功能新增或交互行为新增。
- `[dev]`：用于开发流程、构建/发布链路、工程脚本、环境与测试工作流改造等非用户可见能力变更。
- `[fix]`：用于缺陷修复（用户可见或开发链路问题均可）。
- `[doc]`：用于文档更新。

### 9.1 提交前检查
1. 执行 `git status --short`，确认全部改动清单。
2. 执行 `git diff -- <目标文件>`，确认目标改动边界。
3. 若目标文件混有无关改动，先备份该文件（例如 `Copy-Item <file> <file>.bak`）。

### 9.2 构造最小提交
1. 只暂存目标文件：`git add <目标文件列表>`。
2. 提交信息按仓库规范填写（英文 `summary` + 逐文件 `description`）。
3. 完成提交后，若之前为隔离提交临时清理过文件内容，需把无关改动恢复回工作区未提交状态。

### 9.3 提交后复核
1. 执行 `git show --name-only --stat -1`，确认提交文件范围正确。
2. 执行 `git status --short`，确认无关改动仍在工作区且未被误提交/误丢失。
3. 若发生误覆盖，先恢复文件，再同步修正提交（必要时 `git commit --amend` 仅改提交信息，或新增修复提交）。
