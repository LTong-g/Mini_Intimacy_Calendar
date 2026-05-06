> 提示：请使用 UTF-8 编码读取本文件。

# 开发日志
撰写规则：
- 本日志在默认情况下只能追加记录，不能删除/改写旧内容。除非得到用户的明确指示。
- 每天只记录一条时间戳，时间戳作为二级标题，以 `##` 开头。
- 每条时间戳下面，每次记录如果新开一段，则写一个标题作为三级标题，以 `###` 开头，与上一行用空行分隔。标题下面记录内容，以 `-` 分点。`延续上个话题` 仅适用于同一事件、同一性质的连续补充。
- 若新增内容在事件性质上发生变化（如：分析决策 vs 代码实现、功能改造 vs 环境排障），即使属于同一功能，也必须新开 `###` 标题分段记录，不得混写。

# 待开发功能：
- 允许设置黑名单应用，根据黑名单应用自动记录
- 图标有bug：1在模拟器上纵轴只能显示1位数，10会显示成0。

# 日志内容

## 2026-05-01 

### 初始化记录
- 创建了 `AGENTS.md`，并在其中引用 `developer_guide.md` 与 `develop_log.md`。
- 新增 `developer_guide.md`，面向开发者的详细技术说明。
- 创建了 `readme.md`，面向用户的介绍页内容，用于网页展示。
- 建立了项目基线事实记录：
- 项目为 Expo + React Native 应用（`minimalistweaponenhancementcalendar`）。
- 核心存储键为 `checkin_status`，位掩码值为 `1/2/4`。
- 主要功能包含：
- 日/月/年日历视图
- 打卡切换
- 统计表格与折线图
- 设置页 JSON 导入导出


### 发布版本控制/版本表示一致性分析
- 已核对发布相关版本字段来源：`app.json`、`eas.json`、`package.json`、`package-lock.json`、`android/app/build.gradle`、`dist/metadata.json`。
- 已确认语义版本 `1.1.1` 在 `app.json`、`package.json`、`package-lock.json` 与 Android `versionName` 中保持一致。
- 已确认 `runtimeVersion` 存在平台配置口径不一致：iOS 采用 `policy: appVersion`，Android 使用硬编码 `"1.1.1"`。
- 已确认构建版本来源存在混用：`eas.json` 启用 `appVersionSource: remote` 且生产环境 `autoIncrement: true`，同时 Android 原生层仍固定 `versionCode 1`。
- 已识别风险：在云构建与本地原生构建并行使用时，版本号（尤其 build 号）可能发生漂移。
- 已识别追溯缺口：现有 `dist/` 产物元数据未体现业务语义版本，不利于发布归档与回溯。

### 发布版本统一方案
- “单一事实源”方案：`package.json` 的 `version` 作为唯一语义版本来源，`app.json`/原生文件不再手工维护重复版本号。
- 配置统一方案：将平台 `runtimeVersion` 统一为 `policy: appVersion`，避免 iOS 策略化与 Android 硬编码并存。
- 构建号统一方案：继续使用 `eas.json` 中 `cli.appVersionSource: remote` 与 `build.production.autoIncrement: true` 作为开发者版本号（Android `versionCode`）唯一来源。
- 同步机制方案：发布前执行 `eas build:version:sync`，将 EAS 远端构建号回写本地，降低 `expo run:android` 与 EAS 构建号漂移风险。
- 发布口径方案：`production` 仅走 `eas build`（云或 `--local`），`expo run:android` 仅用于开发调试，不作为发布产物来源。
- 产物追溯方案：构建产物命名引入 `appVersion` 与构建号（示例：`MinimalistWeaponEnhancementCalendar-v1.1.1+42-android.apk`），并在仓库内保存同名元数据记录。

### 发布版本统一落地
- 已将 Android `runtimeVersion` 从硬编码字符串改为 `policy: appVersion`，与 iOS 保持一致，统一运行时版本策略来源。
- 已在 `package.json` 新增脚本 `release:sync-version`，命令为 `eas build:version:sync`，用于发布前同步 EAS 远端版本号到本地配置。
- 已完成配置有效性校验：`app.json` 与 `package.json` JSON 解析通过。
- 已在 `developer_guide.md` 新增“发布版本管理与统一工作流”章节，记录版本定义位置、当前版本值、更新入口、同步命令与 Android 发布流程。
- 已明确文档口径：`runtimeVersion` 采用 `policy: appVersion`，构建号由 EAS 远端管理，`expo run:android` 仅用于开发调试。

### 提交事故复盘规则文档化
- 已在 `AGENTS.md` 增加“仅提交部分文件/部分改动”防错规则，覆盖提交边界确认、显式暂存、混合改动备份恢复、提交后复核与异常修复要求。
- 已在 `developer_guide.md` 新增“Git 提交防事故流程”章节，固化提交前检查、最小提交构造、提交后复核的命令级步骤。

### Expo 多尺寸测试与构建落库方案分析
- 已读取并核对现有工程配置：`package.json`、`eas.json`、`app.json`。
- 已确认当前脚本以 `expo start --dev-client` 与 `expo run:android/ios` 为主，构建配置已包含 `development/preview/production` 三个 EAS profile。
- 已确认项目当前测试方式以 Expo Go/Dev Client 实机为主，存在设备覆盖面受限的问题。
- 可执行方案：通过 Android 模拟器（含多分辨率 AVD）、Web 响应式预览、必要时 iOS 模拟器补充多尺寸验证。
- 构建落库方案：使用本地构建 `eas build --local` 直接在仓库内（如 `dist/`）统一归档 apk/aab/ipa，降低手动下载与 release 管理成本。
- 风险记录：本地构建对本机环境一致性要求较高（Android SDK/Java/Xcode），且 iOS 本地构建仅支持 macOS。

### Android 本机构建链路环境诊断与排障记录
- 已确认基础环境可用：Android SDK 位于 `D:\ASoftware\Android\Sdk`，Java 位于 `D:\ASoftware\Java\jdk-21`，Gradle Wrapper 可用（Gradle `8.13`），`adb`/`emulator` 可用。
- 第 1 次在原始路径 `D:\B0Projects\my_tools\MinimalistWeaponEnhancementCalendar\android` 执行 `.\gradlew.bat assembleDebug` 失败，失败任务为 `:react-native-reanimated:buildCMakeDebug[armeabi-v7a][reanimated,worklets]`，报错 `ninja: error: mkdir(...) No such file or directory`。
- 已确认该失败不属于 SDK/Java/Gradle 缺失，而是进入 native 编译后触发路径过深相关问题。
- 已确认系统长路径开关 `LongPathsEnabled=1`。
- 第 2 次在原始路径清理缓存后重试仍失败；日志出现 object file 目录长度警告（对象目录 `188` 字符，提示对象文件完整路径上限 `250` 字符）并再次失败于 `react-native-reanimated` 的 Ninja `mkdir`。
- 已确认“仅清缓存”不能消除根因，根因仍为原始工程路径过深导致的 native 编译路径风险。
- 第 3 次使用 `subst` 将工程目录映射为短路径 `M:\` 后，从 `M:\android` 构建成功（`BUILD SUCCESSFUL`）。
- 在切换构建根路径过程中出现 Kotlin 增量缓存 `different roots` 报错（`D:\...` 与 `M:\android` 混用），随后 Kotlin 编译降级到无 daemon 回退路径并完成构建。
- 已确认当前可行稳定方案为固定使用短路径 `M:\` 进行本机构建，不与原始长路径混用。

### 临时映射构建流程固化
- 已记录新的持久偏好：不希望 `M:` 长驻系统盘符界面，改为“构建前映射、构建后无论成功失败都取消映射、每次构建重新映射”。
- 已在 `AGENTS.md` 更新对应协作规则，替代“固定长期使用 `M:\`”的表述。
- 已新增脚本 `scripts/android-build-tempmap.ps1`，采用 `try/finally` 实现构建后强制 `subst /D` 取消映射。
- 已在 `package.json` 增加快捷命令：
- `android:build:debug:tempmap` -> 临时映射后执行 `assembleDebug`
- `android:install:debug:tempmap` -> 临时映射后执行 `installDebug`
- 已在 `developer_guide.md` 增加“Windows 本地构建（临时短路径映射）”操作步骤与示例命令。
- 已完成脚本轻量实测：通过 `-GradleTask "-v"` 在 `M:\android` 成功执行 Gradle，脚本结束后 `M:` 映射已自动取消。

### 本机完整环境复验
- 已复验核心命令均可解析：`node`、`npm`、`npx`、`java`、`javac`、`adb`、`emulator`、`sdkmanager`、`avdmanager`、`eas`。
- 已复验环境变量：`JAVA_HOME=D:\ASoftware\Java\jdk-21`，`ANDROID_HOME`/`ANDROID_SDK_ROOT=D:\ASoftware\Android\Sdk`。
- 已复验 SDK 目录完整性：`platform-tools`、`cmdline-tools`、`emulator`、`platforms`、`build-tools`、`system-images`、`ndk`、`cmake` 均存在。
- 已复验关键版本：JDK `21.0.4`、ADB `35.0.2`、Emulator `35.4.9.0`、SDK Manager `20.0`、EAS CLI `16.17.3`。
- 已复验 AVD：存在 `Pixel_6_API_35`（`android-35/google_apis/x86_64`）。
- 已执行 `npm run android:build:debug:tempmap`，`BUILD SUCCESSFUL`，本地 native 链路可用（包含 `react-native-reanimated` CMake/Ninja 任务）。
- 已复验构建后 `subst` 无残留映射（`M:` 未长驻）。
- 已复验 APK 产物存在：`android/app/build/outputs/apk/debug/app-debug.apk`（`190596265` bytes）。
- 已复验当前 `adb devices -l` 无在线设备，说明真机调试能力可用但当前会话下未连接设备。

### 模拟器本机测试执行记录
- 已启动本地 AVD `Pixel_6_API_35` 并等待系统引导完成。
- 已读取模拟器参数：`Physical size: 1080x2400`，`Physical density: 420`。
- 已执行 `npm run android:install:debug:tempmap`，`installDebug` 成功安装到 `Pixel_6_API_35(AVD) - 15`。
- 已通过 `adb shell monkey` 拉起应用包 `com.ltongg.MinimalistWeaponEnhancementCalendar`。
- 已确认进程存在（`pidof` 返回 `3935`）且前台窗口为 `MainActivity`，模拟器内应用可正常启动运行。

### AGENTS 构建流程澄清
- 已在 `AGENTS.md` 新增“Windows Android 构建执行流程（强约束）”段落。
- 已将“映射-构建-取消映射”拆分为明确步骤：构建前映射、映射路径内构建、`finally` 清理映射、构建后校验 `subst`、下次构建重新映射。
- 已在同段明确两条标准入口命令：`android:build:debug:tempmap` 与 `android:install:debug:tempmap`。
- 已明确禁止在原始长路径直接执行 `gradlew`，避免再次触发路径深度与缓存根路径混用问题。

## 2026-05-02

### 提交边界事故规则加固
- 已发生第二次“仅提交部分改动”场景中的提交边界事故反馈。
- 已恢复此前被误从工作区排除的 `develop_log.md` 段落“每日多次记录功能改造范围分析”，并保持为未提交状态。
- 已在 `AGENTS.md` 将该场景规则加固为命令级约束：优先 `git add -p` 选择性暂存，禁止通过修改/删除工作区内容来排除提交。
- 已补充异常处置要求：若误改工作区内容，必须在同一会话立即恢复并追加日志事实记录。

### 换行规范与忽略规则修复
- 已在 `AGENTS.md` 新增协作约束：仓库文本文件统一使用 Windows 换行符（CRLF）。
- 已修复 `.gitignore`：去除重复块并保留有效忽略项，同时保留 Gradle 本地缓存与构建产物忽略规则。
- 已将本次涉及文档文件统一转换为 CRLF。

### Android 模拟器黑屏排障
- 已确认当前黑屏时 `adb devices -l` 曾显示 `emulator-5554 offline`，说明模拟器系统未正常完成启动。
- 已检查 `Pixel_6_API_35` 的启动记录，当前 `npm run start` 按 `a` 会以普通 `@Pixel_6_API_35` 方式启动，不会自动附带冷启动或 GPU 回退参数。
- 已备份 `D:\ASoftware\Android\.android\avd\Pixel_6_API_35.avd\config.ini` 到 `config.ini.bak_20260502_black_screen`，并备份 `quickbootChoice.ini` 到 `quickbootChoice.ini.bak_20260502_black_screen`。
- 已删除 `Pixel_6_API_35.avd\snapshots\default_boot` 快照目录，用于排除 quickboot 快照损坏导致的黑屏或离线。
- 已将 `quickbootChoice.ini` 改为 `saveOnExit = false`，避免退出时继续保存异常快照。
- 已将 AVD 配置调整为冷启动优先：`fastboot.forceColdBoot=yes`、`fastboot.forceFastBoot=no`，并关闭 firstboot 本地/下载快照读取与保存。
- 已将 AVD GPU 配置固定为 `hw.gpu.enabled=yes` 与 `hw.gpu.mode=swiftshader_indirect`，用于规避硬件 GPU/窗口渲染相关黑屏风险。
- 验证限制：Codex 沙箱内直接启动 emulator 访问 `D:\ASoftware\Android\.android` 时会出现权限噪声，最终启动验证应以用户本机 PowerShell 执行为准。

### 旧 AVD 清理与新 AVD 重建
- 已按用户要求删除旧 AVD Pixel_6_API_35。
- 已基于 system-images;android-35;google_apis;x86_64 新建 AVD AVD_2560x1600 与 AVD_2640x1200。
- 已将 AVD_2560x1600 配置为 hw.lcd.width=2560、hw.lcd.height=1600，并设置 hw.initialOrientation=landscape、showDeviceFrame=no。
- 已将 AVD_2640x1200 配置为 hw.lcd.width=2640、hw.lcd.height=1200，并设置 hw.initialOrientation=landscape、showDeviceFrame=no。
- 已通过 avdmanager list avd 复核，新 AVD 列表仅包含 AVD_2560x1600 与 AVD_2640x1200。

### AVD 尺寸语义约定落地
- 已在 `AGENTS.md` 追加用户尺寸语义约定：`AVD_2640x1200` 为手机尺寸默认机型，`AVD_2560x1600` 为平板尺寸机型。

### 默认启动脚本调整
- 已将 `package.json` 的默认 `android` 脚本固定为 `expo run:android --device AVD_2640x1200`（默认手机尺寸）。
- 已新增脚本 `android:phone`（`AVD_2640x1200`）与 `android:tablet`（`AVD_2560x1600`），用于显式指定启动目标。

### 手机 AVD 竖屏修正
- 已按用户要求直接修改 `AVD_2640x1200` 配置为竖屏手机尺寸：`hw.lcd.width=1200`、`hw.lcd.height=2640`、`hw.initialOrientation=portrait`。
- 已在修改前备份 `AVD_2640x1200.avd\config.ini` 为 `config.ini.bak_20260502_202047_portrait_fix`。

### 双模拟器安装验证
- 已在两个在线 Android 模拟器 `emulator-5554` 与 `emulator-5556` 执行 `npm run android:install:debug:tempmap`，安装 `com.ltongg.MinimalistWeaponEnhancementCalendar` 成功。
- 已通过 `adb -s <serial> shell pm list packages` 分别验证两个模拟器均存在目标应用包名。

### 开发日志混合记录复盘
- 已复盘本次“分析与实施混写”问题：同一会话连续追加日志时，先写了范围分析，随后将实施结果直接续写到同一标题下，未在追加前执行“单一主题/单一性质”的边界自检。
- 已将该问题归类为日志结构化失误而非实现失误，并已在 `AGENTS.md` 新增强约束规则，要求按事件性质拆分标题并在追加前完成边界自检。
- 已新增 scripts/append-develop-log.ps1，用于按“当日时间戳 + 新的三级标题 + 事实列表”结构追加开发日志。
- 已在 AGENTS.md 新增硬约束：日志追加必须通过 append-develop-log 脚本执行，禁止使用“延续上个话题”标题。
- 已确认本次机制加固用于避免不同事件被续写到同一三级标题下的混写问题。

### 每日多次记录功能改造范围分析与方案澄清
- 已完成对现有“每日一次（位掩码0/1）”模型的代码定位，确认核心约束位于 `src/utils/checkInStorage.js` 的 `getCheckInStatus`/`setCheckInStatus`/`toggleCheckInType`/`getCheckInIcons`。
- 打卡交互入口在 `src/components/CustomTabBar.js` 中通过 `toggleCheckInType` 执行异或开关，当前行为为同类型当日只能开/关，无法累计次数。
- 日视图 `src/screens/DayView.js` 当前以单个整型状态渲染图标与撤销逻辑（按位清除），不支持同类型多次记录的数量展示与按条回退。
- 月/年视图 `src/screens/MonthView.js`、`src/screens/YearView.js` 使用位判断仅区分“当日是否出现该类型”，若改为次数模型需调整读取后的“出现判定”和可选的“强度展示”策略。
- 统计链路 `src/utils/statsUtils.js` 与 `src/hooks/useCheckinAggregation.js` 当前将每天每类型计为0/1；改造后需改为按次数累计，否则统计会低估。
- 导入导出 `src/screens/SettingsScreen.js` 的 JSON 校验当前仅允许值为 `number`，若引入对象/数组结构需同步放宽并做兼容迁移校验。
- 数据迁移风险：历史 `{date: number}` 旧格式与新格式并存时，读取层需统一归一化，避免视图与统计出现 NaN 或漏计。
- 最小可行兼容策略：读取时兼容旧位掩码并映射为新结构；写入统一新结构；导出默认新结构。
- 已根据“软件内统一改成新的数据格式，导入兼容旧格式并自动转新格式”的要求，进一步明确数据层方案。
- 新格式建议为 `{ "YYYY-MM-DD": { "tutorial": number, "weapon": number, "duo": number } }`，三项均为非负整数，三项均为 `0` 的日期不落库。
- 旧格式 `{ "YYYY-MM-DD": number }` 的兼容转换规则为：位 `1/2/4` 分别转换为对应字段 `1`，未出现字段转换为 `0`。
- `src/utils/checkInStorage.js` 应作为统一数据边界，新增全量读取、归一化、校验、导入转换、导出读取、单日增减/设置等函数，减少页面直接读写 `AsyncStorage`。
- `src/hooks/useCheckinData.js` 与 `src/hooks/useCheckinAggregation.js` 当前直接读取原始 JSON，后续应改为使用统一读取函数获取新格式数据。
- `src/screens/SettingsScreen.js` 的导入应接受旧格式与新格式，导入落库前统一转换为新格式；导出应通过统一读取函数输出新格式 JSON。
- `src/screens/DayView.js` 当前直接读取和写入 `checkin_status` 用于坚持天数与取消记录，后续应改为调用统一存储工具，避免旧格式判断残留。
- 已重新明确完整兼容口径：软件内部统一使用新格式；旧格式兼容只存在于存量迁移与导入边界；导出只输出新格式。
- 本机存量数据迁移场景：用户更新应用前 `AsyncStorage` 中已有旧格式数据时，首次通过统一读取函数读取 `checkin_status` 应自动归一化为新格式，并写回同一个存储键。
- 导入旧备份兼容场景：用户未来手动导入旧格式 JSON 时，导入流程应接受旧格式，校验后转换为新格式再落库。
- 旧格式迁移损失边界：旧位掩码只能表示某类型当天是否发生，无法还原同类型多次次数；转换后每个出现过的类型次数只能记为 `1`。
- 软件内部读取链路应避免在页面、hook、统计工具中各自实现兼容逻辑，统一由 `src/utils/checkInStorage.js` 提供格式识别、校验、归一化、自动迁移写回能力。
- 建议统一 API 边界为：`getAllCheckInData` 负责读取并迁移存量数据，`normalizeCheckInData` 负责旧/新格式归一化，`importCheckInData` 负责导入兼容并落库，`exportCheckInData` 负责导出新格式，单日增减/设置函数负责业务写入。
- `src/hooks/useCheckinData.js`、`src/hooks/useCheckinAggregation.js`、`src/utils/statsUtils.js`、`src/screens/DayView.js`、`src/screens/MonthView.js`、`src/screens/YearView.js`、`src/components/CustomTabBar.js` 后续均应消费新格式或统一 API，不再直接依赖位掩码。

### 每日多次记录功能改造第一阶段实施
- 已完成数据底层第一阶段实现，未调整打卡按钮、日/月/年视图的视觉布局与交互入口。
- `src/utils/checkInStorage.js` 已改为统一数据边界：新增新格式记录对象、旧位掩码转换、全量读取自动迁移、导入转换、导出读取、单日记录读写、类型次数增减等 API。
- `getCheckInStatus`、`setCheckInStatus`、`toggleCheckInType`、`getCheckInIcons` 保留旧接口语义，供现有表层继续以位掩码方式运行；底层落库已转为新格式。
- `getAllCheckInData` 会在读取到旧格式或可清理数据时写回新格式到同一 `checkin_status` 键，用于覆盖应用更新前本机已有旧数据的迁移场景。
- `importCheckInData` 会接受旧格式与新格式，严格校验后统一以新格式写入本地；`exportCheckInData` 会先走统一读取并导出新格式。
- `src/hooks/useCheckinData.js` 与 `src/hooks/useCheckinAggregation.js` 已改为通过统一存储工具读取数据，不再直接读取 `AsyncStorage` 原始 JSON。
- `src/utils/statsUtils.js` 已改为通过新格式记录对象统计次数，同时保留对旧位掩码输入的兼容解析。
- `src/screens/SettingsScreen.js` 的导入/导出数据处理已改为调用统一导入导出 API，页面文案和布局未调整。
- `src/screens/DayView.js` 中用于“坚持天数”和“长按取消记录”的直接 `AsyncStorage` 读写已改为统一存储 API，页面视觉与主交互未调整。
- 已执行语法检查：`node --check` 覆盖 `checkInStorage.js`、`useCheckinData.js`、`useCheckinAggregation.js`、`statsUtils.js`、`SettingsScreen.js`、`DayView.js`，均通过。
- 已执行 `git diff --check`，未发现空白错误。
- 已记录新的功能范围约束：月视图和年视图暂不纳入“每日多次记录功能”的表层改动范围。
- 基于该约束，后续多次记录表层改造范围缩小为打卡入口递增逻辑、打卡按钮关闭/连续点击体验、日视图次数展示、日视图撤销语义，以及开发文档/回归验证。

### Android 导出保存到共享存储修复
- 已在 src/screens/SettingsScreen.js 新增 Android 导出分支：优先通过 FileSystem.StorageAccessFramework 申请目录权限并创建 JSON 文件写入用户选择目录。
- 导出文件名已改为带 ISO 时间戳的唯一命名，避免重复导出时文件名冲突。
- 已保留分享兜底路径：当非 Android 或目录授权未授予时，写入临时文件并触发 Sharing.shareAsync。
- 已执行 node --check src/screens/SettingsScreen.js，语法检查通过。

### 导出取消后仍弹分享窗口修复
- 已确认导出逻辑问题：Android 目录授权被取消时，代码继续执行分享兜底，导致返回界面后仍弹出分享窗口。
- 已调整 src/screens/SettingsScreen.js：saveExportToAndroidSharedStorage 返回结构化结果 saved/reason，并区分 canceled 与 unavailable 场景。
- 已在导出主流程新增 canceled 早返回分支：用户取消目录授权或选择后，直接结束本次导出，不再触发 Sharing.shareAsync。
- 已保留 unavailable 场景的分享兜底，仅在共享存储能力不可用时继续走分享。
- 已执行 node --check src/screens/SettingsScreen.js，语法检查通过。

### 设置页三按钮布局与独立分享入口
- SettingsScreen 中新增独立 handleShare 流程，分享不再由导出按钮兜底触发。
- 设置页按钮从导入/导出两按钮改为导入-导出-分享三按钮横排等宽布局，导出位于中间、分享位于右侧。
- 分享按钮图标已使用 Ionicons 的 share-social-outline，点击后执行系统分享流程。

### 开发者文档与当前实现对齐
- 已更新 `developer_guide.md`，将数据模型从旧位掩码结构改为当前软件内使用的新格式对象结构。
- 已在文档中明确旧格式仅保留读取迁移和导入兼容，导出始终输出新格式。
- 已在文档中注明月视图和年视图暂不纳入“多次记录功能”的表层改动范围。
- 已补充文档回归建议，覆盖新格式自动迁移、旧格式导入转换、新格式导出与日视图读写一致性。

## 2026-05-03

### Bare workflow runtimeVersion 配置修复
- 已将 app.json 中 ios.runtimeVersion 与 android.runtimeVersion 从 policy=appVersion 改为固定字符串 1.1.1。
- 本次改动用于兼容 bare workflow 下 EAS Update 需要手动设置 runtimeVersion 的约束。

### runtimeVersion 自动联动
- 已新增 app.config.js，并从 package.json 读取 version。
- 已在动态配置中将 expo.version 设置为读取到的 version。
- 已在动态配置中将 ios.runtimeVersion 设置为读取到的 version。
- 已在动态配置中将 android.runtimeVersion 设置为读取到的 version。
- 已从 app.json 移除 ios.runtimeVersion 与 android.runtimeVersion 静态字段。
- 已执行 npx expo config --json，结果显示 version、ios.runtimeVersion、android.runtimeVersion 均为 1.1.1。
- 已在 AGENTS.md 记录 bare workflow 下版本号与 runtimeVersion 自动统一偏好。

### 每日多次记录交互需求分析
- 已确认多次记录功能的表层改动范围仅限打卡入口、打卡面板和日视图，月视图与年视图不纳入本次改动。
- 已确认打卡入口语义为单次点击加一，长按时按秒继续加一，并在每次增加时保持与原长按消除相同的震动强度。
- 已确认长按加一在持续三秒后中断并弹出居中弹窗，弹窗包含可编辑输入框，输入框初始值为长按累计后的当前次数。
- 已确认弹窗底部包含确认与取消两个按钮；取消关闭弹窗且不更新数值，确认写回输入框数值后关闭弹窗。
- 已确认打卡面板的点击后立即关闭交互保持不变。
- 已确认日视图中单次记录的图标显示保持不变，次数达到两次及以上后保留原底色，内部图案改为显示次数数字，数字颜色与原图案颜色一致。
- 已确认长按减一的语义成立，且长按时按秒减少一，并沿用与原长按消除相同的震动强度。
- 已确认长按减一同样在持续三秒后中断并弹出居中弹窗，弹窗结构、初始值、确认/取消行为与长按加一弹窗一致。
- 用户认为日视图文案暂不需要修改。

### 每日多次记录需求可行性、影响面与边界澄清
- 已确认用户提出的单次点击加一、长按按秒加一、三秒后弹窗确认数值、长按减一及其弹窗流程，在现有数据底层基础上具备实现条件。
- 已确认打卡面板保持点击后立即关闭的交互不需要调整。
- 已确认日视图以外的月视图和年视图暂不纳入本轮多次记录表层改动。
- 已确认两次及以上的日视图记录以图标内数字替换原图案显示。
- 已确认长按弹窗输入框允许空值，空值按0处理，且仅接受整数。
- 已确认长按增减弹窗取消后不保留已累计的秒数结果。
- 已确认三秒阈值可作为弹窗触发计时，底层实现也可采用一秒步进与次数阈值的方式，只要外部行为一致。
- 已确认统计界面会受到数据口径变化影响：统计页不必改布局，但其总计、年均、区间统计与折线图都会直接读取新格式次数数据。
- 已确认统计界面当前已接入统一数据读取与统计链路，因此代码层面已适配新格式数据结构；统计界面无需优先改布局，但统计结果语义会随次数数据变化。
- 已识别除表层交互外仍需关注的外围点包括：数据底层的增减写入、日视图的次数显示、长按时长与三秒弹窗、以及统计页对新次数口径的展示语义。
- 用户认为日视图文案暂不需要修改，该偏好已作为当前功能边界记录。

### 每日多次记录日视图交互实现
- 底部打卡面板短按记录已接入次数加一并关闭面板的写入流程。
- 底部打卡面板长按记录已接入每秒加一、三次后弹出次数编辑弹窗、取消回滚到长按前数据的流程。
- 日视图已有记录图标已接入每秒减一、三次后弹出次数编辑弹窗、取消回滚到长按前数据的流程。
- 日视图记录图标在次数大于一时使用同色数字替换原图案显示次数。
- 主页面已增加记录变更刷新键，使底部打卡面板写入后日视图可重新读取存储数据。
- 长按弹窗触发已采用一秒步进与次数阈值实现，连续累计三次后弹出次数编辑弹窗。
- App.js、CheckInButtons.js、CustomTabBar.js、CountAdjustModal.js、DayView.js 已通过 node --check 语法检查。
- git diff --check 已通过空白检查。

### 日视图长按减到零立即结束
- 日视图长按减法在次数减到 0 时立即停止计时，不再继续累积到三秒弹窗。
- 次数减到 0 后仍通过统一存储写入路径清理当天无效记录。

### 长按弹窗取消保留累计结果
- 底部打卡面板长按弹窗取消时已改为保留长按累计增加后的次数。
- 日视图记录图标长按弹窗取消时已改为保留长按累计减少后的次数。
- AGENTS.md 中长按弹窗取消规则已更新为关闭弹窗并保留已经累计的加减结果。

### 长按触发立即执行首步
- 底部打卡面板长按触发后立即执行第一次次数增加和振动。
- 日视图已有记录图标长按触发后立即执行第一次次数减少和振动。
- 长按触发后的第二次和第三次加减仍按一秒间隔执行，第三次后弹出次数编辑弹窗。

### 日视图长按删除后重算间隔天数
- 日视图长按减少记录至当天总次数为 0 时，已在存储写入完成后重新读取日视图状态。
- 日视图长按删除最后一条记录后，已经坚持天数会立即重算，不再依赖切换日期触发刷新。

### 月视图打卡按钮长按直接编辑次数
- CheckInButtons 已增加直接长按编辑回调入口。
- CustomTabBar 在月视图打开打卡选项时，长按某类型按钮会直接打开该类型次数编辑弹窗。
- 日视图打开打卡选项时，长按某类型按钮仍保持连续加一并在第三次后弹窗的行为。

### 月视图长按直接编辑补充振动
- 月视图打卡选项中长按某类型按钮直接打开编辑弹窗前已补充一次振动反馈。

### 月视图底部中间按钮长短按互换
- 月视图底部中间按钮短按已改为打开打卡菜单。
- 月视图底部中间按钮长按已改为振动后切换到今天的日视图。

### 每日多次打卡协作规则清理
- 用户已说明每日多次打卡开发完成。
- AGENTS.md 已移除每日多次打卡功能的阶段性协作约束。

### 每日多次打卡开发者文档补充
- developer_guide.md 已移除每日多次打卡的阶段性表述。
- developer_guide.md 已补充每日多次打卡的当前交互、统计口径、相关组件和回归验证点。

### 设置页关于入口需求分析
- 已核对现有设置页结构：src/screens/SettingsScreen.js 当前包含返回栏以及导入、导出、分享三项功能按钮。
- 已核对现有导航结构：App.js 当前注册 Calendar、Settings、Statistics、DatePicker 四个页面。
- 已核对版本来源：package.json 的 version 当前为 1.1.1，app.config.js 会读取该值并同步到 Expo version 与运行时版本。
- 已核对图标资源：assets/icon.png 可作为关于页顶部应用图标。
- 方案确定为在设置页新增整宽入口按钮“关于”，点击后进入新增 AboutScreen 页面。
- 方案确定为 AboutScreen 顶部展示应用图标，图标下展示版本文本“版本：v{package.json version}”。
- 方案确定为 AboutScreen 下方展示两个整宽按钮“软件介绍”和“版本记录”，按钮先完成入口与页面结构，具体内容可使用占位页面或后续补充内容源。

### 设置页关于功能阶段拆分
- 用户已明确设置页关于功能分两阶段实现。
- 第一阶段范围已限定为实现设置页关于按钮和关于页面。
- 第二阶段范围已限定为实现关于页内软件介绍、版本记录两个按钮的点击事件和对应页面。
- AGENTS.md 已记录设置页关于功能的两阶段实现约束。

### 设置页关于功能第一阶段实现
- SettingsScreen.js 已新增整宽关于按钮，点击后导航到 About 页面。
- App.js 已注册 About 导航页面。
- src/screens/AboutScreen.js 已新增关于页面，页面展示应用图标、版本号以及软件介绍和版本记录两个整宽按钮。
- 关于页版本号已读取 package.json 的 version 字段。
- 软件介绍和版本记录按钮在第一阶段仅作为可见入口展示，未接入点击跳转。
- 已执行 node --check App.js、src/screens/SettingsScreen.js、src/screens/AboutScreen.js，语法检查通过。
- 已执行 git diff --check，空白检查通过。

### 关于页子页面第二阶段实现
- AboutScreen.js 中软件介绍按钮已接入 SoftwareIntro 页面导航。
- AboutScreen.js 中版本记录按钮已接入 VersionHistory 页面导航。
- App.js 已注册 SoftwareIntro 和 VersionHistory 两个导航页面。
- src/screens/SoftwareIntroScreen.js 已新增软件介绍页面，内容包含应用定位、主要功能和记录规则。
- src/screens/VersionHistoryScreen.js 已新增版本记录页面，内容展示当前 package.json 版本号和当前版本能力说明。

### 关于页子页面文档同步
- developer_guide.md 已新增关于信息章节，记录关于、软件介绍、版本记录三个页面能力。
- developer_guide.md 的代码结构清单已补充 AboutScreen.js、SoftwareIntroScreen.js、VersionHistoryScreen.js。
- 已执行 node --check App.js、src/screens/AboutScreen.js、src/screens/SoftwareIntroScreen.js、src/screens/VersionHistoryScreen.js，语法检查通过。
- 已执行 git diff --check，空白检查通过。

### 版本记录页时间轴样式
- VersionHistoryScreen.js 已为版本记录列表增加左侧纵向时间轴样式。
- 版本记录时间轴已使用圆点表示版本节点，使用竖线连接相邻版本节点。
- 当前版本节点使用更大的圆点和浅蓝描边突出显示。
- 已执行 node --check src/screens/VersionHistoryScreen.js，语法检查通过。
- 已执行 git diff --check，空白检查通过。

### 版本更新至 1.2.0
- package.json 的 version 已更新为 1.2.0。
- package-lock.json 的项目根版本已更新为 1.2.0。
- app.json 的 expo.version 已更新为 1.2.0。
- android/app/build.gradle 的 versionName 已更新为 1.2.0。
- android/app/src/main/res/values/strings.xml 的 expo_runtime_version 已更新为 1.2.0。
- developer_guide.md 已同步当前语义版本和发布示例为 1.2.0 口径。
- 已执行 package.json、package-lock.json、app.json JSON 解析检查，通过。
- 已执行 node --check app.config.js，语法检查通过。
- 已执行 git diff --check，空白检查通过。

### Android 安装包构建与发布归档规则
- 已执行 npm run android:build:debug:tempmap 构建 Android 安装包。
- 首次构建因临时 subst 映射权限被拒失败。
- 已在提升权限后重新执行 npm run android:build:debug:tempmap，构建成功。
- 构建后 subst 输出为空，临时 M: 映射已清理。
- 准备发布或分发时，已将 android/app/build/outputs/apk/debug/app-debug.apk 复制归档为 dist/MinimalistWeaponEnhancementCalendar-v1.2.0-android-20260503.apk。
- AGENTS.md 已记录 Android 安装包只有准备发布或分发时才需要复制归档并重命名，普通构建不要求每次复制重命名。
- AGENTS.md 已记录 Android 安装包发布/分发归档命名格式 MinimalistWeaponEnhancementCalendar-v<语义版本>-android-<yyyyMMdd>.apk，归档位置为 dist/。
- developer_guide.md 已将安装包复制归档说明限定为准备发布或分发安装包时执行，并记录普通本机构建不要求执行复制归档和重命名步骤。
- developer_guide.md 已记录安装包归档命名格式 MinimalistWeaponEnhancementCalendar-v<语义版本>-android-<yyyyMMdd>.apk 和示例 dist/MinimalistWeaponEnhancementCalendar-v1.2.0-android-20260503.apk。
- 已执行 git diff --check，空白检查通过。

### 1.2.0 Android 归档产物更正
- 已确认 dist/MinimalistWeaponEnhancementCalendar-v1.2.0-android-20260503.apk 原为从 android/app/build/outputs/apk/debug/app-debug.apk 复制得到的归档产物。
- 已确认 debug APK 大小为 190596253 bytes，约 181.77 MB。
- 已确认 android/app/build/outputs/apk/release/app-release.apk 大小为 84490386 bytes，约 80.58 MB。
- 已使用 release APK 覆盖归档 dist/MinimalistWeaponEnhancementCalendar-v1.2.0-android-20260503.apk。

### Android Release 归档流程防呆
- package.json 已新增 android:build:release:tempmap 脚本，执行 scripts/android-build-tempmap.ps1 的 assembleRelease 任务并使用 production 环境。
- package.json 已新增 android:archive:release 脚本，执行 scripts/archive-android-release.ps1。
- scripts/archive-android-release.ps1 已实现从 release APK 复制归档到 dist 并按 package.json 版本生成归档文件名。
- scripts/archive-android-release.ps1 已在传入 debug/app-debug.apk 时拒绝归档。
- developer_guide.md 已将发布或分发归档来源修正为 android/app/build/outputs/apk/release/app-release.apk。
- AGENTS.md 已记录发布或分发归档来源必须是 Release APK，禁止将 debug/app-debug.apk 作为发布或分发归档来源。
## 2026-05-04

### 版本记录新增 Unreleased 规则与节点
- AGENTS.md 已新增规则：正式发布版本之后开发的未发布功能必须先记录到版本记录页的 Unreleased 节点。
- VersionHistoryScreen.js 已新增 Unreleased 版本节点，并记录本次日历导航行为修正。
- developer_guide.md 已同步版本记录页口径，说明正式发布前的新功能记录为 Unreleased，发布时再改为正式版本号。

### 版本记录 Unreleased 显示规则更正
- AGENTS.md 已补充规则：版本记录页里 Unreleased 前面不加 v，且标题使用正常功能描述。
- VersionHistoryScreen.js 已改为仅对正式版本添加 v 前缀，Unreleased 直接显示为 Unreleased。
- VersionHistoryScreen.js 的 Unreleased 节点标题已使用正常功能描述。
- developer_guide.md 已同步 Unreleased 的展示口径。

### 月视图日期跳转日视图需求梳理
- 已核对 MonthView：当前点击当前月份日期只调用 onDateChange，不会切换到日视图。
- 已核对 MonthView：当前右下角回到今日按钮只把 selectedDate 和 currentMonth 改为今天，仍停留在月视图。
- 已核对 CustomTabBar：当前日视图底部中间 today 图标短按打开打卡面板，不执行回到今日。
- 已识别澄清点：日视图“回到今日”指向现有底部中间 today 图标还是新增/复用右下角浮动按钮。
- 已识别澄清点：月视图可见的非当前月份日期是否也按对应日期跳转到日视图。

### 月视图日期跳转与日视图回到今日需求补充
- 用户已明确日视图新增右下角“回到今日”浮动按钮。
- 用户已明确月视图点击当前月前的灰色日期时跳转到前一月并选中对应日期。
- 用户已明确月视图跳转日视图仅通过点击当月日期触发。
- 用户已明确月视图点击当前月后的灰色日期无事发生，不能选中。
- 已形成实现方案：MonthView 区分当前月日期、当前月前补位日期、当前月后补位日期，并分别处理为跳转日视图、切到前一月选中、不操作。

### 当前月未来日期点击规则澄清
- 用户已澄清：月视图当前月里的未来日期允许选中。
- 用户已澄清：月视图当前月里的未来日期不能跳转到日视图。
- 已更新需求理解：当前月日期点击时先选中日期，只有非未来日期才切换到日视图。

### 月视图日期跳转与日视图回到今日实现
- MonthView 已改为点击当月过去日期或今天时选中并进入对应日视图。
- MonthView 已保留当月未来日期只选中不跳转的行为。
- MonthView 已新增点击当前月前灰色日期切换到前一月并选中对应日期的行为。
- MonthView 已保持点击当前月后灰色日期无操作的行为。
- DayView 已新增右下角回到今日浮动按钮，非今天时显示并回到今天的日视图。
- VersionHistoryScreen 的 Unreleased 节点已记录本次日历交互优化。
- developer_guide.md 和 AGENTS.md 已同步本次月视图日期点击规则。

### 月视图回到今日按钮显示修复
- MonthView 已修复右下角回到今日按钮显示条件。
- MonthView 的回到今日按钮显示现在同时判断 selectedDate 是否为今天和 currentMonth 是否为当月。
- 本次修复解决切换到非当月但 selectedDate 仍为今天时按钮不显示的问题。

### 月视图日期点击改为二次确认跳转
- MonthView 已改为点击当月日期时先选中日期。
- MonthView 已改为再次点击已选中的过去日期或今天时才进入对应日视图。
- MonthView 已保持点击已选中的未来日期不进入日视图。
- VersionHistoryScreen 的 Unreleased 节点已记录本次月视图点击行为调整。
- developer_guide.md 和 AGENTS.md 已同步月视图日期点击规则。

### 月视图灰色日期切月规则修正
- MonthView 已改为点击灰色日期时按真实今天判断是否为未来日期。
- MonthView 已改为点击非未来灰色日期时切换到该日期所在月份并选中该日期。
- MonthView 已保持点击未来灰色日期无操作。
- VersionHistoryScreen 的 Unreleased 节点已记录本次灰色日期切月规则修正。
- developer_guide.md 和 AGENTS.md 已同步本次灰色日期点击规则。

### 关于页新增使用帮助入口与页面
- AboutScreen 已在“软件介绍”和“版本记录”之间新增“使用帮助”按钮。
- App.js 已注册 UsageHelp 导航页面。
- src/screens/UsageHelpScreen.js 已新增页面，内容覆盖日视图、月视图、年视图、统计页、设置页和关于页的基础操作说明。
- developer_guide.md 已补充“使用帮助”章节并同步代码结构清单。

### 使用帮助操作说明补全
- 已重新核对 DayView、MonthView、YearView、CustomTabBar、CheckInButtons、StatisticsHeader、DatePickerScreen 和 SettingsScreen 的用户操作入口。
- UsageHelpScreen 已补全日视图、月视图、年视图、底部栏、打卡面板、统计页、日期选择、设置页和关于页的操作说明。
- VersionHistoryScreen 的 Unreleased 节点已记录本次使用帮助补全。

### 使用帮助页阶段性协作记录清理
- AGENTS.md 已移除设置页关于功能两阶段实现的阶段性协作记录。

### 日视图首次左滑右箭头禁用态分析
- 已定位 DayView 的右箭头禁用判断使用 selectedDate.clone().add(1, 'day').isAfter(moment().startOf('day'))，当 selectedDate 带有当前时分秒时，昨天加一天会得到今天当前时刻并被误判为晚于今天零点。
- 已定位 CalendarScreen 初始 selectedDate 使用 moment()，MonthView 的回到今日按钮和 CustomTabBar 的回到今日入口也会传入未归一到 startOf('day') 的 moment 对象。
- 已确认该现象符合用户描述：首次从今天左滑到昨天时继承当前时分秒导致右箭头灰色，后续经 handleNextDay 返回今天后 selectedDate 已归一到 startOf('day')，再次左滑不再复现。

### 日视图首次左滑右箭头禁用态修复方案
- 已形成修复方案：将 selectedDate 在进入和切换日视图时统一归一到 startOf('day')，避免日期状态携带当前时分秒。
- 已形成修复方案：DayView 的上一日、下一日、回到今日入口均以当天零点作为 onDateChange 入参。
- 已形成修复方案：CalendarScreen 初始 selectedDate、MonthView 回到今日入口、CustomTabBar 切回今天日视图入口均改为传入 moment().startOf('day')。
- 已形成修复方案：DayView 顶部右箭头禁用判断按 day 粒度比较，避免时分秒影响未来日期判断。
- 已形成验证点：首次进入日视图左滑到昨天后右箭头应为可用；从昨天右滑回今天后右箭头应禁用；左滑两次再右滑到昨天后右箭头应保持可用。

### 日视图首次左滑右箭头禁用态修复实现
- App.js 已将 CalendarScreen 的 selectedDate 初始值和 onDateChange 入口统一归一到 startOf('day')。
- DayView 已将上一日导航归一到 startOf('day')，并将下一日守卫和右箭头禁用判断改为按 day 粒度比较。
- MonthView 的回到今日入口和 CustomTabBar 的切回今天日视图入口已改为传入 moment().startOf('day')。
- 已执行 node --check App.js、src/screens/DayView.js、src/screens/MonthView.js、src/components/CustomTabBar.js，均通过。

### 版本记录补充日视图导航修复
- VersionHistoryScreen 的 Unreleased 节点已补充日视图首次从今天左滑到昨天时顶部右箭头误判为不可用的修复记录。
- 已执行 node --check src/screens/VersionHistoryScreen.js，检查通过。

### 自定义统计跨年月聚合缺陷分析
- 已定位自定义区间统计逻辑位于 src/utils/statsUtils.js 的 computeCustomStats。
- 已确认 32 到 366 天区间会进入月统计分支。
- 已确认当前月聚合使用月份数字作为 monthMap 键，跨年时不同年份的同月会被合并。
- 已确认当前月统计行按月份数字倒序生成，跨年且不足 366 天时会脱离真实时间顺序。
- 已确认当前月统计标签只显示 n月，跨年区间无法区分年份。
- 已形成修复方案：月统计聚合键改为 YYYY-MM，标签在跨年时显示 YYYY年M月，并按年月时间顺序生成行。
- 已形成验证点：2025-08-01 至 2026-04-30 应显示 2025年8月 到 2026年4月 的月行且不合并同名月份。

### 自定义统计跨年月排序规则澄清
- 用户已澄清自定义统计月统计行应保持现有倒序展示方向。
- 已更新修复方案：跨年月统计按真实年月倒序生成行，例如 2026年4月 到 2025年8月。

### 自定义统计跨年月聚合修复实现
- src/utils/statsUtils.js 已将自定义区间月统计聚合键从月份数字改为 YYYY-MM。
- src/utils/statsUtils.js 已将自定义区间跨年月统计标签改为 YYYY年M月。
- src/utils/statsUtils.js 已保持自定义区间月统计行按真实年月从近到远倒序展示。
- VersionHistoryScreen.js 的 Unreleased 节点已记录本次自定义统计跨年月显示修复。
- developer_guide.md 已记录自定义区间月统计的真实年月倒序和跨年标签规则。
- 已执行 node --check src/utils/statsUtils.js，检查通过。
- 已执行 node --check src/screens/VersionHistoryScreen.js，检查通过。
- 已执行临时 Node 验证脚本，确认 2025-08-01 至 2026-04-30 的月统计标签按 2026年4月 到 2025年8月 倒序输出。
- 已执行 git diff --check，空白检查通过。

### 统计表行标题对齐最终实现
- src/components/StatsTable.js 已新增 LabelCell 渲染统计表左侧行标题。
- src/components/StatsTable.js 已将纯月份标题（如 1月、12月）保持为连续文本，并按纯月份标题组内最大自然宽度右对齐。
- src/components/StatsTable.js 已将 YYYY年M月 标题拆为年数字、年字、月数字、月字四段，分别按当前字体下的同类最大自然宽度居中渲染。
- src/components/StatsTable.js 已保持普通标题（如 日期、总计、日均、月均、年均）为单文本居中渲染。
- src/components/StatsTable.js 已保持左侧表格列整体 flex 占位不变。
- VersionHistoryScreen.js 的 Unreleased 节点已记录本次统计表行标题对齐优化。
- AGENTS.md 已记录统计表纯月份标题组内右对齐的语义边界。
- 已执行 node --check src/components/StatsTable.js，检查通过。
- 已执行 node --check src/screens/VersionHistoryScreen.js，检查通过。
- 已执行 git diff --check，空白检查通过。

### 年度统计图横轴从零开始缺陷分析
- 已定位年度统计图入口位于 src/components/YearLineChart.js，组件将 useCheckinAggregation 的 points 以 xType=point 传入 LineChartBase。
- 已定位年度聚合逻辑位于 src/hooks/useCheckinAggregation.js，year 分支使用 Array.from({ length: 12 }, (_, i) => i) 生成 0 到 11 的月份点位。
- 已确认 src/components/LineChartBase.js 在 xType=point 时将点位转换为字符串并原样渲染横轴标签，因此年度统计图横轴显示为 0 到 11。
- 已确认该缺陷属于月份内部编码与用户可见月份标签未分离导致的显示问题，统计计数本身仍按 moment(dateStr).month() 聚合到 0 到 11 索引。

### 年度统计图横轴月份显示修复
- src/hooks/useCheckinAggregation.js 已将年度统计图横轴点位从 0 到 11 改为 1 到 12。
- src/hooks/useCheckinAggregation.js 已保持年度统计计数按原数组索引聚合，未追加月字标签。
- src/screens/VersionHistoryScreen.js 的 Unreleased 节点已记录年度统计图横轴月份从 0 开始的修复。
- 已执行 node --check src/hooks/useCheckinAggregation.js，检查通过。
- 已执行 node --check src/screens/VersionHistoryScreen.js，检查通过。
- 已执行 git diff --check，空白检查通过。

### 自定义统计图横轴聚合显示实现
- src/components/CustomLineChart.js 已移除自定义统计图下采样时在头部插入 startDate 前一天哑数据的逻辑。
- src/components/CustomLineChart.js 已保持自定义区间先生成 startDate 到 endDate 的逐日数据。
- src/components/CustomLineChart.js 已在逐日数据超过 12 个点时按 Math.ceil(天数 / 12) 从前到后分组聚合，尾部不足完整组时保持尾部不完整分组。
- src/components/CustomLineChart.js 已将每个聚合数据点绘制在对应聚合区间中间日期；偶数天数聚合区间取第一个中间日期。
- src/components/CustomLineChart.js 已将自定义统计图横轴刻度标签改为每个聚合区间起点，并补充完整统计区间终点标签且避免重复。
- src/components/LineChartBase.js 已新增 xDomain 参数，使时间轴比例尺范围可独立于实际绘制点位。
- src/components/LineChartBase.js 已新增 xLabels 参数，使横轴短刻度线和文字标签可独立于实际绘制点位。
- src/components/LineChartBase.js 已为时间横轴比例尺 range 增加内部留白，避免居中标签在左右边缘裁切。
- src/components/LineChartBase.js 已在倒数第二个横轴标签与最后一个横轴标签距离不足时仅隐藏倒数第二个文字标签，并保持对应短刻度线显示。
- src/components/LineChartBase.js 已将触摸响应改为随最新 series 和 xScale 更新，避免日期范围变化后触摸命中使用旧点位。
- src/screens/VersionHistoryScreen.js 的 Unreleased 节点已记录自定义统计图横轴范围显示优化。
- 已执行 node --check src/components/CustomLineChart.js，检查通过。
- 已执行 node --check src/components/LineChartBase.js，检查通过。
- 已执行 node --check src/screens/VersionHistoryScreen.js，检查通过。
- 已执行临时 Node 脚本确认 2026-03-20 至 2026-05-02 按 4 天一组聚合，横轴标签为 03-20、03-24、03-28 到 05-02。
- 已执行 rg -n "xRangeLabels|xTicks|axisTicks" src/components，确认被废弃的横轴参数和每日刻度变量无残留。
- 已执行 git diff --check，空白检查通过。

### 版本记录用户可感知规则整理
- 用户已明确版本记录页面只记录用户能感受到的变化，不记录内部实现细节。
- AGENTS.md 已记录版本记录页面的用户可感知变化记录规则。
- src/screens/VersionHistoryScreen.js 已将自定义统计图内部实现记录合并为用户可感知的横轴范围显示和触摸查看效果优化说明。
- 已执行 node --check src/screens/VersionHistoryScreen.js，检查通过。
- 已执行 git diff --check，空白检查通过。

### 自定义统计图下采样代码清理
- src/components/CustomLineChart.js 已移除下采样逻辑中不再需要的 raw 数组拷贝。
- src/components/CustomLineChart.js 已改为直接按 raw.slice 生成聚合区间，聚合行为保持不变。
- 已执行 node --check src/components/CustomLineChart.js，检查通过。
- 已执行 node --check src/components/LineChartBase.js，检查通过。
- 已执行 git diff --check，空白检查通过。

### 自定义统计图聚合点触摸横轴显示实现
- src/components/CustomLineChart.js 已为自定义统计图聚合点记录所在聚合区间的起止日期。
- src/components/LineChartBase.js 已新增 touchXLabels 参数，并在触摸聚合点时仅渲染该点对应区间的起止日期横轴刻度和标签。
- src/screens/VersionHistoryScreen.js 的 Unreleased 节点已记录自定义统计图聚合点触摸横轴区间显示优化。
- developer_guide.md 已记录自定义统计图聚合点触摸时的横轴显示规则。
- 已使用 Babel parser 解析 src/components/CustomLineChart.js、src/components/LineChartBase.js 和 src/screens/VersionHistoryScreen.js，结果通过。
- 已执行临时 Node 脚本确认 2026-03-20 至 2026-05-02 共 44 天按 4 天一组聚合时，触摸区间标签包含首组 2026-03-20 至 2026-03-23、第二组 2026-03-24 至 2026-03-27、末组 2026-04-29 至 2026-05-02。
- 首次执行 develop_log.md 追加脚本时因 PowerShell 数组参数写法错误失败，develop_log.md 未写入内容；已改用显式数组语法成功追加日志。

### 自定义统计图触摸区间标签防重叠实现
- src/components/LineChartBase.js 已将触摸态聚合区间的横轴刻度位置与文字标签位置分离。
- src/components/LineChartBase.js 已在触摸态聚合区间起止标签距离不足时按估算文字宽度自适应分散标签。
- src/components/LineChartBase.js 已实现首个聚合区间仅移动终点标签、末个聚合区间仅移动起点标签、中间聚合区间两侧标签共同分散。
- src/screens/VersionHistoryScreen.js 的 Unreleased 节点已更新自定义统计图聚合点触摸横轴区间显示说明。
- developer_guide.md 已记录自定义统计图聚合区间标签防重叠规则。
- 已使用 Babel parser 解析 src/components/CustomLineChart.js、src/components/LineChartBase.js 和 src/screens/VersionHistoryScreen.js，结果通过。
- 已执行临时 Node 脚本确认触摸态标签重叠时首个聚合区间仅终点标签右移、末个聚合区间仅起点标签左移、中间聚合区间两个标签分别向外移动。

### 统计图触摸数值重叠最终方案
- 已确认统计图触摸态数值标签不采用上下移动。
- 已确认同一触摸点下相同数值标签按观看教程、武器强化、双人练习顺序排列。
- 已确认重复标签按每重叠一个向右偏移 6 的规则绘制，并保留原有基础 x 偏移。

### 统计图触摸数值重叠最终实现与验证
- AGENTS.md 已记录统计图触摸同值标签按观看教程、武器强化、双人练习顺序向右错开的持久规则。
- src/components/LineChartBase.js 已为触摸态数值标签新增同值重叠计数。
- src/components/LineChartBase.js 已在同一触摸点同值标签上按每重叠一个向右偏移 6 绘制文本。
- src/screens/VersionHistoryScreen.js 的 Unreleased 节点已记录统计图触摸相同数值标签显示优化。
- developer_guide.md 已记录统计图触摸同值标签向右错开的行为。
- 已使用 Babel parser 解析 src/components/LineChartBase.js 和 src/screens/VersionHistoryScreen.js，结果通过。

### 关于页按钮相邻样式调整
- AboutScreen 已移除关于页按钮组间距，三个按钮改为相邻显示。
- AboutScreen 已将中间的使用帮助按钮设置为直角边框样式。
- 已执行 node --check .\src\screens\AboutScreen.js，语法检查通过。

### 版本记录补充关于页按钮优化
- VersionHistoryScreen 的 Unreleased 节点已记录关于页入口按钮排列优化。
- 已执行 node --check .\src\screens\VersionHistoryScreen.js，语法检查通过。

### 关于页隐私政策入口与页面新增
- 关于页在使用帮助和版本记录之间新增了隐私政策入口。
- 新增 PrivacyPolicyScreen 页面，说明应用记录数据范围、本地存储、导入导出分享、权限联网和用户控制方式。
- 使用帮助、版本记录和开发者文档同步补充了隐私政策相关说明。
- 验证结果：Babel 解析 App.js 和相关 screen 文件通过；git diff --check 通过。

### 关于页隐私政策入口与页面新增补充记录
- 关于页在使用帮助和版本记录之间新增了隐私政策入口。
- 新增 PrivacyPolicyScreen 页面，说明应用记录数据范围、本地存储、导入导出分享、权限联网和用户控制方式。
- 使用帮助、版本记录和开发者文档同步补充了隐私政策相关说明。
- 验证结果：Babel 解析 App.js 和相关 screen 文件通过；git diff --check 通过。
- 前一次开发日志追加时，多条事实被命令行参数合并为一条逗号串联的记录。

### 已完成功能持久约束清理
- AGENTS.md 已删除统计表纯月份行标题右对齐、统计图触摸同值标签错开、月视图日期点击规则三条已完成功能的持久约束。

## 2026-05-05

### 版本记录分组排序规则落地
- AGENTS.md 已记录版本记录页面按修复、优化、新增分组并显示分类标题的持久规则。
- AGENTS.md 已记录版本记录页面各分类内部按视图、统计、设置及其子顺序排列的持久规则。
- developer_guide.md 已同步版本记录分组展示和分类内排序口径。
- VersionHistoryScreen.js 已将版本记录数据从 notes 平铺数组改为 sections 分组结构。
- VersionHistoryScreen.js 已按修复、优化、新增分组渲染每个版本节点，并为每组显示分类标题。
- 已使用 Babel parser 解析 src/screens/VersionHistoryScreen.js，结果通过。
- 已执行 git diff --check，空白检查通过。

### 版本记录初始版本标题显示修正
- VersionHistoryScreen.js 已将初始版本的分类标题设为空。
- VersionHistoryScreen.js 已改为仅在分类标题非空时渲染分类标题文本。
- AGENTS.md 已记录初始版本不显示新增分类标题的规则。
- developer_guide.md 已同步初始版本不显示新增分类标题的展示口径。
- 已使用 Babel parser 解析 src/screens/VersionHistoryScreen.js，结果通过。
- 已执行 git diff --check，空白检查通过。

### 版本记录最终态规则落地
- AGENTS.md 已记录版本记录只描述相对上一版本最终变化的持久规则。
- AGENTS.md 已记录同一版本开发过程中的中间调整、反复修正或临时状态不写入版本记录。
- developer_guide.md 已同步版本记录只描述相对上一版本最终变化的口径。
- VersionHistoryScreen.js 已将 Unreleased 中月视图灰色日期规则并入月视图最终点击行为描述。
- VersionHistoryScreen.js 已将 Unreleased 中统计图多次横轴与触摸效果记录合并为最终态描述。
- 已使用 Babel parser 解析 src/screens/VersionHistoryScreen.js，结果通过。
- 已执行 git diff --check，空白检查通过。

### 1.3.0 版本记录概述修正
- VersionHistoryScreen.js 中 1.3.0 版本节点概述已改为“日历、统计与帮助信息更新”。

### 版本更新至 1.3.0
- package.json 的 version 已更新为 1.3.0。
- package-lock.json 的项目根版本已更新为 1.3.0。
- app.json 的 expo.version 已更新为 1.3.0。
- android/app/build.gradle 的 versionName 已更新为 1.3.0。
- android/app/src/main/res/values/strings.xml 的 expo_runtime_version 已更新为 1.3.0。
- VersionHistoryScreen.js 中的版本记录顶层节点已从 Unreleased 调整为 1.3.0。
- developer_guide.md 已同步当前语义版本和发布示例为 1.3.0 口径。

### 1.3.0 Android 归档产物生成
- 已使用 release APK 生成归档 dist/MinimalistWeaponEnhancementCalendar-v1.3.0-android-20260505.apk。
- 归档来源为 android/app/build/outputs/apk/release/app-release.apk。
- 归档文件大小为 84506502 bytes。

### 设置页关于入口位置调整
- 设置页将关于入口移动到所有设置内容之后，使其始终作为设置页最下面的入口显示。
- 使用帮助同步说明关于入口位于设置页最下面。

### 关于入口迁移到更多菜单末尾
- CustomTabBar 的更多菜单按设置、统计、关于顺序展示，并将关于作为最后一项。
- SettingsScreen 移除了设置页底部的关于入口和对应未使用样式。
- UsageHelpScreen、VersionHistoryScreen、developer_guide.md 和 AGENTS.md 已同步记录关于入口位置。
- node --check 已通过 CustomTabBar.js、SettingsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js。
- 本次改动为 JS/UI 与文档改动，未执行 Android 重新安装。

### 关于页 GitHub 入口
- AboutScreen.js 在关于页新增 GitHub 按钮，并使用 Ionicons 的 logo-github 图标。
- AboutScreen.js 将 GitHub 按钮从关于页按钮组中拆出，改为页面底部独立按钮。
- AboutScreen.js 保持软件介绍、使用帮助、隐私政策和版本记录为原有紧凑按钮组。
- AboutScreen.js 通过 Linking.openURL 打开项目主页 https://github.com/LTong-g/MinimalistWeaponEnhancementCalendar，并在打开失败时提示用户。
- UsageHelpScreen.js、VersionHistoryScreen.js 和 developer_guide.md 已同步说明关于页 GitHub 入口。
- AboutScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 检查。
- 本次改动为 JS/UI 与文档改动，未执行 Android 重新安装。

### Android 使用记录权限可见范围确认
- 已确认 Android 的应用使用记录权限通常对应 android.permission.PACKAGE_USAGE_STATS，用户需要在系统设置的使用情况访问权限页面手动授予。
- 已确认应用获得该权限后，可通过 UsageStatsManager 查询其他应用的包名、某段时间内的前台使用总时长、最近一次使用时间、可见时长和前台服务相关使用时长等汇总统计。
- 已确认应用获得该权限后，可通过 UsageEvents 查询近期使用事件，包括应用或 Activity 进入前台、暂停、停止、前台服务开始或停止、快捷方式触发、屏幕交互状态变化等系统记录到的事件。
- 已确认细粒度事件可带有时间戳，时间戳精度可到毫秒级；部分事件还可能包含 Activity 类名，因此可推断用户打开了哪个应用以及部分界面入口。
- 已确认该权限不能直接读取其他应用的屏幕内容、聊天内容、网页内容、输入文字、私有数据库、私有文件或账号信息。
- 已确认该权限的隐私影响主要体现在可还原用户使用轨迹，例如何时打开某个应用、使用多久、应用之间如何切换以及使用习惯。
- 已确认 UsageEvents 这类细粒度使用事件只会被系统保留较短时间，官方文档表述为保留最近几天，因此不能长期回溯详细打开和关闭时间线。
- 已确认 UsageStats 这类汇总统计可按日、周、月、年区间查询；时间越久远，系统返回的数据通常越偏向聚合时长，缺少每次打开和关闭的细节。
- 已确认 AOSP 当前实现中的汇总统计保留周期大致为日统计约 10 天、周统计约 4 周、月统计约 6 个月、年统计约 2 年。
- 已确认公开 API 允许传入任意 beginTime 和 endTime，但系统只会返回仍被保留的记录，实际可见范围会受 Android 版本、厂商 ROM 和系统清理策略影响。

### 黑名单自动统计功能初步分析
- 已完成黑名单自动统计功能的初步方案分析。
- 已确认该想法会把当前应用从仅支持用户主动输入记录，扩展为可选读取系统应用使用记录并辅助生成记录或统计。
- 已确认当前项目已有日历、手动记录、统计、导入导出和隐私政策页面，但尚未实现 PACKAGE_USAGE_STATS 权限、原生 UsageStatsManager 桥接、黑名单配置、自动同步或自动记录来源标记。
- 已确认该功能的关键设计问题包括黑名单应用如何映射到现有三类记录、使用时长如何换算为记录次数、自动记录是否写入现有 checkin_status 数据、是否保留手动与自动来源、以及隐私政策如何更新。
- 已确认该功能存在 Android 平台约束，包括用户需手动授予使用情况访问权限、UsageEvents 细粒度事件只保留最近几天、汇总统计会随时间变粗、Android 11 以后安装应用列表可见性受 package visibility 限制。
- 已确认初步建议是先把黑名单功能设计为 Android-only、用户显式开启、仅本地处理、可预览后写入的辅助记录功能，而不是默认后台自动改写现有记录。

### 使用记录辅助前置能力实现
- android/app/src/main/AndroidManifest.xml 已声明 PACKAGE_USAGE_STATS、RECEIVE_BOOT_COMPLETED、REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 和 SCHEDULE_EXACT_ALARM，并注册 UsageAccessRefreshReceiver。
- android/app/src/main/java/com/ltongg/MinimalistWeaponEnhancementCalendar 已新增 UsageAccessModule、UsageAccessPackage、UsageAccessScheduler 和 UsageAccessRefreshReceiver，用于使用情况访问状态检查、系统设置跳转、应用内开关状态、晚间刷新计划和已保存使用记录清理。
- UsageAccessScheduler 已在开关开启时安排每天 23:55、23:56、23:57、23:58、23:59 各尝试刷新一次当天 UsageStats，并在开关关闭时取消刷新计划。
- UsageAccessScheduler 已实现关闭开关不自动清理已保存使用记录，清理操作由 clearStoredUsageRecords 单独执行。
- src/utils/usageAccessNative.js 已新增使用记录辅助原生模块封装。
- src/screens/SettingsScreen.js 已新增 Android 使用记录辅助开关、权限状态展示、使用情况访问权限入口、电池优化入口、精确定时入口、应用详情入口和删除应用使用记录按钮。
- src/screens/SettingsScreen.js 已实现删除应用使用记录按钮在开关开启时置灰不可交互，在开关关闭时可手动删除。
- src/screens/PrivacyPolicyScreen.js、src/screens/UsageHelpScreen.js、src/screens/VersionHistoryScreen.js 和 developer_guide.md 已同步说明使用记录辅助权限、晚间刷新、关闭开关不自动删数据、手动删除数据和系统权限需手动撤销。
- 已执行 node --check 检查 SettingsScreen.js、usageAccessNative.js、PrivacyPolicyScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js，结果通过。
- 首次执行 npm run android:build:debug:tempmap 因沙箱下 subst M: 映射失败未进入 Gradle；提升权限后执行 npm run android:build:debug:tempmap，Debug 构建通过，构建后 subst 输出不包含 M:。

### 黑名单实验使用统计实现
- android/app/src/main/java/com/ltongg/MinimalistWeaponEnhancementCalendar/UsageAccessModule.kt 已新增 getLaunchableApplications 和 queryUsageIntervals 原生方法。
- getLaunchableApplications 已按系统 launcher 应用查询可选择应用，并返回应用名称和包名。
- queryUsageIntervals 已按传入黑名单包名和时间范围读取 UsageEvents，并基于前后台事件生成使用开始时间、结束时间和使用时长。
- src/utils/usageAccessNative.js 已新增 getLaunchableApplications 和 queryUsageIntervals JS 封装。
- src/utils/experimentalUsageStorage.js 已新增实验性黑名单应用列表和使用时间段的本地存储工具。
- src/screens/ExperimentalUsageScreen.js 已新增黑名单实验页面，支持选择黑名单应用、刷新读取本月黑名单使用时间段、展示使用时间段列表和今日合计。
- src/components/ExperimentalUsageCharts.js 已新增当日饼图、本周柱形图和本月折线图，用于展示黑名单应用使用统计。
- App.js 已注册 ExperimentalUsage 页面，src/screens/SettingsScreen.js 已在使用记录辅助卡片中新增黑名单实验功能入口。
- src/screens/PrivacyPolicyScreen.js、src/screens/UsageHelpScreen.js、src/screens/VersionHistoryScreen.js 和 developer_guide.md 已同步说明黑名单实验功能的记录范围、统计方式和不自动写入日历打卡记录。
- 已执行 node --check 检查 App.js、ExperimentalUsageScreen.js、ExperimentalUsageCharts.js、experimentalUsageStorage.js 和 SettingsScreen.js，结果通过。
- 已执行 npm run android:build:debug:tempmap，Debug 构建通过，构建后 subst 输出不包含 M:。

### 黑名单实验统计口径调整
- src/utils/experimentalUsageStorage.js 已新增同一应用相邻使用时间段合并逻辑，前一条结束时间与后一条开始时间间隔不超过 1 分钟时合并为一条记录。
- src/screens/ExperimentalUsageScreen.js 已在展示和统计前使用合并后的黑名单应用时间段，并在刷新完成提示中说明已按 1 分钟间隔合并碎片记录。
- src/screens/ExperimentalUsageScreen.js 已将当日统计范围从整天改为今天已经过去的时间。
- src/components/ExperimentalUsageCharts.js 已将当日饼图总范围改为今天已过去分钟数，并将未使用黑名单应用的已过时间作为灰色剩余扇区显示。
- 已确认黑名单实验功能三个图表的绘图数据均为使用时长。
- developer_guide.md、src/screens/PrivacyPolicyScreen.js、src/screens/UsageHelpScreen.js 和 src/screens/VersionHistoryScreen.js 已同步记录碎片合并、使用时长绘图和当日饼图总范围规则。
- 已执行 node --check 检查 ExperimentalUsageScreen.js、ExperimentalUsageCharts.js、experimentalUsageStorage.js、UsageHelpScreen.js 和 VersionHistoryScreen.js，结果通过。
- 已执行 npm run android:build:debug:tempmap，Debug 构建通过，构建后 subst 输出不包含 M:。

### 黑名单应用设置页面拆分
- src/screens/ExperimentalUsageBlacklistScreen.js 已新增独立黑名单应用设置页面，用于加载可启动应用列表并勾选黑名单应用。
- src/screens/ExperimentalUsageScreen.js 已移除直接展示完整应用列表的逻辑，改为显示设置黑名单应用入口和已选择应用数量。
- App.js 已注册 ExperimentalUsageBlacklist 页面。
- src/screens/UsageHelpScreen.js、src/screens/VersionHistoryScreen.js 和 developer_guide.md 已同步说明黑名单应用在独立页面设置。
- 已执行 node --check 检查 App.js、ExperimentalUsageScreen.js、ExperimentalUsageBlacklistScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js，结果通过。
- 已执行 npm run android:build:debug:tempmap，Debug 构建通过，构建后 subst 输出不包含 M:。

### 黑名单实验入口开关控制
- src/screens/SettingsScreen.js 已将黑名单实验功能入口改为仅在使用记录辅助开关开启时可交互，开关关闭时入口置灰不可进入。
- src/screens/ExperimentalUsageScreen.js 已移除系统授权按钮，未授权时只提示需要先回到设置页开启并授权。
- src/screens/UsageHelpScreen.js、src/screens/VersionHistoryScreen.js 和 developer_guide.md 已同步说明黑名单实验功能入口依赖使用记录辅助开关。
- 已执行 node --check 检查 SettingsScreen.js、ExperimentalUsageScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js，结果通过。
- 已执行 npm run android:build:debug:tempmap，Debug 构建通过，构建后 subst 输出不包含 M:。

### 使用记录辅助开关权限状态同步
- src/screens/SettingsScreen.js 已将使用记录辅助开关显示状态改为由应用内启用状态和系统使用情况访问权限共同决定。
- src/screens/SettingsScreen.js 已在刷新权限状态时检测到系统使用情况访问权限失效后自动关闭应用内使用记录辅助功能并取消刷新计划。
- src/screens/SettingsScreen.js 已将黑名单实验功能入口可交互状态改为跟随真实开关状态，避免系统权限失效后仍可进入。
- src/screens/UsageHelpScreen.js、src/screens/VersionHistoryScreen.js 和 developer_guide.md 已同步说明使用记录辅助开关跟随系统使用情况访问权限状态。
- 已执行 node --check 检查 SettingsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js，结果通过。
- 已执行 npm run android:build:debug:tempmap，Debug 构建通过，构建后 subst 输出不包含 M:。

### 使用记录辅助保活权限入口开关化
- 设置页在使用记录辅助开关开启后的展开区移除了冗余的使用权限按钮。
- 设置页将忽略电池优化和精确定时权限入口改为开关样式，并继续由原生权限状态驱动显示。
- 使用帮助、版本记录和开发者文档同步记录了使用记录辅助展开区的权限入口变化。
- SettingsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。
- Android Debug 构建已通过 npm run android:build:debug:tempmap 验证。

### 使用记录与电池优化开关状态同步修复
- 设置页将使用记录辅助主开关改为直接跟随系统使用情况访问权限状态显示。
- 设置页在使用记录辅助主开关开启或关闭时均跳转到系统使用情况访问权限页，并在返回应用后重新读取实际权限状态。
- 设置页在读取到系统使用情况访问权限已授权且应用内刷新计划未启用时，会自动启用本地刷新计划。
- 原生使用记录模块新增打开系统电池优化设置页的方法，用于电池优化开关关闭场景。
- 设置页将电池优化开关关闭操作改为跳转系统电池优化设置页，返回应用后由实际权限状态刷新开关。
- 使用帮助、隐私政策、版本记录和开发者文档同步记录了权限开关返回后刷新实际状态的行为。
- 相关 JS 文件已通过 node --check 语法检查。
- Android Debug 安装已通过 npm run android:install:debug:tempmap 验证并安装到 AVD_2560x1600。

### 使用记录开关交互与样式调整
- 设置页为使用记录辅助主开关、忽略电池优化开关和精确定时权限开关统一配置彩色开启态与浅灰关闭态。
- 设置页使用记录辅助开关在点击开启或关闭时先按目标状态更新界面，再跳转系统使用情况访问权限页。
- 设置页移除了使用记录辅助开关开启前对应用内刷新计划状态的预同步调用。
- 设置页保留首次进入、页面重新聚焦和应用从系统页返回前台时的权限状态刷新。
- 开发者文档、使用帮助和版本记录同步记录了使用记录辅助开关返回应用后校验实际权限的交互。
- SettingsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。

### 黑名单应用图标显示与验证约束调整
- AGENTS.md 记录了黑名单功能有模拟器在线时每次功能改动后重新安装验证的用户偏好。
- AGENTS.md 将黑名单功能开发中的模拟器安装验证规则收窄为只有改动无法直接同步到在线模拟器时才需要重新安装。
- 黑名单应用设置页开始显示原生读取到的应用图标、应用名称和包名。
- 原生使用记录模块的已启动应用列表接口新增返回图标数据。
- UsageHelpScreen.js、VersionHistoryScreen.js 和 UsageAccessModule.kt 的相关改动已通过 node --check 语法检查。

### 黑名单统计图视觉与配色优化
- ExperimentalUsageCharts.js 将当日图改为甜甜圈样式，并在中心显示黑名单应用使用分钟数。
- ExperimentalUsageCharts.js 将本周柱状图改为观看教程黄橙色系渐变圆角柱，并增加网格线和数值标签。
- ExperimentalUsageCharts.js 将本月折线图改为观看教程黄橙色系，并增加面积填充、圆点和更细网格线。
- 开发者文档、使用帮助和版本记录同步记录了黑名单统计图使用观看教程黄橙色系。
- ExperimentalUsageCharts.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。

### 黑名单周统计柱形图细节优化
- ExperimentalUsageCharts.js 限制本周统计柱形图柱宽上限，并将柱组在图表区域内居中显示。
- ExperimentalUsageCharts.js 将本周统计柱形图的网格线宽度调整为与居中柱组绘图区一致。
- ExperimentalUsageCharts.js 调整本周统计柱形图有效绘图区高度和横轴标签显示空间，避免标签裁切。
- ExperimentalUsageCharts.js 移除了本周统计柱形图柱子顶部的数值标签。
- ExperimentalUsageCharts.js 将统计图纵轴在小数据范围内改为显示一位小数刻度，避免四舍五入造成重复刻度标签。
- ExperimentalUsageCharts.js 将本周统计柱形图渐变调整为顶部浅黄、底部深橙。
- ExperimentalUsageCharts.js 将本周统计柱形图渐变改为基于统一绘图区高度的 userSpaceOnUse 坐标。
- 本周统计柱形图中不同柱子在同一高度位置使用相同渐变颜色。
- ExperimentalUsageCharts.js 已通过 node --check 语法检查。

### 黑名单使用时间段独立查看页
- ExperimentalUsageScreen.js 移除了统计页底部直接展开的使用时间段长列表，并改为查看使用时间段入口。
- App.js 新增 ExperimentalUsageIntervals 路由。
- ExperimentalUsageIntervalsScreen.js 新增使用时间段查看页，先显示全部记录入口和按应用分组入口，进入后显示对应记录列表。
- experimentalUsageStorage.js 在黑名单应用数据中保留应用图标字段。
- ExperimentalUsageIntervalsScreen.js 在加载使用时间段分应用入口时，会从当前系统可启动应用列表按包名补齐已保存黑名单应用缺失的图标。
- ExperimentalUsageIntervalsScreen.js 将使用时间段详情列表改为按日期分组显示。
- ExperimentalUsageIntervalsScreen.js 将单条使用记录中的时间段和时长信息调整为靠右显示。
- 开发者文档、使用帮助和版本记录同步记录了黑名单使用时间段独立查看页。
- App.js、ExperimentalUsageScreen.js、ExperimentalUsageIntervalsScreen.js、experimentalUsageStorage.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。

### 黑名单统计页入口视觉收紧
- ExperimentalUsageScreen.js 将查看使用时间段入口移动到设置黑名单应用入口下方、统计图表上方。
- ExperimentalUsageScreen.js 将查看使用时间段入口与设置黑名单应用入口之间的间距收紧到 8px。
- ExperimentalUsageScreen.js 的设置黑名单应用入口移除了重复的已选择应用数量文案。
- ExperimentalUsageScreen.js 的查看使用时间段入口移除了下方小字说明。
- ExperimentalUsageScreen.js 将设置黑名单应用和查看使用时间段两个入口的最小高度收紧到 48px。
- ExperimentalUsageScreen.js 将两个入口的标题字号收紧到 14px，以适配单行文案。
- ExperimentalUsageScreen.js 已通过 node --check 语法检查。

### 黑名单入口迁移到更多菜单
- CustomTabBar.js 在右下角更多菜单中保留设置、统计和黑名单入口，其中黑名单位于统计下方。
- CustomTabBar.js 将更多菜单中的黑名单入口图标从实验室图标改为禁用语义图标。
- SettingsScreen.js 已移除黑名单入口，仅保留使用记录辅助相关权限设置。
- UsageHelpScreen.js 和 VersionHistoryScreen.js 的黑名单相关文案已改为黑名单，不再使用黑名单实验功能表述。
- CustomTabBar.js、SettingsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。

### 版本记录未发布功能归档修正
- VersionHistoryScreen.js 将使用记录辅助与黑名单相关未发布功能移入 Unreleased 节点。
- VersionHistoryScreen.js 将已发布的 1.3.0 版本记录恢复为原有内容。
- VersionHistoryScreen.js 已通过 node --check 语法检查。
- git diff 显示 VersionHistoryScreen.js 仅新增 Unreleased 节点。

### 黑名单更多菜单入口权限与文档同步
- CustomTabBar 从更多菜单打开黑名单前读取使用记录权限状态，未授权时提示先到设置页开启使用记录辅助。
- UsageHelpScreen、VersionHistoryScreen、developer_guide.md 和 AGENTS.md 已同步记录黑名单入口位置。
- node --check 已通过 CustomTabBar.js、SettingsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js。
- 本次改动为 JS/UI 与文档改动，未执行 Android 重新安装。

### Unreleased 版本记录最终态收敛
- VersionHistoryScreen.js 将 Unreleased 节点收敛为相对 1.3.0 的最终用户可见变化。
- VersionHistoryScreen.js 移除了 Unreleased 中记录中间实现过程的优化项。
- VersionHistoryScreen.js 保留已发布版本节点内容不变。
- VersionHistoryScreen.js 已通过 node --check 和 git diff --check 检查。

### 设置页数据管理区域框选
- SettingsScreen.js 将导入、导出和分享按钮放入标题为数据管理的设置框中。
- UsageHelpScreen.js 已同步说明数据管理框包含导入、导出和分享按钮。
- VersionHistoryScreen.js 的 Unreleased 节点已记录设置页数据管理区优化。
- developer_guide.md 已同步记录设置页以数据管理框承载导入、导出和分享按钮。
- SettingsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 检查。
- 本次改动为 JS/UI 与文档改动，未执行 Android 重新安装。

### 权限设置同步文案收敛
- SettingsScreen.js 将使用记录辅助说明从每分钟刷新一次改为在 23:55 至 23:59 同步使用记录。
- SettingsScreen.js 将精确定时权限说明从定时刷新改为定时同步。
- UsageHelpScreen.js 已同步将使用记录辅助说明改为每天 23:55 至 23:59 同步使用记录。
- 本次改动未修改原生调度逻辑。
- SettingsScreen.js 和 UsageHelpScreen.js 已通过 node --check 检查。
- 本次改动为 JS/UI 文案改动，未执行 Android 重新安装。

### 黑名单日统计图按应用图标取色可行性分析
- 已确认黑名单应用当前保存 icon 字段，图标来源为 Android 原生模块返回的 data:image/png;base64 数据。
- 已确认当前日统计饼图使用固定黄橙色系 getUsageSliceColor 为黑名单应用切片和图例点取色。
- 已确认可在 Android 原生模块生成应用图标 Bitmap 时同步提取图标主色，并将颜色随 getLaunchableApplications 返回到 JS 层。
- 已确认实现图标主色取色需要修改原生 Android 代码和数据结构，属于无法仅靠 JS 热同步的改动。

### 黑名单当日饼图应用图标主色
- UsageAccessModule.kt 已在读取可启动应用时从应用图标 Bitmap 采样提取主色，并随 packageName、label 和 icon 返回 color 字段。
- experimentalUsageStorage.js 已将黑名单应用 color 字段归一化保存为十六进制颜色。
- ExperimentalUsageScreen.js 已将黑名单应用主色传入当日统计数据。
- ExperimentalUsageCharts.js 已将当日饼图切片和图例点改为优先使用应用图标主色，缺失主色时回退到原有黄橙色。
- ExperimentalUsageIntervalsScreen.js 已在补齐应用图标时同步补齐应用主色。
- UsageHelpScreen.js、PrivacyPolicyScreen.js、VersionHistoryScreen.js 和 developer_guide.md 已同步说明黑名单图表应用图标主色。
- 相关 JS 文件已通过 node --check 检查。
- 首次执行 npm run android:build:debug:tempmap 因沙箱下 subst M: 映射失败未进入 Gradle；提升权限后执行 npm run android:build:debug:tempmap，Debug 构建通过。
- 检测到 emulator-5554 在线后已执行 npm run android:install:debug:tempmap，并安装到 AVD_2560x1600。

### 黑名单应用主色回填与提取修正
- experimentalUsageStorage.js 新增 hydrateExperimentalUsageBlacklist，用于按当前可启动应用列表补齐黑名单应用的图标和主色。
- ExperimentalUsageScreen.js 在加载统计页状态时读取可启动应用列表，并为旧黑名单应用补齐 color 后写回本地存储。
- ExperimentalUsageBlacklistScreen.js 在加载黑名单设置页时为旧黑名单应用补齐图标和主色后写回本地存储。
- ExperimentalUsageIntervalsScreen.js 改为复用 hydrateExperimentalUsageBlacklist 补齐应用图标和主色。
- UsageAccessModule.kt 将应用图标主色返回值从色桶平均色改为主色桶内出现最多的真实采样像素色。
- UsageAccessModule.kt 不再生成图标中不存在的平均颜色作为主色。
- experimentalUsageStorage.js 将黑名单应用主色补齐优先级改为优先使用当前原生应用列表返回的 color。
- experimentalUsageStorage.js 在原生应用列表返回新 color 时会覆盖旧缓存中的 color。
- UsageAccessModule.kt 移除了主色提取中 brightness <= 0.96 的过滤条件。
- UsageAccessModule.kt 保留饱和度和最低亮度过滤，使 YouTube 这类高饱和纯红色不再被过滤。
- 相关 JS 文件已通过 node --check 和 git diff --check 检查。
- 已执行 npm run android:build:debug:tempmap，Debug 构建通过。
- 已执行 npm run android:install:debug:tempmap，并安装到在线模拟器 AVD_2560x1600。

### 黑名单月统计整月横轴修正
- ExperimentalUsageScreen.js 将月统计生成本月全部日期，并为今天之后的日期标记 isFuture。
- ExperimentalUsageCharts.js 的月统计折线图仅使用非未来日期计算最大值、折线、面积和数据点。
- ExperimentalUsageCharts.js 保留本月完整日期数量计算横轴位置。

### 黑名单实验性表述收敛
- ExperimentalUsageScreen.js 将页面标题和读取失败提示中的实验性使用记录表述改为黑名单表述。
- ExperimentalUsageBlacklistScreen.js 移除了黑名单应用设置说明中的实验性使用记录表述。
- ExperimentalUsageIntervalsScreen.js 将文件说明中的实验性使用记录表述改为黑名单使用时间段表述。
- PrivacyPolicyScreen.js 将实验性黑名单相关隐私文案改为黑名单功能表述。
- developer_guide.md 将黑名单实验功能表述改为黑名单功能表述。
- src 目录中仅保留黑名单页面顶部提示的实验性功能文案。

### 黑名单应用列表可见性修复
- UsageAccessModule.kt 将启动器应用查询从 MATCH_DEFAULT_ONLY 调整为无额外匹配标志。
- AndroidManifest.xml 在 queries 中新增 ACTION_MAIN 与 CATEGORY_LAUNCHER 的 intent 可见性声明。
- 已执行 npm run android:build:debug:tempmap，Debug 构建通过。
- 已执行 npm run android:install:debug:tempmap，安装阶段因没有连接设备失败。

## 2026-05-06

### 黑名单应用列表真机加载状态修正
- 已确认当前 adb 仅连接模拟器，未连接真机，无法直接抓取真机运行日志。
- 已确认黑名单应用列表读取使用 UsageAccessModule.getLaunchableApplications 查询 launcher 应用并返回应用图标数据。
- 已根据真机现象确认应用列表并非读取不到，而是真机应用数量较多导致读取等待时间更长。
- 已撤回本次会话中对 UsageAccessModule.kt 添加单项容错和图标缩小的修改。
- ExperimentalUsageBlacklistScreen.js 已在应用列表读取期间显示加载动画和读取提示。
- ExperimentalUsageBlacklistScreen.js 已在读取完成但列表为空时显示空状态提示。
- ExperimentalUsageBlacklistScreen.js 已移除首次进入时的重复读取调用，改为页面聚焦时读取一次。
- ExperimentalUsageBlacklistScreen.js 已通过 node --check 和 git diff --check 检查。

### 使用时间段页面应用列表读取解耦方案
- 已完成查看使用时间段页面与完整应用列表读取的解耦方案分析。
- 已确认查看使用时间段页面的核心数据为已保存黑名单列表和已保存使用时间段，不依赖完整可启动应用列表。
- 已确认完整可启动应用列表读取仅用于补齐黑名单应用图标和主色，适合从查看使用时间段页面的首屏加载链路中移除。
- 已确认解耦方案为先用本地已保存数据渲染页面，再将应用图标和主色补齐放到后台刷新或黑名单设置页维护。
- 已确认可新增应用元数据缓存或复用黑名单缓存，避免多个页面重复调用 getLaunchableApplications。

### 黑名单相关页面冗余读取分析
- 已完成黑名单相关页面是否存在非必要首屏行为的分析。
- 已确认 ExperimentalUsageIntervalsScreen 首屏读取完整可启动应用列表仅用于补齐黑名单应用图标和主色，属于可从首屏链路移除的非核心行为。
- 已确认 ExperimentalUsageScreen 首屏同样读取完整可启动应用列表用于补齐黑名单应用图标和主色，可改为优先使用已保存黑名单缓存。
- 已确认 ExperimentalUsageScreen 同时使用 useEffect 和 useFocusEffect 调用 loadState，页面首次进入时可能重复读取权限状态、黑名单、使用时间段和完整应用列表。
- 已确认 ExperimentalUsageBlacklistScreen 读取完整可启动应用列表符合黑名单选择页职责，但可避免每次重新聚焦时无条件重复读取。
- 已确认 SettingsScreen 首次进入时可能由 useEffect、useFocusEffect 和 AppState active 触发多次使用记录权限状态读取，但该读取相对轻量，优先级低于完整应用列表解耦。

### 黑名单应用读取职责与设置页交互确认
- 已确认黑名单完整应用列表只在设置黑名单应用页面读取。
- 已确认应用启动后首次进入设置黑名单应用页面时执行全量读取并缓存，本次应用运行期间后续读取优先使用缓存。
- 已确认设置黑名单应用页面顶部已选择应用数量状态框固定在顶部，只滚动下方应用列表。
- 已确认设置黑名单应用页面不采用下拉刷新，改为右下角刷新按钮触发重新全量读取。
- 已确认右下角刷新按钮位置语义接近日视图和月视图的回到今日或回到本月按钮。
- 已确认设置黑名单应用页面的应用列表右侧边缘增加首字母快速滑动条。
- 已确认黑名单应用主色只在设置黑名单应用页面退出后，随黑名单应用更新流程读取并保存。
- 已确认黑名单主页只读取使用情况和已保存主色，不自行读取完整应用列表或提取主色。
- 已确认查看使用时间段页面只读取已保存使用时间段，不读取完整应用列表或提取主色。
- AGENTS.md 已记录上述黑名单应用读取职责与设置页交互规则。

### 黑名单应用读取与页面交互优化实现
- src/utils/launchableAppCache.js 已新增本次应用运行期的完整应用列表缓存。
- ExperimentalUsageBlacklistScreen.js 已改为通过运行期缓存读取完整应用列表，并通过右下角刷新按钮强制重新全量读取。
- ExperimentalUsageBlacklistScreen.js 已将已选择应用数量状态区固定在顶部，下方应用列表改为 FlatList 独立滚动。
- ExperimentalUsageBlacklistScreen.js 已在应用列表右侧增加首字母快速滑动条。
- ExperimentalUsageScreen.js 已移除首屏完整应用列表读取，改为只读取权限状态、已保存黑名单和已保存使用时间段。
- ExperimentalUsageScreen.js 已移除首次进入时 useEffect 与 useFocusEffect 重复触发 loadState 的路径。
- ExperimentalUsageIntervalsScreen.js 已移除完整应用列表读取，改为只读取已保存黑名单和已保存使用时间段。
- developer_guide.md、UsageHelpScreen.js、VersionHistoryScreen.js 和 AGENTS.md 已同步记录黑名单应用读取职责与页面交互变化。
- 相关 JS 文件已通过 node --check，git diff --check 检查通过。
- 本次改动未修改原生 Android 代码，未执行 Android 重新安装。

### 黑名单应用设置页搜索与实时保存
- ExperimentalUsageBlacklistScreen.js 已移除退出页面时保存黑名单应用的 beforeRemove 监听和返回按钮保存流程。
- ExperimentalUsageBlacklistScreen.js 改为在勾选或取消勾选黑名单应用时立即调用 setExperimentalUsageBlacklist 保存，并在保存失败时回滚到上一次状态。
- ExperimentalUsageBlacklistScreen.js 已保持完整应用列表读取只发生在该页面加载或右下角刷新按钮触发时。
- ExperimentalUsageBlacklistScreen.js 恢复顶部已选择数量区域的边框卡片样式，并在卡片下方新增应用名称和包名搜索栏。
- ExperimentalUsageBlacklistScreen.js 的应用列表改为按搜索结果渲染，右侧首字母快速跳转同步基于当前搜索结果计算。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录黑名单应用页的顶部卡片、搜索栏和选择实时保存行为。
- SoftwareIntroScreen.js 和 PrivacyPolicyScreen.js 已检查，本次黑名单应用页搜索栏和顶部样式调整未改变软件介绍或隐私政策口径。
- ExperimentalUsageBlacklistScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。
- git diff --check 已通过。

### 全部使用记录应用图标
- ExperimentalUsageIntervalsScreen.js 在全部记录详情中为每条使用时间段记录渲染对应黑名单应用图标。
- ExperimentalUsageIntervalsScreen.js 的使用时间段分组数据增加已保存黑名单应用对象映射，图标来源为已保存黑名单应用信息。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录全部记录详情显示应用图标。
- node --check 已通过 ExperimentalUsageIntervalsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。
- git diff --check 已通过。

### 黑名单应用列表全部已选切换
- ExperimentalUsageBlacklistScreen.js 在搜索栏下方左侧新增全部和已选两个小字切换项。
- ExperimentalUsageBlacklistScreen.js 的应用列表过滤逻辑改为同时应用搜索关键词和全部/已选切换条件。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录黑名单应用列表全部/已选切换行为。
- node --check 已通过 ExperimentalUsageBlacklistScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。
- git diff --check 已通过。

### 黑名单使用记录读取入口与范围提示
- ExperimentalUsageScreen.js 将原刷新使用记录按钮改为按日期读取记录按钮，点击后弹出起止日期选择弹窗。
- ExperimentalUsageScreen.js 的日期范围弹窗包含开始日期、结束日期、确认和取消操作，确认后读取并保存所选日期范围内的黑名单应用使用记录。
- ExperimentalUsageScreen.js 将原本的快捷刷新能力迁移为下拉刷新，下拉刷新读取最近三天的黑名单应用使用记录。
- ExperimentalUsageScreen.js 的读取完成提示从仅显示请求读取范围，修正为同时显示请求读取范围和实际读取到的记录覆盖范围。
- ExperimentalUsageScreen.js 新增基于返回使用时间段计算最早开始时间和最晚结束时间的实际记录范围逻辑，无返回记录时提示实际读取到记录为无。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录黑名单使用记录读取入口与实际范围提示口径。
- node --check 已通过 ExperimentalUsageScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。
- git diff --check 已通过。

### 黑名单读取日期选择逻辑与弹窗布局
- ExperimentalUsageScreen.js 将按日期读取记录弹窗中的起止日期选择逻辑改为跳转复用自定义统计页相同的 DatePicker 页面。
- ExperimentalUsageScreen.js 在从 DatePicker 页面返回后继续显示按日期读取记录弹窗，并保留确认和取消操作。
- ExperimentalUsageScreen.js 保留起止日期顺序校验，选择开始日期晚于结束日期或结束日期早于开始日期时提示并不更新日期。
- ExperimentalUsageScreen.js 将按日期读取记录弹窗中的起止日期框从两侧分布调整为居中靠近显示。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录黑名单读取日期选择逻辑对齐自定义统计。
- node --check 已通过 ExperimentalUsageScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。
- git diff --check 已通过。

### 黑名单时间段合并阈值调整为两分钟
- experimentalUsageStorage.js 将黑名单使用时间段合并阈值从 1 分钟调整为 2 分钟。
- ExperimentalUsageScreen.js 的读取完成提示已同步显示按 2 分钟间隔合并碎片记录。
- developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录黑名单使用时间段合并阈值为 2 分钟。
- node --check 已通过 experimentalUsageStorage.js、ExperimentalUsageScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。
- git diff --check 已通过，输出仅包含工作区文件下次 Git 触碰时 LF 将替换为 CRLF 的提示。

### 黑名单交互问题修复
- ExperimentalUsageBlacklistScreen.js 已修复首字母快速滑动条触摸跳转，刷新按钮在读取应用列表时显示旋转动画，搜索结果优先显示应用名匹配项。
- ExperimentalUsageIntervalsScreen.js 已拦截使用记录详情页的导航返回事件，使手势返回先回到使用时间段入口列表。
- ExperimentalUsageScreen.js 已将读取完成提示改为应用内弹窗，弹窗按换行和 -- 显示范围，并显示聚合后的使用时间段数量。
- UsageHelpScreen.js、VersionHistoryScreen.js 和 developer_guide.md 已同步记录黑名单交互与读取完成弹窗变化。
- develop_log.md 中的待办注释已移除。
- node --check 已通过 ExperimentalUsageBlacklistScreen.js、ExperimentalUsageScreen.js、ExperimentalUsageIntervalsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。
- git diff --check 已通过，输出仅包含工作区文件下次 Git 触碰时 LF 将替换为 CRLF 的提示。

### 黑名单读取完成弹窗时间范围修正
- ExperimentalUsageScreen.js 已将读取完成弹窗中的请求范围和实际范围从三行显示改为单行显示，并保留 -- 作为起止时间分隔符。
- node --check 已通过 ExperimentalUsageScreen.js 的语法检查。

### 黑名单应用搜索排序修正
- ExperimentalUsageBlacklistScreen.js 已将黑名单应用搜索排序调整为应用名开头匹配、应用名包含匹配、包名开头匹配、包名包含匹配的顺序。
- UsageHelpScreen.js、VersionHistoryScreen.js 和 developer_guide.md 已同步记录黑名单应用搜索开头匹配优先。
- node --check 已通过 ExperimentalUsageBlacklistScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。

### 黑名单首字母条触摸与跳转修复
- ExperimentalUsageBlacklistScreen.js 已将首字母条改为整条栏统一接管触摸响应，并移除单个字母的 TouchableOpacity 包裹。
- ExperimentalUsageBlacklistScreen.js 已将首字母条触摸处理改为 PanResponder，让点击和滑动都通过同一套位置计算跳转。
- ExperimentalUsageBlacklistScreen.js 已为首字母条设置明确触摸宽度、zIndex 和 elevation，减少应用列表层截获触摸的影响。
- ExperimentalUsageBlacklistScreen.js 已在首字母条滑动时使用 gestureState.moveY 计算触摸位置，减少子视图局部坐标导致的跳转失效。
- ExperimentalUsageBlacklistScreen.js 已让首字母条触摸容器使用 pointerEvents box-only，避免内部文字节点成为触摸目标。
- ExperimentalUsageBlacklistScreen.js 已为应用列表行设置固定高度并使用 scrollToOffset 执行首字母跳转。
- ExperimentalUsageBlacklistScreen.js 已取消首字母条触摸命中的屏幕绝对坐标换算，改为使用外层字母栏本地坐标减去内部字母组顶部偏移，保持触摸命中精度并避免首字母上方误命中末尾字母。
- ExperimentalUsageBlacklistScreen.js 已通过 node --check 语法检查。
- 已使用 @babel/parser 对 ExperimentalUsageBlacklistScreen.js 执行 JSX 语法解析检查，结果通过。

### 黑名单首字母条布局与高亮调整
- ExperimentalUsageBlacklistScreen.js 已关闭 FlatList 原生纵向滚动指示器，避免右侧滚动条与首字母条触摸区域重叠。
- ExperimentalUsageBlacklistScreen.js 已将应用列表和首字母条从覆盖布局调整为真实左右布局，又将首字母快速滑动条移出应用列表横向布局并绝对定位在屏幕右侧边缘。
- ExperimentalUsageBlacklistScreen.js 已让应用列表框使用与顶部已选择状态框和搜索框一致的左右边距。
- ExperimentalUsageBlacklistScreen.js 已将首字母条宽度逐步收紧为 18px，并移除首字母条与应用列表之间的额外左侧间距。
- ExperimentalUsageBlacklistScreen.js 已为首字母快速滑动条新增当前触碰字母状态，并在字母条按下和滑动时高亮当前命中字母。
- ExperimentalUsageBlacklistScreen.js 已将字母条触碰高亮清除改为松手后延迟 220ms 执行，并在新的字母条触碰开始时清除旧的高亮延迟计时。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录黑名单应用列表框与上方区域同宽、字母条位于列表框外侧和触碰高亮行为。
- ExperimentalUsageBlacklistScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。

### 黑名单应用拼音混排实现
- ExperimentalUsageBlacklistScreen.js 已将黑名单应用列表改为按 A-Z 与末尾 # 分段排序。
- ExperimentalUsageBlacklistScreen.js 已通过中文拼音首字母将中文应用名归入对应 A-Z 字母段。
- ExperimentalUsageBlacklistScreen.js 已让首字母快速滑动条使用同一套分段结果生成跳转索引，使中文应用可通过对应拼音首字母跳转。

### 黑名单应用拼音混排文档同步
- AGENTS.md 已记录黑名单应用列表中英文按拼音首字母混排且 # 位于末尾的页面规则。
- developer_guide.md 已同步记录黑名单应用列表拼音混排和 # 分组规则。
- UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步面向用户记录黑名单应用列表拼音混排和 # 位于末尾的行为。
- 已使用 @babel/parser 对 ExperimentalUsageBlacklistScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 执行 JSX 语法解析检查，结果通过。
- 已使用 Node 验证微信、支付宝、哔哩哔哩、百度、钉钉、知乎与英文应用名的首字母分组和排序示例，结果符合拼音首字母分段。
- git diff --check 已通过，输出仅包含工作区文件下次 Git 触碰时 LF 将替换为 CRLF 的提示。

### 黑名单应用刷新动画修复
- src/screens/ExperimentalUsageBlacklistScreen.js 已在强制刷新应用列表前等待刷新按钮动画帧提交，避免耗时读取立即阻塞转动显示。
- src/screens/VersionHistoryScreen.js 已在 Unreleased 修复记录中补充黑名单应用页刷新按钮转动不及时的问题。
- SoftwareIntroScreen.js、UsageHelpScreen.js、PrivacyPolicyScreen.js、developer_guide.md 和 AGENTS.md 已检查，当前描述与本次修复后的功能事实一致，无需修改。
- src/screens/ExperimentalUsageBlacklistScreen.js 和 src/screens/VersionHistoryScreen.js 已通过 node --check 语法检查。
- android/app/src/main/java/com/ltongg/MinimalistWeaponEnhancementCalendar/UsageAccessModule.kt 已将 getLaunchableApplications 的应用扫描、图标转换和主色提取放入后台线程执行。
- npm run android:install:debug:tempmap 首次在沙箱内因 subst 映射权限失败，随后经授权按临时短路径映射流程完成 Debug 构建安装。
- Android Debug 安装已通过 npm run android:install:debug:tempmap 安装到 AVD_2560x1600。

### 黑名单使用时间段日期汇总时长
- src/screens/ExperimentalUsageIntervalsScreen.js 已在使用时间段日期分组中累计当日使用时长，并在日期标题右侧显示汇总时长。
- src/screens/UsageHelpScreen.js、src/screens/VersionHistoryScreen.js 和 developer_guide.md 已同步记录黑名单使用时间段日期标题显示当日合计时长。
- SoftwareIntroScreen.js、PrivacyPolicyScreen.js 和 AGENTS.md 已检查，当前描述与本次界面改动事实一致，无需修改。
- ExperimentalUsageIntervalsScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js 已通过 node --check 语法检查。

### 黑名单定时刷新实质存储
- UsageAccessScheduler.refreshUsageStats 已改为读取已保存黑名单应用并按最近三天范围查询使用时间段。
- UsageAccessScheduler.refreshUsageStats 已将查询到的黑名单应用使用时间段合并去重后写入 experimental_usage_intervals 本地存储。
- UsageAccessScheduler.clearStoredUsageRecords 已同步删除 experimental_usage_intervals 本地存储。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录晚间定时刷新会保存最近三天黑名单使用时间段。
- node --check 已通过 UsageHelpScreen.js 和 VersionHistoryScreen.js 的语法检查。
- git diff --check 已通过，输出仅包含工作区文件下次 Git 触碰时 LF 将替换为 CRLF 的提示。
- npm run android:build:debug:tempmap 已完成 Debug 构建验证。
- UsageAccessRefreshReceiver 已将定时刷新广播中的使用记录读取与本地写入放入后台线程执行。
- UsageAccessRefreshReceiver 已使用 goAsync 在后台刷新完成后结束广播处理。
- npm run android:build:debug:tempmap 已在定时刷新广播后台执行改动后完成 Debug 构建验证。
- npm run android:install:debug:tempmap 已将包含定时刷新实质存储改动的 Debug 包安装到 emulator-5554。

### 黑名单存储工具冗余函数清理
- src/utils/experimentalUsageStorage.js 已移除未被调用的 hasExperimentalUsageBlacklistChanged 导出函数。
- node --check 已通过 src/utils/experimentalUsageStorage.js 的语法检查。

### 黑名单应用元数据补齐落库
- ExperimentalUsageBlacklistScreen.js 已在进入黑名单应用设置页读取应用列表后，比对已保存黑名单与补齐图标/主色后的黑名单数据。
- ExperimentalUsageBlacklistScreen.js 已在检测到已保存黑名单缺少或落后于当前图标/主色数据时，调用 setExperimentalUsageBlacklist 写回补齐后的黑名单数据。
- node --check 已通过 src/screens/ExperimentalUsageBlacklistScreen.js 的语法检查。

### 黑名单元数据同步逻辑收口
- src/utils/experimentalUsageStorage.js 已新增 syncExperimentalUsageBlacklistMetadata，用于统一执行黑名单应用图标和主色补齐、差异判断与必要写回。
- src/utils/experimentalUsageStorage.js 已将 hydrateExperimentalUsageBlacklist 与黑名单差异判断收口为模块内部实现，不再由页面直接组合调用。
- ExperimentalUsageBlacklistScreen.js 已改为调用 syncExperimentalUsageBlacklistMetadata 获取已补齐并落库后的黑名单数据。
- node --check 已通过 src/utils/experimentalUsageStorage.js 和 src/screens/ExperimentalUsageBlacklistScreen.js 的语法检查。

### 更新换行符处理协作规则
- 已在 AGENTS.md 将换行符协作规则更新为处理文本文件时默认换行符可能不符合要求，不再先检查确认，直接统一修正为 CRLF。
- 已在 AGENTS.md 将换行符处理范围从文本文件澄清为文本类文件，包含代码、配置和文档等文件。

### 黑名单应用列表刷新加载动画调整
- src/screens/ExperimentalUsageBlacklistScreen.js 已移除右下角刷新按钮自身旋转动画。
- src/screens/ExperimentalUsageBlacklistScreen.js 已将首次读取和手动刷新统一为列表区域加载动画。
- AGENTS.md、developer_guide.md、UsageHelpScreen.js 和 VersionHistoryScreen.js 已同步记录黑名单应用列表刷新加载行为。
- 已执行 node --check 检查 ExperimentalUsageBlacklistScreen.js、UsageHelpScreen.js 和 VersionHistoryScreen.js，结果通过。

### 黑名单首字母条滑出命中修复
- src/screens/ExperimentalUsageBlacklistScreen.js 已将首字母条 PanResponder 从外层定位栏移动到内部字母组。
- src/screens/ExperimentalUsageBlacklistScreen.js 已改为在触摸开始时记录字母组本地纵向坐标与手指起始纵向坐标。
- src/screens/ExperimentalUsageBlacklistScreen.js 已在拖动过程中用手指纵向位移推算字母组本地坐标，避免拖出字母组后继续使用不稳定的移动事件 locationY。
- src/screens/ExperimentalUsageBlacklistScreen.js 已将外层首字母定位栏 pointerEvents 调整为 box-none，并让字母项不作为触摸目标。
- src/screens/VersionHistoryScreen.js 已在 Unreleased 修复记录中补充黑名单应用页首字母条从内部滑出后误跳到错误字母的问题。

### Rename usage code files
- 与使用记录相关的代码文件已重命名，文件名移除了 Experimental/experimental 前缀。
- App.js 导入路径与 developer_guide.md 项目结构已更新为新文件名。
- App.js、src 与 developer_guide.md 已验证无旧 experimental 前缀代码文件名或旧文件路径引用。

### 版本记录 Unreleased 内容整理
- src/screens/VersionHistoryScreen.js 已将 Unreleased 条目整理为面向用户的最终态描述，并移除黑名单功能同版本内的修复和优化拆分，改为新增功能最终态描述。
- src/screens/VersionHistoryScreen.js 已将各版本节点的版本记录分组顺序调整为新增、修复、优化。
- 已使用 @babel/parser 对 VersionHistoryScreen.js 执行 JSX 解析检查，结果通过。
- git diff --check 已通过。

### 版本记录规则文档化
- AGENTS.md 已补充版本记录不是开发日志、Unreleased 与正式版本同口径、同一版本新增功能不拆写同版本优化或修复的规则。
- AGENTS.md 已记录版本记录页面按新增、修复、优化分组展示的持久规则。
- developer_guide.md 已同步补充版本记录相对上一版本最终变化、开发过程内容归入 develop_log.md、版本记录按新增、修复、优化分组展示的规则。
- 通过 scripts/append-develop-log.ps1 的 -Command 调用方式已验证 Facts 数组可按多条事实逐条追加。

### 当前开发版本功能简介调整
- src/screens/VersionHistoryScreen.js 已将当前开发版本的使用记录辅助与黑名单功能改为同级功能简介段。
- src/screens/VersionHistoryScreen.js 已移除新增、修复、优化分组中对使用记录辅助与黑名单功能的重复条目。
- src/screens/VersionHistoryScreen.js 已将当前开发版本中使用记录辅助与黑名单功能的简介扩展为多条完整能力说明。
- AGENTS.md 和 developer_guide.md 已修正 Unreleased 规则：Unreleased 本身不天然作为特殊版本，只有当前开发版本有明确主功能时才使用同级功能简介。
