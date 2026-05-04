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
- SettingsScreen 中新增独立 handleShare 流程，分享不再由导出按钮兜底触发。,设置页按钮从导入/导出两按钮改为导入-导出-分享三按钮横排等宽布局，导出位于中间、分享位于右侧。,分享按钮图标已使用 Ionicons 的 share-social-outline，点击后执行系统分享流程。

### 开发者文档与当前实现对齐
- 已更新 `developer_guide.md`，将数据模型从旧位掩码结构改为当前软件内使用的新格式对象结构。
- 已在文档中明确旧格式仅保留读取迁移和导入兼容，导出始终输出新格式。
- 已在文档中注明月视图和年视图暂不纳入“多次记录功能”的表层改动范围。
- 已补充文档回归建议，覆盖新格式自动迁移、旧格式导入转换、新格式导出与日视图读写一致性。

## 2026-05-03

### Bare workflow runtimeVersion 配置修复
- 已将 app.json 中 ios.runtimeVersion 与 android.runtimeVersion 从 policy=appVersion 改为固定字符串 1.1.1。,本次改动用于兼容 bare workflow 下 EAS Update 需要手动设置 runtimeVersion 的约束。

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

### 每日多次记录交互验证
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

### 关于页子页面第二阶段验证
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

### 自定义统计跨年月聚合修复验证
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

### 统计表行标题对齐最终验证
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

### 自定义统计图横轴聚合显示验证
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

### 自定义统计图聚合点触摸横轴显示验证
- 已使用 Babel parser 解析 src/components/CustomLineChart.js、src/components/LineChartBase.js 和 src/screens/VersionHistoryScreen.js，结果通过。
- 已执行临时 Node 脚本确认 2026-03-20 至 2026-05-02 共 44 天按 4 天一组聚合时，触摸区间标签包含首组 2026-03-20 至 2026-03-23、第二组 2026-03-24 至 2026-03-27、末组 2026-04-29 至 2026-05-02。
- 首次执行 develop_log.md 追加脚本时因 PowerShell 数组参数写法错误失败，develop_log.md 未写入内容；已改用显式数组语法成功追加日志。

### 自定义统计图触摸区间标签防重叠实现
- src/components/LineChartBase.js 已将触摸态聚合区间的横轴刻度位置与文字标签位置分离。
- src/components/LineChartBase.js 已在触摸态聚合区间起止标签距离不足时按估算文字宽度自适应分散标签。
- src/components/LineChartBase.js 已实现首个聚合区间仅移动终点标签、末个聚合区间仅移动起点标签、中间聚合区间两侧标签共同分散。
- src/screens/VersionHistoryScreen.js 的 Unreleased 节点已更新自定义统计图聚合点触摸横轴区间显示说明。
- developer_guide.md 已记录自定义统计图聚合区间标签防重叠规则。

### 自定义统计图触摸区间标签防重叠验证
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
- 关于页在使用帮助和版本记录之间新增了隐私政策入口。,新增 PrivacyPolicyScreen 页面，说明应用记录数据范围、本地存储、导入导出分享、权限联网和用户控制方式。,使用帮助、版本记录和开发者文档同步补充了隐私政策相关说明。,验证结果：Babel 解析 App.js 和相关 screen 文件通过；git diff --check 通过。

### 关于页隐私政策入口与页面新增补充记录
- 关于页在使用帮助和版本记录之间新增了隐私政策入口。
- 新增 PrivacyPolicyScreen 页面，说明应用记录数据范围、本地存储、导入导出分享、权限联网和用户控制方式。
- 使用帮助、版本记录和开发者文档同步补充了隐私政策相关说明。
- 验证结果：Babel 解析 App.js 和相关 screen 文件通过；git diff --check 通过。
- 前一次开发日志追加时，多条事实被命令行参数合并为一条逗号串联的记录。
