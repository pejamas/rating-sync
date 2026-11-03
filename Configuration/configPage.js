define(['baseView', 'loading', 'toast', 'emby-input', 'emby-button', 'emby-select', 'emby-checkbox'],
function (BaseView, loading, toast) {
    'use strict';

    var pluginId = '1770753c-43e9-4454-9782-2c3b44ac06ce';

    var LOCALE_ZH = 'zh-CN';
    var LOCALE_EN = 'en-US';
    var _lang = null;

    var STRINGS = {
        'en-US': {
            'api.unavailable': 'API usage unavailable',
            'api.imdbFallbackLabel': 'IMDb fallback: ',
            'api.usageOn': 'API usage — {date} (resets 00:00 UTC)',
            'api.usageToday': 'API usage — today (resets 00:00 UTC)',
            'api.usage': 'API usage (resets 00:00 UTC)',
            'toast.missingSessionId': 'Missing SessionId',
            'toast.deleteConfirm': 'Delete this scan? This cannot be undone.',
            'toast.scanDeleted': 'Scan deleted',
            'toast.deleteFailed': 'Failed to delete scan',
            'toast.configLoad': 'Error loading configuration',
            'toast.configSave': 'Error saving configuration',
            'toast.saved': 'Settings saved successfully!',
            'toast.noKeys': 'Configure an OMDb/MDBList key or enable IMDb ratings fallback in Settings.',
            'toast.noItemTypes': 'Please enable at least one item type in Settings.',
            'toast.alreadyRunning': 'A rating sync is already running.',
            'toast.taskNotFound': 'Task not found - restart Emby Server',
            'toast.failedStart': 'Failed to start task: {err}',
            'toast.failedQueueSelected': 'Failed to queue selected items. Full library scan was not started.',
            'toast.selectItemFirst': 'Select an item first.',
            'toast.unsupportedType': 'Unsupported item type: {type}',
            'toast.failedQueueOne': 'Failed to queue selected item: {err}',
            'toast.reportUnavailable': 'Report not available for this scan',
            'toast.downloadFailed': 'Failed to download report',
            'toast.noReportToCopy': 'No report to copy',
            'toast.clipboardUnavailable': 'Clipboard not available in this environment',
            'toast.reportCopied': 'Report copied',
            'toast.copyFailed': 'Failed to copy report',
            'del.missingSessionId': 'Missing SessionId',
            'del.notFound': 'Scan not found',
            'del.inProgress': 'Cannot delete a scan that is still in progress',
            'del.deleted': 'Scan deleted',
            'del.failed': 'Failed to delete scan',
            'opt.allLibraries': 'All Libraries',
            'opt.allSeries': 'All Series',
            'opt.allSeasons': 'All Seasons',
            'opt.allEpisodes': 'All Episodes',
            'opt.allMovies': 'All Movies',
            'opt.episodeCount': '({n} episodes)',
            'time.hms': '{h}h {m}m {s}s',
            'time.hm': '{h}h {m}m',
            'time.ms': '{m}m {s}s',
            'time.s': '{s}s',
            'list.noUpdated': 'No items updated yet',
            'list.noSkipped': 'No items skipped yet',
            'list.noFailures': 'No failures',
            'list.showingLatest': 'Showing latest {shown} of {total}',
            'progress.smartSkipped': 'Smart-skipped {n} item(s) before this scan',
            'progress.elapsed': 'Elapsed: {time}',
            'ui.runningCount': 'Running ({done}/{total})',
            'ui.starting': 'Starting...',
            'ui.alreadyRunning': 'Already running',
            'ui.failedToStart': 'Failed to start',
            'ui.taskNotFound': 'Task not found',
            'ui.queuingSelected': 'Queuing selected items...',
            'ui.queuingSelectedOne': 'Queuing selected item...',
            'ui.queueFailed': 'Queue failed',
            'ui.queueFailedOne': 'Failed to queue',
            'ui.unsupportedType': 'Unsupported item type',
            'ui.cancelledWith': 'Cancelled — {n} updated',
            'ui.completedWith': 'Completed! {n} updated',
            'ui.skippedSuffix': ', {n} skipped',
            'ui.errorsSuffix': ', {n} errors',
            'ui.cancelling': 'Cancelling...',
            'ui.cancelled': 'Cancelled',
            'ui.ready': 'Ready',
            'ui.running': 'Running...',
            'ui.lastRun': 'Last run: {status}',
            'ui.lastRunCancelled': 'Last run cancelled: {status}',
            'ui.runSummary': '{u} updated, {s} skipped',
            'ui.inProgress': 'In progress',
            'ui.inProgressDots': 'In progress...',
            'history.loading': 'Loading scan history...',
            'history.empty': 'No scan history yet. Run a scan to see history here.',
            'history.error': 'Error loading scan history.',
            'history.total': 'Total: ',
            'history.updated': 'Updated: ',
            'history.skipped': 'Skipped: ',
            'history.errors': 'Errors: ',
            'history.delete': 'Delete',
            'history.viewReport': 'View report',
            'history.cancelledSuffix': ' (Cancelled)',
            'report.title': 'Scan Report',
            'report.titleWithDate': 'Scan Report — {date}',
            'report.loading': 'Loading scan report...',
            'report.noData': 'No report data found.',
            'report.legacy': '<strong>Legacy scan:</strong> this scan ran before detailed reports were enabled, so only limited info may be available.',
            'report.searchPlaceholder': 'Search (name or details)…',
            'report.perPage': '{n} / page',
            'report.downloadJson': 'Download JSON',
            'report.overview': 'Overview',
            'report.updated': 'Updated',
            'report.skipped': 'Skipped',
            'report.errors': 'Errors',
            'report.updatedItems': 'Updated Items',
            'report.skippedItems': 'Skipped Items',
            'report.byType': 'Updated — by type',
            'report.bySource': 'Updated — by source',
            'report.topSkip': 'Skipped — top reasons',
            'report.topErrors': 'Errors — top messages',
            'report.noDataChip': 'No data.',
            'report.showing': 'Showing {from}-{to} of {total}',
            'report.prev': 'Prev',
            'report.next': 'Next',
            'report.noItems': 'No items.',
            'report.started': 'Started',
            'report.finished': 'Finished',
            'report.duration': 'Duration',
            'report.processed': 'Processed',
            'report.omdbCalls': 'OMDb calls',
            'report.mdbCalls': 'MDBList calls',
            'report.imdbFallback': 'IMDb fallback',
            'report.status': 'Status',
            'report.typeBoth': 'IMDb + RT',
            'report.typeImdb': 'IMDb only',
            'report.typeRt': 'RT only',
            'report.typeOther': 'Other',
            'report.unknown': 'Unknown',
            'report.statusCompleted': 'Completed',
            'report.statusCompletedWithErrors': 'Completed with errors',
            'copy.title': 'Rating Sync - Scan Report',
            'copy.started': 'Started: ',
            'copy.finished': 'Finished: ',
            'copy.total': 'Total: ',
            'copy.processed': 'Processed: ',
            'missing.searching': 'Searching for items with missing data...',
            'missing.none': 'No items found with missing data. Great job!',
            'missing.error': 'Error searching for missing data.',
            'missing.noMatch': 'No items match the selected filters.',
            'missing.colName': 'Name',
            'missing.colSeries': 'Series',
            'missing.colSeason': 'Season',
            'missing.colType': 'Type',
            'missing.colImdb': 'IMDb ID',
            'missing.colCommunity': 'Community Rating',
            'missing.colCritic': 'Critic Rating',
            'missing.colIssue': 'Issue',
            'missing.showing': 'Showing {n} items (max 500)',
            'itemhist.loading': 'Searching item history...',
            'itemhist.none': 'No items found matching "{q}".',
            'itemhist.error': 'Error searching item history.',
            'itemhist.colName': 'Name',
            'itemhist.colType': 'Type',
            'itemhist.colLastScanned': 'Last Scanned',
            'itemhist.colCurrent': 'Current Rating',
            'itemhist.colLastChange': 'Last Change',
            'type.movie': 'Movie',
            'type.series': 'Series',
            'type.episode': 'Episode',
            'type.unknown': 'Unknown',
            'confirm.deleteScan': 'Delete this scan? This cannot be undone.',
            'toast.loadConfigFailed': 'Error loading configuration',
            'toast.saveConfigFailed': 'Error saving configuration',
            'toast.scanNotStarted': 'Scan not started. Check your selection and whether another scan is running.',
            'list.alreadyCurrent': 'Already current',
            'list.missingMetadata': 'Missing metadata',
            'list.ratingUnavailable': 'Rating unavailable',
            'list.details': 'Details',
            'list.colTitle': 'Title',
            'ui.runningProgress': 'Running ({done}/{total})',
            'ui.elapsedPrefix': 'Elapsed: ',
            'ui.chooseLibrary': 'Choose a library first',
            'ui.couldNotStart': 'Could not start scan',
            'ui.connectionInterrupted': 'Connection interrupted. Retrying…',
            'ui.scopeInfoTarget': 'Choose a library, then narrow to a show, season, episode or movie. Selected items bypass smart-scan rules.',
            'ui.scopeInfoSaved': 'Uses your saved item types and smart-scan rules.',
            'ui.unsupportedTypePrefix': 'Unsupported item type: ',
            'history.running': 'Running',
            'history.stopped': 'Stopped',
            'history.needsAttention': 'Needs attention',
            'history.complete': 'Complete',
            'history.updatedUnit': 'updated',
            'history.errorsUnit': 'errors',
            'history.noChanges': 'No changes',
            'history.ratingScan': 'Rating scan',
            'scope.entireLibrary': 'Entire library',
            'scope.selectedItems': 'Selected items ({n})',
            'history.processedUnit': 'processed',
            'history.skippedUnit': 'skipped',
            'history.view': 'View',
            'history.started': 'Started',
            'history.result': 'Result',
            'history.changes': 'Changes',
            'history.duration': 'Duration',
            'history.noMatch': 'No scans match this filter.',
            'report.result': 'Result',
            'report.colRating': 'Rating',
            'report.colBefore': 'Before',
            'report.colAfter': 'After',
            'report.colSource': 'Source',
            'report.scanDetails': 'Scan details and API usage',
        },

        'zh-CN': {
            'api.unavailable': 'API 用量不可用',
            'api.imdbFallbackLabel': 'IMDb 回退：',
            'api.usageOn': 'API 用量 — {date}（UTC 00:00 重置）',
            'api.usageToday': 'API 用量 — 今天（UTC 00:00 重置）',
            'api.usage': 'API 用量（UTC 00:00 重置）',
            'toast.missingSessionId': '缺少 SessionId',
            'toast.deleteConfirm': '确定删除这条扫描记录？此操作不可撤销。',
            'toast.scanDeleted': '扫描记录已删除',
            'toast.deleteFailed': '删除扫描记录失败',
            'toast.configLoad': '加载配置失败',
            'toast.configSave': '保存配置失败',
            'toast.saved': '设置已保存！',
            'toast.noKeys': '请先在设置中填写 OMDb / MDBList 密钥，或启用 IMDb 评分回退。',
            'toast.noItemTypes': '请先在设置中至少启用一种项目类型。',
            'toast.alreadyRunning': '已有评分同步任务在运行。',
            'toast.taskNotFound': '未找到任务 - 请重启 Emby 服务器',
            'toast.failedStart': '启动任务失败：{err}',
            'toast.failedQueueSelected': '所选项目加入队列失败，未启动全库扫描。',
            'toast.selectItemFirst': '请先选择一个项目。',
            'toast.unsupportedType': '不支持的项目类型：{type}',
            'toast.failedQueueOne': '所选项目加入队列失败：{err}',
            'toast.reportUnavailable': '本次扫描没有可用报告',
            'toast.downloadFailed': '下载报告失败',
            'toast.noReportToCopy': '没有可复制的报告',
            'toast.clipboardUnavailable': '当前环境不支持剪贴板',
            'toast.reportCopied': '报告已复制',
            'toast.copyFailed': '复制报告失败',
            'del.missingSessionId': '缺少 SessionId',
            'del.notFound': '未找到该扫描记录',
            'del.inProgress': '无法删除仍在进行中的扫描',
            'del.deleted': '扫描记录已删除',
            'del.failed': '删除扫描记录失败',
            'opt.allLibraries': '全部媒体库',
            'opt.allSeries': '全部剧集',
            'opt.allSeasons': '全部季',
            'opt.allEpisodes': '全部单集',
            'opt.allMovies': '全部电影',
            'opt.episodeCount': '（{n} 集）',
            'time.hms': '{h} 时 {m} 分 {s} 秒',
            'time.hm': '{h} 时 {m} 分',
            'time.ms': '{m} 分 {s} 秒',
            'time.s': '{s} 秒',
            'list.noUpdated': '暂无已更新项目',
            'list.noSkipped': '暂无已跳过项目',
            'list.noFailures': '无失败项',
            'list.showingLatest': '仅显示最近 {shown} 条，共 {total} 条',
            'progress.smartSkipped': '本次扫描前已智能跳过 {n} 个项目',
            'progress.elapsed': '已用时：{time}',
            'ui.runningCount': '运行中（{done}/{total}）',
            'ui.starting': '正在启动…',
            'ui.alreadyRunning': '已在运行',
            'ui.failedToStart': '启动失败',
            'ui.taskNotFound': '未找到任务',
            'ui.queuingSelected': '正在加入所选项目…',
            'ui.queuingSelectedOne': '正在加入所选项目…',
            'ui.queueFailed': '加入队列失败',
            'ui.queueFailedOne': '加入队列失败',
            'ui.unsupportedType': '不支持的项目类型',
            'ui.cancelledWith': '已取消 — 更新 {n} 项',
            'ui.completedWith': '已完成！更新 {n} 项',
            'ui.skippedSuffix': '，跳过 {n} 项',
            'ui.errorsSuffix': '，错误 {n} 项',
            'ui.cancelling': '正在取消…',
            'ui.cancelled': '已取消',
            'ui.ready': '就绪',
            'ui.running': '运行中…',
            'ui.lastRun': '上次运行：{status}',
            'ui.lastRunCancelled': '上次运行已取消：{status}',
            'ui.runSummary': '更新 {u} 项，跳过 {s} 项',
            'ui.inProgress': '进行中',
            'ui.inProgressDots': '进行中…',
            'history.loading': '正在加载扫描历史…',
            'history.empty': '暂无扫描历史。运行一次扫描后即可在此查看。',
            'history.error': '加载扫描历史失败。',
            'history.total': '总计：',
            'history.updated': '已更新：',
            'history.skipped': '已跳过：',
            'history.errors': '错误：',
            'history.delete': '删除',
            'history.viewReport': '查看报告',
            'history.cancelledSuffix': '（已取消）',
            'report.title': '扫描报告',
            'report.titleWithDate': '扫描报告 — {date}',
            'report.loading': '正在加载扫描报告…',
            'report.noData': '未找到报告数据。',
            'report.legacy': '<strong>历史扫描：</strong>该次扫描早于详细报告功能上线，可能只有有限信息。',
            'report.searchPlaceholder': '搜索（名称或明细）…',
            'report.perPage': '每页 {n} 条',
            'report.downloadJson': '下载 JSON',
            'report.overview': '概览',
            'report.updated': '已更新',
            'report.skipped': '已跳过',
            'report.errors': '错误',
            'report.updatedItems': '已更新项目',
            'report.skippedItems': '已跳过项目',
            'report.byType': '已更新 — 按类型',
            'report.bySource': '已更新 — 按数据源',
            'report.topSkip': '已跳过 — 主要原因',
            'report.topErrors': '错误 — 主要信息',
            'report.noDataChip': '暂无数据。',
            'report.showing': '显示第 {from}-{to} 条，共 {total} 条',
            'report.prev': '上一页',
            'report.next': '下一页',
            'report.noItems': '暂无项目。',
            'report.started': '开始时间',
            'report.finished': '结束时间',
            'report.duration': '耗时',
            'report.processed': '已处理',
            'report.omdbCalls': 'OMDb 调用',
            'report.mdbCalls': 'MDBList 调用',
            'report.imdbFallback': 'IMDb 回退',
            'report.status': '状态',
            'report.typeBoth': 'IMDb + 烂番茄',
            'report.typeImdb': '仅 IMDb',
            'report.typeRt': '仅烂番茄',
            'report.typeOther': '其他',
            'report.unknown': '未知',
            'report.statusCompleted': '已完成',
            'report.statusCompletedWithErrors': '已完成（有错误）',
            'copy.title': '评分同步 - 扫描报告',
            'copy.started': '开始：',
            'copy.finished': '结束：',
            'copy.total': '总计：',
            'copy.processed': '已处理：',
            'missing.searching': '正在搜索数据缺失的项目…',
            'missing.none': '没有发现数据缺失的项目，很完美！',
            'missing.error': '搜索缺失数据失败。',
            'missing.noMatch': '没有符合当前筛选条件的项目。',
            'missing.colName': '名称',
            'missing.colSeries': '剧集',
            'missing.colSeason': '季',
            'missing.colType': '类型',
            'missing.colImdb': 'IMDb ID',
            'missing.colCommunity': '社区评分',
            'missing.colCritic': '影评人评分',
            'missing.colIssue': '问题',
            'missing.showing': '共显示 {n} 个项目（最多 500）',
            'itemhist.loading': '正在搜索项目历史…',
            'itemhist.none': '未找到匹配「{q}」的项目。',
            'itemhist.error': '搜索项目历史失败。',
            'itemhist.colName': '名称',
            'itemhist.colType': '类型',
            'itemhist.colLastScanned': '上次扫描',
            'itemhist.colCurrent': '当前评分',
            'itemhist.colLastChange': '上次变更',
            'type.movie': '电影',
            'type.series': '剧集',
            'type.episode': '单集',
            'type.unknown': '未知',
            'confirm.deleteScan': '确定删除此次扫描？此操作无法撤销。',
            'toast.loadConfigFailed': '加载配置失败',
            'toast.saveConfigFailed': '保存配置失败',
            'toast.scanNotStarted': '扫描未启动。请检查你的选择，以及是否已有扫描在运行。',
            'list.alreadyCurrent': '已是最新',
            'list.missingMetadata': '缺少元数据',
            'list.ratingUnavailable': '无评分数据',
            'list.details': '详情',
            'list.colTitle': '标题',
            'ui.runningProgress': '运行中（{done}/{total}）',
            'ui.elapsedPrefix': '已用时：',
            'ui.chooseLibrary': '请先选择一个媒体库',
            'ui.couldNotStart': '无法启动扫描',
            'ui.connectionInterrupted': '连接中断，正在重试…',
            'ui.scopeInfoTarget': '先选择媒体库，再缩小到剧集、季、单集或电影。所选项目将跳过智能扫描规则。',
            'ui.scopeInfoSaved': '使用已保存的项目类型与智能扫描规则。',
            'ui.unsupportedTypePrefix': '不支持的项目类型：',
            'history.running': '运行中',
            'history.stopped': '已停止',
            'history.needsAttention': '需处理',
            'history.complete': '已完成',
            'history.updatedUnit': '项更新',
            'history.errorsUnit': '项错误',
            'history.noChanges': '无变更',
            'history.ratingScan': '评分扫描',
            'scope.entireLibrary': '整个媒体库',
            'scope.selectedItems': '所选项目（{n}）',
            'history.processedUnit': '项已处理',
            'history.skippedUnit': '项已跳过',
            'history.view': '查看',
            'history.started': '开始时间',
            'history.result': '结果',
            'history.changes': '变更',
            'history.duration': '耗时',
            'history.noMatch': '没有符合此筛选条件的扫描。',
            'report.result': '结果',
            'report.colRating': '评分项',
            'report.colBefore': '原值',
            'report.colAfter': '新值',
            'report.colSource': '来源',
            'report.scanDetails': '扫描详情与 API 用量',
        }
    };

    // English source text in configPage.html -> Chinese. Longest keys first is
    // not required (exact trimmed match), but fragment keys must be exact.
    var STATIC_ZH = {
        'Settings': '设置',
        'Run': '运行',
        'History': '历史',
        'Loading API usage…': '正在加载 API 用量…',
        'API Keys': 'API 密钥',
        'Get free API keys to enable rating updates:': '获取免费 API 密钥以启用评分更新：',
        'Get free key': '获取免费密钥',
        'OMDb API Key': 'OMDb API 密钥',
        'API key for OMDb (http://www.omdbapi.com)': 'OMDb 的 API 密钥（http://www.omdbapi.com）',
        'MDBList API Key': 'MDBList API 密钥',
        'API key for MDBList (https://mdblist.com)': 'MDBList 的 API 密钥（https://mdblist.com）',
        'Rating Options': '评分选项',
        'Preferred Rating Source': '首选评分数据源',
        'OMDb (fallback to MDBList)': 'OMDb（无结果时回退 MDBList）',
        'MDBList (fallback to OMDb)': 'MDBList（无结果时回退 OMDb）',
        'Both (OMDb first, then MDBList for gaps)': '两者（先用 OMDb，缺失项再用 MDBList）',
        "Choose which source to prioritize. If a rating isn't found, the other source will be tried.": '选择优先使用哪个数据源。若未找到评分，会尝试另一个数据源。',
        'Update Critic Rating (Rotten Tomatoes)': '更新影评人评分（烂番茄）',
        'When enabled, also updates the critic rating with Rotten Tomatoes scores.': '启用后会同时用烂番茄评分更新影评人评分。',
        'Item Types to Update': '要更新的项目类型',
        'Select which types of media to update ratings for:': '选择要为哪些媒体类型更新评分：',
        'Movies': '电影',
        'TV Series': '剧集',
        'TV Episodes': '单集',
        'Note:': '注意：',
        'Episodes use OMDb and/or the IMDb ratings fallback (MDBList does not support episode lookups). Enabling episodes increases API/dataset work.': '单集使用 OMDb 和/或 IMDb 评分回退（MDBList 不支持单集查询）。启用单集会增加 API / 数据集的请求量。',
        'Enable IMDb ratings fallback when primary APIs return no community rating': '当主要 API 未返回社区评分时，启用 IMDb 评分回退',
        'Uses IMDb’s free official ratings dataset (': '使用 IMDb 免费官方评分数据集（',
        ', refreshed about daily, no API key). Also tries a direct title-page lookup when possible. Applies to movies, series, and episodes.': '，约每日更新，无需 API Key）。在可能时还会直接查询标题页面。适用于电影、剧集和单集。',
        'API Rate Limiting': 'API 速率限制',
        'Configure rate limits based on your API subscription tiers:': '根据你的 API 订阅等级配置速率限制：',
        'Enable daily limit': '启用每日上限',
        'Daily Limit': '每日上限',
        'Free tier: 1,000/day': '免费额度：1,000 次/天',
        'Smart Scanning': '智能扫描',
        'Optimize scanning to focus on new content and avoid redundant API calls:': '优化扫描策略，聚焦新内容并避免重复的 API 请求：',
        'Rescan Interval (Days)': '重扫间隔（天）',
        'Skip items that have been scanned within this many days. Default: 30': '跳过在此天数内已扫描过的项目。默认：30',
        'Prioritize Recently Added Content': '优先处理最近添加的内容',
        'Recently Added Period (Days)': '最近添加时间范围（天）',
        'Items added within this period are processed first. Default: 7': '在此时间范围内添加的项目会优先处理。默认：7',
        'Only Scan Unrated Items': '仅扫描未评分项目',
        'When enabled, skips items that already have a community rating.': '启用后跳过已有社区评分的项目。',
        'Tip:': '提示：',
        'With a free API tier (1,000 requests/day), a library of 5,000 items would take ~5 days for a full scan. Smart scanning ensures newly added content gets ratings immediately.': '在免费 API 额度下（1,000 次/天），5,000 个项目全量扫描约需 5 天。智能扫描可确保新添加的内容立即获得评分。',
        'Testing': '测试',
        'Test Mode (Process Only One Item)': '测试模式（仅处理一个项目）',
        'RECOMMENDED FOR FIRST RUN:': '建议首次运行时使用：',
        'When enabled, only processes the first item found to test if everything is working correctly. Disable this to process your entire library.': '启用后只处理找到的第一个项目，用于验证配置是否正确。关闭后处理整个媒体库。',
        'Save': '保存',
        'Run Rating Refresh': '运行评分刷新',
        'Manually trigger a rating refresh. Select specific items or run on your entire library.': '手动触发评分刷新。可选择特定项目，也可对整个媒体库运行。',
        'Test mode is on': '测试模式已开启',
        '— only the first matching item will be processed.': '——只会处理第一个匹配的项目。',
        'Targeted library/series/episode scans ignore smart-scan skip rules (rescan interval / already rated).': '指定媒体库 / 剧集 / 单集的扫描会忽略智能扫描跳过规则（重扫间隔 / 已有评分）。',
        'Library': '媒体库',
        'All Libraries': '全部媒体库',
        'All Series': '全部剧集',
        'Season': '季',
        'All Seasons': '全部季',
        'Episode': '单集',
        'All Episodes': '全部单集',
        'Movie': '电影',
        'All Movies': '全部电影',
        'Added Within': '添加时间',
        'All time': '全部时间',
        'Today': '今天',
        'Last 7 days': '最近 7 天',
        'Last 30 days': '最近 30 天',
        'Last 90 days': '最近 90 天',
        'Last 365 days': '最近 365 天',
        'Filters "All Movies" / "All Series" runs to only items added in that period.': '仅对「全部电影」/「全部剧集」生效，只处理该时间段内添加的项目。',
        'Ready': '就绪',
        'ETA:': '预计剩余：',
        'Start Refresh': '开始刷新',
        'Stop': '停止',
        'Clear Results': '清除结果',
        'Currently Processing': '正在处理',
        'Processed': '已处理',
        'Updated': '已更新',
        'Skipped': '已跳过',
        'Errors': '错误',
        'Failures': '失败',
        'No items updated yet': '暂无已更新项目',
        'No items skipped yet': '暂无已跳过项目',
        'No failures': '无失败项',
        'Scheduled Task': '计划任务',
        'This also runs as an Emby scheduled task. View or change the schedule under': '本插件也会作为 Emby 计划任务运行。可在服务器设置的',
        'Scheduled Tasks': '计划任务',
        'in server settings (default is daily).': '中查看或修改执行时间（默认为每天）。',
        'Scan History': '扫描历史',
        'View past scans and search your library for items with missing data.': '查看历史扫描记录，并搜索媒体库中缺失数据的项目。',
        'Recent Scans': '最近扫描',
        'Loading scan history...': '正在加载扫描历史…',
        'Scan Report': '扫描报告',
        'Copy': '复制',
        'Delete': '删除',
        'Close': '关闭',
        'Items Missing Data': '数据缺失项目',
        'All Types': '全部类型',
        'Series': '剧集',
        'Episodes': '单集',
        'All Missing': '全部缺失',
        'No IMDb ID': '无 IMDb ID',
        'No Community Rating': '无社区评分',
        'No Critic Rating': '无影评人评分',
        '🔍 Find Missing': '🔍 查找缺失',
        'Scan Selected': '扫描所选',
        'Tip: click a row to select it, then click "Scan Selected".': '提示：点击一行选中它，然后点击「扫描所选」。',
        'Click "Find Missing" to search for items without IMDb IDs or ratings.': '点击「查找缺失」搜索缺少 IMDb ID 或评分的项目。',
        'Item Scan History': '项目扫描历史',
        '🔍 Search': '🔍 搜索',
        'Search for items to see their scan history.': '搜索项目以查看其扫描历史。',
        'Search by item name...': '按项目名称搜索…',
        'Your library ratings, kept current.': '让媒体库评分保持最新。',
        'Choose which source to prioritize. If a rating isn\'t found, the other source will be tried.': '选择优先使用的数据源。若某个源查不到评分，将自动尝试另一个源。',
        'Enable Tiered Rescanning': '启用分层重扫',
        'Rescan newly released items more often while their ratings are still settling. Uses the release (premiere) date; items without one use the standard interval.': '在评分尚未稳定时，更频繁地重扫新发布的项目。以首播日期判断；没有该日期的项目使用标准间隔。',
        'Recent Release Age (Days)': '新近发布天数',
        'Items released within this many days count as recent. Default: 30': '在此天数内发布的项目视为「新近发布」。默认：30',
        'Recent Item Rescan Interval (Days)': '新近项目重扫间隔（天）',
        'Rescan interval for recent items. Default: 3': '新近项目的重扫间隔。默认：3',
        'Max Rescans Before Graduating (Optional)': '升级前最大重扫次数（可选）',
        'After this many recent-tier rescans, an item moves to the standard interval even if it is still recent. 0 = no cap.': '新近层级重扫达到此次数后，即使仍是新近项目也会转为标准间隔。0 表示不限制。',
        'New scan': '新建扫描',
        'Scan scope': '扫描范围',
        'Entire library': '整个媒体库',
        'Choose a library or item': '选择媒体库或项目',
        'Test mode: full scans check one item.': '测试模式：全量扫描只检查一个项目。',
        'Start scan': '开始扫描',
        'Latest scan': '最近扫描',
        'Scans': '扫描记录',
        'Missing ratings': '缺失评分',
        'Item lookup': '项目查询',
        'Open a scan to see exactly what changed.': '打开某次扫描查看具体变更。',
        'Show': '显示',
        'All scans': '全部扫描',
        'With updates': '有更新',
        'With errors': '有错误',
        'Stopped': '已停止',
        'Find missing ratings': '查找缺失评分',
        'Find Missing': '查找缺失',
        'Look up an item': '查询项目',
        'Search': '搜索',
        'Uses your saved item types and smart-scan rules.': '使用已保存的项目类型与智能扫描规则。',
        'History views': '历史视图',
        'Rating Sync': '评分同步'
    };

    // Backend detail strings stay canonical English (persisted + matched with
    // indexOf). Translate at render time only. Order matters: longer first.
    var DETAIL_ZH = [
        ['No rating sources configured. Add an OMDb/MDBList key or enable IMDb ratings fallback.', '未配置评分数据源。请添加 OMDb / MDBList 密钥，或启用 IMDb 评分回退。'],
        ['All configured APIs have reached their daily limits. Task will resume tomorrow.', '所有已配置的 API 均已达到每日限额，任务将在明天继续。'],
        ['Selected scan queue was empty or expired. Try Start again.', '所选扫描队列为空或已过期，请重新点击开始。'],
        ['No item types selected. Enable at least one item type in settings.', '未选择任何项目类型，请在设置中至少启用一种。'],
        ['Nothing to process for the current selection/settings.', '当前选择 / 设置下没有需要处理的项目。'],
        ['Nothing to process (', '没有需要处理的项目（'],
        [' smart-skipped by rescan/unrated filters).', ' 项被重扫 / 未评分筛选智能跳过）。'],
        ['Targeted scan (smart-scan filters bypassed)', '指定扫描（已跳过智能扫描筛选）'],
        ['Preparing IMDb ratings dataset', '正在准备 IMDb 评分数据集'],
        ['Stopped: daily API limits reached', '已停止：已达到每日 API 限额'],
        ['IMDb ratings fallback disabled in plugin settings', '插件设置中已关闭 IMDb 评分回退'],
        ['no sources ran (missing API keys, limits, or IMDb id)', '未执行任何数据源（缺少 API Key、达到限额或缺少 IMDb ID）'],
        ['No scores available, consulted ', '无可用评分，已查询 '],
        ['Add an OMDb key or enable IMDb ratings fallback for episode IMDb ratings.', '请添加 OMDb 密钥，或启用 IMDb 评分回退以获取单集 IMDb 评分。'],
        ['Sources returned no usable IMDb or RT data for this item (new or unrated episodes are common).', '数据源未返回该项目的可用 IMDb 或烂番茄数据（新剧集或未评分剧集较常见）。'],
        ['No changes needed, consulted ', '无需更改，已查询 '],
        ['Already up to date, ', '已是最新，'],
        ['Already up to date', '已是最新'],
        ['IMDb community already matches library', 'IMDb 社区评分已与媒体库一致'],
        ['RT critic already matches library', '烂番茄影评评分已与媒体库一致'],
        ['IMDb community score not returned by consulted sources', '已查询的数据源未返回 IMDb 社区评分'],
        ['RT critic score not returned by consulted sources', '已查询的数据源未返回烂番茄影评评分'],
        ['Skipped episode, missing season or episode index in library metadata', '已跳过：媒体库元数据缺少季或集序号'],
        ['IMDb ratings dataset', 'IMDb 评分数据集'],
        ['IMDb episode index dataset', 'IMDb 单集索引数据集'],
        ['IMDb dataset + page', 'IMDb 数据集 + 页面'],
        ['IMDb page lookup', 'IMDb 页面查询'],
        ['IMDb dataset', 'IMDb 数据集'],
        ['IMDb page', 'IMDb 页面'],
        ['IMDb community', 'IMDb 社区评分'],
        ['RT critic', '烂番茄评分'],
        ['No IMDb ID', '无 IMDb ID'],
        ['No Community Rating', '无社区评分'],
        ['No Critic Rating', '无影评人评分'],
        ['Smart-skipped ', '已智能跳过 '],
        [' item(s) before this scan', ' 个项目（本次扫描前）'],
        [' item(s) before scan', ' 个项目（本次扫描前）'],
        ['IMDb episode index: ', 'IMDb 单集索引：'],
        ['Queued ', '已加入队列 '],
        [' items for selected scan', ' 个项目（指定扫描）'],
        [' items (added last ', ' 个项目（添加于最近 '],
        [' day(s))', ' 天）'],
        ['All configured APIs have reached their daily limits. Stopping for today.', '所有已配置的 API 均已达到每日限额，今天先停止。'],
        ['Starting rating refresh task...', '正在启动评分刷新任务…'],
        ['TEST MODE: Processing only first item', '测试模式：仅处理第一个项目'],
        ['Task cancelled by user', '任务已被用户取消'],
        ['No eligible items in this selection.', '本次选择中没有符合条件的项目。'],
        ['Rating Sync task is unavailable.', '评分同步任务不可用。'],
        ['A rating scan is already running or queued.', '已有评分扫描正在运行或排队中。'],
        ['Choose either a target or the full library.', '请选择目标项目或整个媒体库。'],
        ['Cannot delete a scan that is still in progress', '无法删除仍在进行中的扫描'],
        ['OMDb rejected the request: check API key or quota', 'OMDb 拒绝了请求：请检查 API Key 或配额'],
        ['OMDb returned an invalid response', 'OMDb 返回了无效响应'],
        ['Provider request failed (HTTP ', '数据源请求失败 (HTTP '],
        ['OMDb daily limit reached', 'OMDb 已达每日限额'],
        ['MDBList daily limit reached', 'MDBList 已达每日限额'],
        ['OMDb request failed', 'OMDb 请求失败'],
        ['MDBList request failed', 'MDBList 请求失败'],
        ['OMDb timed out', 'OMDb 请求超时'],
        ['MDBList timed out', 'MDBList 请求超时'],
        ['Missing SessionId', '缺少 SessionId'],
        ['Scan deleted', '扫描记录已删除'],
        ['Scan not found', '未找到该扫描记录'],
        ['Rotten Tomatoes', '烂番茄'],
        ['Downloading ', '正在下载 '],
        [' (none)', '（无）'],
        [' none ', ' 无 '],
        ['...', '…']
    ];

    function detectLang() {
        if (_lang) return _lang;
        var raw = '';
        try {
            if (typeof ApiClient !== 'undefined' && ApiClient.getCurrentLocale) {
                raw = ApiClient.getCurrentLocale() || '';
            }
        } catch (e) { raw = ''; }
        if (!raw) {
            try { raw = navigator.language || (navigator.languages && navigator.languages[0]) || ''; } catch (e) { raw = ''; }
        }
        _lang = /^zh/i.test(String(raw)) ? LOCALE_ZH : LOCALE_EN;
        return _lang;
    }

    function formatText(text, args) {
        if (text == null) return '';
        if (!args) return text;
        return String(text).replace(/\{(\w+)\}/g, function (m, name) {
            return (args[name] === undefined || args[name] === null) ? m : String(args[name]);
        });
    }

    function t(key, args) {
        var table = STRINGS[detectLang()] || STRINGS[LOCALE_EN];
        var text = table[key];
        if (text === undefined) text = STRINGS[LOCALE_EN][key];
        if (text === undefined) return key;
        return formatText(text, args);
    }

    function localizeDetail(text) {
        if (text == null || text === '') return '';
        if (detectLang() !== LOCALE_ZH) return String(text);
        var out = String(text);
        for (var i = 0; i < DETAIL_ZH.length; i++) {
            if (out.indexOf(DETAIL_ZH[i][0]) >= 0) {
                out = out.split(DETAIL_ZH[i][0]).join(DETAIL_ZH[i][1]);
            }
        }
        return out;
    }

    // Scan scope is persisted by the backend as canonical English
    // ("Entire library" / "Selected items (N)") or an item name.
    function scopeLabel(scope) {
        var raw = scope == null ? '' : String(scope);
        if (!raw) return t('history.ratingScan');
        if (raw === 'Entire library') return t('scope.entireLibrary');
        var m = /^Selected items \((\d+)\)$/.exec(raw);
        if (m) return t('scope.selectedItems', { n: m[1] });
        return raw;
    }

    function typeLabel(type) {
        var key = 'type.' + String(type || '').toLowerCase();
        var table = STRINGS[detectLang()] || STRINGS[LOCALE_EN];
        return table[key] !== undefined ? t(key) : (type || t('type.unknown'));
    }

    function translateDom(root) {
        if (!root || detectLang() !== LOCALE_ZH) return;
        try {
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            var nodes = [];
            var node;
            while ((node = walker.nextNode())) nodes.push(node);
            nodes.forEach(function (n) {
                var raw = n.nodeValue;
                if (!raw) return;
                var key = raw.trim();
                if (!key) return;
                var zh = STATIC_ZH[key];
                if (zh === undefined) return;
                n.nodeValue = raw.replace(key, zh);
            });
            Array.prototype.forEach.call(root.querySelectorAll('[placeholder]'), function (el) {
                var v = el.getAttribute('placeholder');
                var zh = STATIC_ZH[v];
                if (zh !== undefined) el.setAttribute('placeholder', zh);
            });
            Array.prototype.forEach.call(root.querySelectorAll('[data-title]'), function (el) {
                var v = el.getAttribute('data-title');
                var zh = STATIC_ZH[v];
                if (zh !== undefined) el.setAttribute('data-title', zh);
            });
            Array.prototype.forEach.call(root.querySelectorAll('[aria-label]'), function (el) {
                var v = el.getAttribute('aria-label');
                var zh = STATIC_ZH[v];
                if (zh !== undefined) el.setAttribute('aria-label', zh);
            });
        } catch (e) {
            console.error('i18n: translateDom failed', e);
        }
    }

    return class extends BaseView {
        constructor(view, params) {
            super(view, params);
            this.pollInterval = null;
            this.elapsedInterval = null;
            this.startTime = null;
            this.activeResultTab = 'updatedList';
            this.missingDataCache = null;
            this.selectedMissingId = null;
            this.selectedMissingItem = null;
            this.scanHistorySessions = null;
            this._scanReportKeydownBound = false;
            this._uiBound = false;
            this._pollTick = 0;
        }

        // Tab navigation
        bindTabNavigation(view) {
            var self = this;
            var navButtons = view.querySelectorAll('.localnav .nav-button');
            
            navButtons.forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = this.getAttribute('data-target');
                    
                    // Update active button
                    navButtons.forEach(function(b) { b.classList.remove('ui-btn-active'); });
                    this.classList.add('ui-btn-active');
                    
                    // Show target tab
                    view.querySelectorAll('.tabPage').forEach(function(page) {
                        page.classList.remove('active');
                    });
                    var targetPage = view.querySelector('#' + targetId);
                    if (targetPage) {
                        targetPage.classList.add('active');
                    }
                    
                    // Load history when switching to history tab
                    if (targetId === 'historyPage') {
                        self.loadScanHistory(view);
                    }

                    self.updateApiCounters(view);
                });
            });
        }

        updateApiCounters(view) {
            var self = this;
            var primary = view.querySelector('#apiCountersText');
            var nodes = primary ? [primary] : view.querySelectorAll('.apiCountersText');
            if (!nodes || nodes.length === 0) return;

            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/ApiCounters'),
                dataType: 'json'
            }).then(function(data) {
                var text = self.formatApiCounters(data);
                Array.prototype.forEach.call(nodes, function(n) { n.innerHTML = text; });
            }).catch(function() {
                Array.prototype.forEach.call(nodes, function(n) { n.textContent = t('api.unavailable'); });
            });
        }

        formatApiCounters(data) {
            if (!data) return t('api.unavailable');

            var today = data.Today ? String(data.Today) : '';
            var todayLabel = '';
            if (today && /^\d{4}-\d{2}-\d{2}$/.test(today)) {
                try {
                    var d = new Date(today + 'T00:00:00');
                    todayLabel = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                } catch (e) {
                    todayLabel = today;
                }
            } else if (today) {
                todayLabel = today;
            }
            var omdbText = 'OMDb: —';
            if (data.OmdbHasKey) {
                omdbText = 'OMDb: ' + (data.OmdbUsed || 0) + (data.OmdbRateLimitEnabled && data.OmdbLimit ? ('/' + data.OmdbLimit) : '');
            }

            var mdbText = 'MDBList: —';
            if (data.MdbListHasKey) {
                mdbText = 'MDBList: ' + (data.MdbListUsed || 0) + (data.MdbListRateLimitEnabled && data.MdbListLimit ? ('/' + data.MdbListLimit) : '');
            }

            var imdbText = t('api.imdbFallbackLabel') + (data.ImdbScrapesUsed || 0);

            var html = '';
            if (todayLabel) {
                html += '<span style="opacity:0.78;margin-right:0.6em">' + this.escapeHtml(t('api.usageOn', { date: todayLabel })) + '</span>';
            } else if (today) {
                html += '<span style="opacity:0.78;margin-right:0.6em">' + this.escapeHtml(t('api.usageToday')) + '</span>';
            } else {
                html += '<span style="opacity:0.78;margin-right:0.6em">' + this.escapeHtml(t('api.usage')) + '</span>';
            }
            html += '<span class="apiBadge"><span class="apiDot omdb"></span><span>' + this.escapeHtml(omdbText) + '</span></span>';
            html += '<span class="apiBadge"><span class="apiDot mdblist"></span><span>' + this.escapeHtml(mdbText) + '</span></span>';
            html += '<span class="apiBadge"><span class="apiDot imdb"></span><span>' + this.escapeHtml(imdbText) + '</span></span>';
            return html;
        }

        deleteScanBySessionId(view, sessionId) {
            var self = this;
            if (!sessionId) {
                toast(t('toast.missingSessionId'));
                return;
            }

            if (!confirm(t('confirm.deleteScan'))) {
                return;
            }

            ApiClient.ajax({
                type: 'POST',
                url: ApiClient.getUrl('RatingSync/DeleteScan'),
                data: JSON.stringify({ SessionId: sessionId }),
                contentType: 'application/json',
                dataType: 'json'
            }).then(function(res) {
                if (res && res.Success) {
                    toast(t('toast.scanDeleted'));
                    if (self.activeScanReportSession && self.activeScanReportSession.SessionId === sessionId) {
                        self.closeScanReport(view);
                        self.activeScanReportSession = null;
                        self.activeScanReport = null;
                    }
                    self.loadScanHistory(view);
                } else {
                    toast((res && res.Message) ? localizeDetail(res.Message) : t('toast.deleteFailed'));
                }
            }).catch(function() {
                toast(t('toast.deleteFailed'));
            });
        }

        // Result tab navigation
        bindResultTabs(view) {
            var self = this;
            var resultTabs = view.querySelectorAll('.resultTab');
            
            resultTabs.forEach(function(tab) {
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = this.getAttribute('data-target');
                    self.activeResultTab = targetId;
                    
                    // Update active tab
                    resultTabs.forEach(function(t) { t.classList.remove('active'); });
                    this.classList.add('active');
                    
                    // Show target list
                    view.querySelector('#updatedList').classList.add('hide');
                    view.querySelector('#skippedList').classList.add('hide');
                    view.querySelector('#failureList').classList.add('hide');
                    view.querySelector('#' + targetId).classList.remove('hide');
                });
            });
        }

        // Library selection
        loadLibraries(view) {
            var self = this;
            self.libraryTypes = {}; // Store library types
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Libraries'),
                dataType: 'json'
            }).then(function(libraries) {
                var select = view.querySelector('#selectLibrary');
                select.innerHTML = '<option value="">' + t('opt.allLibraries') + '</option>';
                libraries.forEach(function(lib) {
                    var option = document.createElement('option');
                    option.value = lib.Id;
                    option.textContent = lib.Name;
                    option.dataset.type = lib.CollectionType;
                    select.appendChild(option);
                    self.libraryTypes[lib.Id] = lib.CollectionType;
                });
            }).catch(function(err) {
                console.error('Error loading libraries:', err);
            });
        }

        onLibrarySelected(view, libraryId) {
            var self = this;
            var tvSection = view.querySelector('#tvShowSelection');
            var movieSection = view.querySelector('#movieSelection');
            
            // Determine library type
            var libraryType = libraryId ? self.libraryTypes[libraryId] : 'mixed';
            console.log('Library type:', libraryType);
            
            if (libraryType === 'movies') {
                // Show movie selection, hide TV selection
                tvSection.classList.add('hide');
                movieSection.classList.remove('hide');
                self.resetTvSelection(view);
                self.loadMovies(view, libraryId);
            } else if (libraryType === 'tvshows') {
                // Show TV selection, hide movie selection
                tvSection.classList.remove('hide');
                movieSection.classList.add('hide');
                self.resetMovieSelection(view);
                self.loadSeries(view, libraryId);
            } else {
                // Mixed or all - show both
                tvSection.classList.remove('hide');
                movieSection.classList.remove('hide');
                self.loadSeries(view, libraryId);
                self.loadMovies(view, libraryId);
            }

            self.updateAddedWithinVisibility(view);
        }

        updateAddedWithinVisibility(view) {
            var box = view.querySelector('#addedWithinSelection');
            if (!box) return;

            var tvSection = view.querySelector('#tvShowSelection');
            var movieSection = view.querySelector('#movieSelection');
            var seriesSelect = view.querySelector('#selectSeries');
            var movieSelect = view.querySelector('#selectMovie');

            var showForTv = tvSection && !tvSection.classList.contains('hide')
                && seriesSelect && !seriesSelect.disabled
                && (!seriesSelect.value);

            var showForMovies = movieSection && !movieSection.classList.contains('hide')
                && movieSelect && !movieSelect.disabled
                && (!movieSelect.value);

            if (showForTv || showForMovies) box.classList.remove('hide');
            else box.classList.add('hide');
        }

        resetTvSelection(view) {
            var seriesSelect = view.querySelector('#selectSeries');
            var seasonSelect = view.querySelector('#selectSeason');
            var episodeSelect = view.querySelector('#selectEpisode');
            
            seriesSelect.innerHTML = '<option value="">' + t('opt.allSeries') + '</option>';
            seriesSelect.disabled = true;
            seasonSelect.innerHTML = '<option value="">' + t('opt.allSeasons') + '</option>';
            seasonSelect.disabled = true;
            episodeSelect.innerHTML = '<option value="">' + t('opt.allEpisodes') + '</option>';
            episodeSelect.disabled = true;
        }

        resetMovieSelection(view) {
            var movieSelect = view.querySelector('#selectMovie');
            movieSelect.innerHTML = '<option value="">' + t('opt.allMovies') + '</option>';
            movieSelect.disabled = true;
        }

        loadMovies(view, libraryId) {
            var self = this;
            var movieSelect = view.querySelector('#selectMovie');
            
            movieSelect.innerHTML = '<option value="">' + t('opt.allMovies') + '</option>';
            movieSelect.disabled = true;
            
            var url = libraryId 
                ? ApiClient.getUrl('RatingSync/Movies', { LibraryId: libraryId })
                : ApiClient.getUrl('RatingSync/Movies');
            
            console.log('Loading movies from:', url);
            
            ApiClient.ajax({
                type: 'GET',
                url: url,
                dataType: 'json'
            }).then(function(movies) {
                console.log('Loaded movies:', movies ? movies.length : 0);
                if (movies && movies.length > 0) {
                    movieSelect.disabled = false;
                    movies.forEach(function(m) {
                        var option = document.createElement('option');
                        option.value = m.Id;
                        option.textContent = m.Name;
                        movieSelect.appendChild(option);
                    });
                }

                self.updateAddedWithinVisibility(view);
            }).catch(function(err) {
                console.error('Error loading movies:', err);
            });
        }

        loadSeries(view, libraryId) {
            var self = this;
            var seriesSelect = view.querySelector('#selectSeries');
            var seasonSelect = view.querySelector('#selectSeason');
            var episodeSelect = view.querySelector('#selectEpisode');
            
            // Reset downstream dropdowns
            seriesSelect.innerHTML = '<option value="">' + t('opt.allSeries') + '</option>';
            seriesSelect.disabled = true;
            seasonSelect.innerHTML = '<option value="">' + t('opt.allSeasons') + '</option>';
            seasonSelect.disabled = true;
            episodeSelect.innerHTML = '<option value="">' + t('opt.allEpisodes') + '</option>';
            episodeSelect.disabled = true;
            
            // Always load series (even without library filter)
            var url = libraryId 
                ? ApiClient.getUrl('RatingSync/Series', { LibraryId: libraryId })
                : ApiClient.getUrl('RatingSync/Series');
            
            console.log('Loading series from:', url);
            
            ApiClient.ajax({
                type: 'GET',
                url: url,
                dataType: 'json'
            }).then(function(series) {
                console.log('Loaded series:', series ? series.length : 0);
                if (series && series.length > 0) {
                    seriesSelect.disabled = false;
                    series.forEach(function(s) {
                        var option = document.createElement('option');
                        option.value = s.Id;
                        option.textContent = s.Name + (s.Year ? ' (' + s.Year + ')' : '');
                        seriesSelect.appendChild(option);
                    });
                }

                self.updateAddedWithinVisibility(view);
            }).catch(function(err) {
                console.error('Error loading series:', err);
            });
        }

        loadSeasons(view, seriesId) {
            var self = this;
            var seasonSelect = view.querySelector('#selectSeason');
            var episodeSelect = view.querySelector('#selectEpisode');
            
            // Reset downstream dropdowns
            seasonSelect.innerHTML = '<option value="">' + t('opt.allSeasons') + '</option>';
            seasonSelect.disabled = true;
            episodeSelect.innerHTML = '<option value="">' + t('opt.allEpisodes') + '</option>';
            episodeSelect.disabled = true;
            
            if (!seriesId) return;
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Seasons', { SeriesId: seriesId }),
                dataType: 'json'
            }).then(function(seasons) {
                if (seasons.length > 0) {
                    seasonSelect.disabled = false;
                    seasons.forEach(function(s) {
                        var option = document.createElement('option');
                        option.value = s.Id;
                        option.textContent = s.Name + ' ' + t('opt.episodeCount', { n: s.EpisodeCount });
                        seasonSelect.appendChild(option);
                    });
                }
            }).catch(function(err) {
                console.error('Error loading seasons:', err);
            });
        }

        loadEpisodes(view, seasonId) {
            var self = this;
            var episodeSelect = view.querySelector('#selectEpisode');
            
            // Reset dropdown
            episodeSelect.innerHTML = '<option value="">' + t('opt.allEpisodes') + '</option>';
            episodeSelect.disabled = true;
            
            if (!seasonId) return;
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Episodes', { SeasonId: seasonId }),
                dataType: 'json'
            }).then(function(episodes) {
                if (episodes.length > 0) {
                    episodeSelect.disabled = false;
                    episodes.forEach(function(e) {
                        var option = document.createElement('option');
                        option.value = e.Id;
                        option.textContent = 'E' + (e.EpisodeNumber || '?') + ' - ' + e.Name;
                        episodeSelect.appendChild(option);
                    });
                }
            }).catch(function(err) {
                console.error('Error loading episodes:', err);
            });
        }

        bindLibrarySelection(view) {
            var self = this;
            
            var selectLibrary = view.querySelector('#selectLibrary');
            var selectSeries = view.querySelector('#selectSeries');
            var selectSeason = view.querySelector('#selectSeason');
            var selectEpisode = view.querySelector('#selectEpisode');
            var selectMovie = view.querySelector('#selectMovie');
            
            // Track last values to prevent duplicate calls
            var lastLibraryValue = '';
            var lastSeriesValue = '';
            var lastSeasonValue = '';
            
            function onLibraryChange() {
                var value = selectLibrary.value;
                if (value === lastLibraryValue) return;
                lastLibraryValue = value;
                lastSeriesValue = '';
                lastSeasonValue = '';
                console.log('Library changed:', value);
                self.onLibrarySelected(view, value);
                self.updateAddedWithinVisibility(view);
            }
            
            function onSeriesChange() {
                var value = selectSeries.value;
                if (value === lastSeriesValue) return;
                lastSeriesValue = value;
                lastSeasonValue = '';
                console.log('Series changed:', value);
                self.loadSeasons(view, value);
                self.updateAddedWithinVisibility(view);
            }
            
            function onSeasonChange() {
                var value = selectSeason.value;
                if (value === lastSeasonValue) return;
                lastSeasonValue = value;
                console.log('Season changed:', value);
                self.loadEpisodes(view, value);
                self.updateAddedWithinVisibility(view);
            }
            
            selectLibrary.addEventListener('change', onLibraryChange);
            selectSeries.addEventListener('change', onSeriesChange);
            selectSeason.addEventListener('change', onSeasonChange);

            if (selectMovie) {
                selectMovie.addEventListener('change', function() {
                    self.updateAddedWithinVisibility(view);
                });
            }

            if (selectEpisode) {
                selectEpisode.addEventListener('change', function() {
                    self.updateAddedWithinVisibility(view);
                });
            }
        }

        loadConfig(view) {
            loading.show();

            ApiClient.getPluginConfiguration(pluginId).then(function (config) {
                view.querySelector('#txtOmdbApiKey').value = config.OmdbApiKey || '';
                view.querySelector('#txtMdbListApiKey').value = config.MdbListApiKey || '';
                
                // Handle PreferredSource - could be number or string
                var sourceValue = config.PreferredSource;
                if (typeof sourceValue === 'number') {
                    var sourceMap = ['OMDb', 'MDBList', 'Both'];
                    sourceValue = sourceMap[sourceValue] || 'OMDb';
                }
                view.querySelector('#selectPreferredSource').value = sourceValue || 'OMDb';
                
                view.querySelector('#chkUpdateCriticRating').checked = config.UpdateCriticRating !== false;
                view.querySelector('#chkUpdateMovies').checked = config.UpdateMovies !== false;
                view.querySelector('#chkUpdateSeries').checked = config.UpdateSeries !== false;
                view.querySelector('#chkUpdateEpisodes').checked = config.UpdateEpisodes === true;
                view.querySelector('#chkEnableImdbScraping').checked = config.EnableImdbScraping === true;
                
                // API Rate Limiting settings
                var omdbRateLimit = config.OmdbRateLimitEnabled === true;
                var mdblistRateLimit = config.MdbListRateLimitEnabled === true;
                view.querySelector('#chkOmdbRateLimit').checked = omdbRateLimit;
                view.querySelector('#txtOmdbDailyLimit').value = config.OmdbDailyLimit || 1000;
                view.querySelector('#omdbLimitOptions').style.display = omdbRateLimit ? 'block' : 'none';
                view.querySelector('#chkMdbListRateLimit').checked = mdblistRateLimit;
                view.querySelector('#txtMdbListDailyLimit').value = config.MdbListDailyLimit || 1000;
                view.querySelector('#mdblistLimitOptions').style.display = mdblistRateLimit ? 'block' : 'none';
                
                // Smart scanning settings
                view.querySelector('#txtRescanInterval').value = config.RescanIntervalDays || 30;
                view.querySelector('#chkPrioritizeRecent').checked = config.PrioritizeRecentlyAdded !== false;
                view.querySelector('#txtRecentDays').value = config.RecentlyAddedDays || 7;
                view.querySelector('#chkSkipUnratedOnly').checked = config.SkipUnratedOnly === true;
                view.querySelector('#chkTieredRescan').checked = config.TieredRescanEnabled === true;
                view.querySelector('#tieredRescanOptions').style.display = config.TieredRescanEnabled === true ? 'block' : 'none';
                view.querySelector('#txtRecentReleaseDays').value = config.RecentReleaseDays || 30;
                view.querySelector('#txtRecentRescanInterval').value = config.RecentRescanIntervalDays || 3;
                view.querySelector('#txtRecentMaxRescans').value = config.RecentMaxRescans || 0;

                view.querySelector('#chkTestMode').checked = config.TestMode === true;

                var testBanner = view.querySelector('#testModeBanner');
                if (testBanner) {
                    if (config.TestMode === true) testBanner.classList.remove('hide');
                    else testBanner.classList.add('hide');
                }

                loading.hide();
            }).catch(function (err) {
                console.error('Error loading config:', err);
                loading.hide();
                toast({ text: t('toast.loadConfigFailed') });
            });
        }

        saveConfig(view) {
            loading.show();

            ApiClient.getPluginConfiguration(pluginId).then(function (config) {
                config.OmdbApiKey = view.querySelector('#txtOmdbApiKey').value;
                config.MdbListApiKey = view.querySelector('#txtMdbListApiKey').value;
                
                // Convert string value to enum number for backend
                var sourceStr = view.querySelector('#selectPreferredSource').value;
                var sourceMap = { 'OMDb': 0, 'MDBList': 1, 'Both': 2 };
                config.PreferredSource = sourceMap[sourceStr] !== undefined ? sourceMap[sourceStr] : 0;
                
                config.UpdateCriticRating = view.querySelector('#chkUpdateCriticRating').checked;
                config.UpdateMovies = view.querySelector('#chkUpdateMovies').checked;
                config.UpdateSeries = view.querySelector('#chkUpdateSeries').checked;
                config.UpdateEpisodes = view.querySelector('#chkUpdateEpisodes').checked;
                config.EnableImdbScraping = view.querySelector('#chkEnableImdbScraping').checked;
                
                // API Rate Limiting settings
                config.OmdbRateLimitEnabled = view.querySelector('#chkOmdbRateLimit').checked;
                config.OmdbDailyLimit = parseInt(view.querySelector('#txtOmdbDailyLimit').value, 10) || 1000;
                config.MdbListRateLimitEnabled = view.querySelector('#chkMdbListRateLimit').checked;
                config.MdbListDailyLimit = parseInt(view.querySelector('#txtMdbListDailyLimit').value, 10) || 1000;
                
                // Smart scanning settings
                config.RescanIntervalDays = parseInt(view.querySelector('#txtRescanInterval').value, 10) || 30;
                config.PrioritizeRecentlyAdded = view.querySelector('#chkPrioritizeRecent').checked;
                config.RecentlyAddedDays = parseInt(view.querySelector('#txtRecentDays').value, 10) || 7;
                config.SkipUnratedOnly = view.querySelector('#chkSkipUnratedOnly').checked;
                config.TieredRescanEnabled = view.querySelector('#chkTieredRescan').checked;
                config.RecentReleaseDays = parseInt(view.querySelector('#txtRecentReleaseDays').value, 10) || 30;
                config.RecentRescanIntervalDays = parseInt(view.querySelector('#txtRecentRescanInterval').value, 10) || 3;
                config.RecentMaxRescans = Math.max(0, parseInt(view.querySelector('#txtRecentMaxRescans').value, 10) || 0);

                config.TestMode = view.querySelector('#chkTestMode').checked;

                ApiClient.updatePluginConfiguration(pluginId, config).then(function () {
                    loading.hide();
                    toast({ text: t('toast.saved') });
                }).catch(function (err) {
                    console.error('Error saving config:', err);
                    loading.hide();
                    toast({ text: t('toast.saveConfigFailed') });
                });
            }).catch(function (err) {
                console.error('Error getting config:', err);
                loading.hide();
                toast({ text: t('toast.saveConfigFailed') });
            });
        }

        formatTime(date) {
            if (!date) return '--:--:--';
            var d = new Date(date);
            return d.toLocaleTimeString();
        }

        formatElapsed(ms) {
            var seconds = Math.floor(ms / 1000);
            var mins = Math.floor(seconds / 60);
            var secs = seconds % 60;
            var hours = Math.floor(mins / 60);
            mins = mins % 60;
            
            if (hours > 0) {
                return t('time.hms', { h: hours, m: mins, s: secs });
            } else if (mins > 0) {
                return t('time.ms', { m: mins, s: secs });
            }
            return t('time.s', { s: secs });
        }

        formatETA(seconds) {
            if (!seconds || seconds <= 0) return '--:--';
            
            var mins = Math.floor(seconds / 60);
            var secs = Math.floor(seconds % 60);
            var hours = Math.floor(mins / 60);
            mins = mins % 60;
            
            if (hours > 0) {
                return t('time.hm', { h: hours, m: mins });
            } else if (mins > 0) {
                return t('time.ms', { m: mins, s: secs });
            }
            return t('time.s', { s: secs });
        }

        escapeHtml(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        unpackDetail(packed) {
            if (packed == null) return { name: '', detail: '' };
            var text = String(packed);
            var sep = '\x1e';
            var idx = text.indexOf(sep);
            if (idx < 0) {
                // Legacy: key was the name, value was the detail
                return { name: '', detail: text };
            }
            return { name: text.substring(0, idx), detail: text.substring(idx + 1) };
        }

        renderResultList(view, items, listId, type) {
            var list = view.querySelector('#' + listId);
            var keys = Object.keys(items || {});
            var order = (this.resultOrder || {})[listId] || [];
            if (order.length) keys = order.filter(function(key) { return Object.prototype.hasOwnProperty.call(items, key); });
            var existing = new Map();
            Array.prototype.forEach.call(list.children, function(row) { if (row.dataset.itemKey) existing.set(row.dataset.itemKey, row); });
            var nodes = [];
            var scroller = list.parentElement;
            var oldScroll = scroller.scrollTop;
            var anchor = Array.prototype.find.call(list.children, function(row) { return row.dataset.itemKey && row.getBoundingClientRect().bottom > scroller.getBoundingClientRect().top; });
            var anchorTop = anchor ? anchor.getBoundingClientRect().top : 0;
            if (keys.length === 0) {
                list.innerHTML = '';
                var emptyLi = document.createElement('li');
                emptyLi.className = 'resultEmpty';
                if (type === 'success') {
                    emptyLi.textContent = t('list.noUpdated');
                } else if (type === 'skipped') {
                    emptyLi.textContent = t('list.noSkipped');
                } else {
                    emptyLi.textContent = t('list.noFailures');
                }
                list.appendChild(emptyLi);
                return;
            }
            
            // Reverse to show most recent first; cap live list for performance
            keys.reverse();
            var shown = keys.slice(0, 200);
            if (type === 'success' && Object.keys(this.ratingChanges || {}).length) {
                var heading = existing.get('__header') || document.createElement('li'); heading.dataset.itemKey = '__header'; heading.className = 'resultItem resultColumns';
                heading.innerHTML = '<span class="resultItemName">' + t('list.colTitle') + '</span><span class="ratingChange"><span>' + t('report.colRating') + '</span><span>' + t('report.colBefore') + '</span><span>' + t('report.colAfter') + '</span><span>' + t('report.colSource') + '</span></span>';
                nodes.push(heading);
            }
            
            shown.forEach(function(key) {
                var unpacked = this.unpackDetail(items[key]);
                var name = unpacked.name || key;
                var rawDetail = unpacked.detail || '';
                var signature = JSON.stringify([name, rawDetail, (this.ratingChanges || {})[key] || []]);
                var previous = existing.get(key);
                if (previous && previous.dataset.signature === signature) { nodes.push(previous); return; }
                // Legacy packed-as-detail-only when name empty and key looks like a title
                if (!unpacked.name && key.indexOf('name:') !== 0 && !/^\d+$/.test(key)) {
                    name = key;
                    rawDetail = unpacked.detail;
                }
                var li = document.createElement('li');
                li.className = 'resultItem ' + type;
                li.dataset.itemKey = key; li.dataset.signature = signature;
                var changes = (this.ratingChanges || {})[key] || [];
                // Backend detail stays canonical English; translate for display only.
                var detail = localizeDetail(rawDetail);
                var summary = detail;
                if (type === 'skipped') {
                    summary = /already matches|already current/i.test(rawDetail) ? t('list.alreadyCurrent') :
                        /missing.*(id|index|metadata)/i.test(rawDetail) ? t('list.missingMetadata') : t('list.ratingUnavailable');
                }
                li.innerHTML = '<span class="resultItemName">' + this.escapeHtml(name) + '</span>';
                var cell = document.createElement('div');
                cell.className = 'resultItemDetail';
                if (changes.length) {
                    changes.forEach(function(change) {
                        var row = document.createElement('div'); row.className = 'ratingChange';
                        var before = change.Before == null ? '—' : change.Before;
                        row.innerHTML = '<span>' + this.escapeHtml(localizeDetail(change.Rating)) + '</span><span>' + this.escapeHtml(before) +
                            '</span><span>' + this.escapeHtml(change.After) + '</span><span>' + this.escapeHtml(localizeDetail(change.Source)) + '</span>';
                        cell.appendChild(row);
                    }, this);
                } else {
                    var shortText = document.createElement('span'); shortText.textContent = summary; cell.appendChild(shortText);
                }
                if (detail && (type !== 'success' || changes.length)) {
                    var more = document.createElement('details');
                    var label = document.createElement('summary'); label.textContent = t('list.details');
                    var body = document.createElement('p'); body.textContent = detail;
                    more.appendChild(label); more.appendChild(body); cell.appendChild(more);
                }
                li.appendChild(cell);
                if (previous && previous.querySelector('details[open]')) { var disclosure = li.querySelector('details'); if (disclosure) disclosure.open = true; }
                nodes.push(li);
            }, this);

            if (keys.length > shown.length) {
                var more = document.createElement('li');
                more.className = 'resultEmpty';
                more.textContent = t('list.showingLatest', { shown: shown.length, total: keys.length });
                nodes.push(more);
            }
            nodes.forEach(function(node, index) { if (list.children[index] !== node) list.insertBefore(node, list.children[index] || null); });
            while (list.children.length > nodes.length) list.removeChild(list.lastElementChild);
            if (oldScroll > 0 && anchor && list.contains(anchor)) scroller.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
            else if (oldScroll === 0) scroller.scrollTop = 0;
        }

        updateProgressUI(view, progress, summaryOnly) {
            if (!progress) return;
            
            // Handle both PascalCase and camelCase property names
            var percentComplete = progress.PercentComplete || progress.percentComplete || 0;
            var processedItems = progress.ProcessedItems || progress.processedItems || 0;
            var updatedItems = progress.UpdatedItems || progress.updatedItems || 0;
            var skippedItems = progress.SkippedItems || progress.skippedItems || 0;
            var errorItems = progress.ErrorItems || progress.errorItems || 0;
            var smartSkipped = progress.SmartSkippedItems || progress.smartSkippedItems || 0;
            var statusMessage = progress.StatusMessage || progress.statusMessage || '';
            var wasCancelled = progress.WasCancelled || progress.wasCancelled || false;
            var currentItem = progress.CurrentItem || progress.currentItem || '';
            var totalItems = progress.TotalItems || progress.totalItems || 0;
            var isRunning = progress.IsRunning || progress.isRunning || false;
            var startTime = progress.StartTime || progress.startTime;
            var eta = progress.EstimatedSecondsRemaining || progress.estimatedSecondsRemaining;
            var updatedDetails = progress.UpdatedDetails || progress.updatedDetails || {};
            var skippedDetails = progress.SkippedDetails || progress.skippedDetails || {};
            var failureDetails = progress.FailureDetails || progress.failureDetails || {};

            // Update progress bar
            var fill = view.querySelector('#progressBarFill');
            var text = view.querySelector('#progressBarText');
            fill.style.width = percentComplete + '%';
            text.textContent = Math.round(percentComplete) + '%';

            // Update stats / badges from the same counters
            view.querySelector('#statProcessed').textContent = processedItems;
            view.querySelector('#statUpdated').textContent = updatedItems;
            view.querySelector('#statSkipped').textContent = skippedItems;
            view.querySelector('#statErrors').textContent = errorItems;
            view.querySelector('#statUpdated').classList.toggle('hasResults', updatedItems > 0);
            view.querySelector('#statErrors').classList.toggle('hasResults', errorItems > 0);
            view.querySelector('#updatedBadge').textContent = updatedItems;
            view.querySelector('#skippedBadge').textContent = skippedItems;
            view.querySelector('#failureBadge').textContent = errorItems;

            var smartNote = view.querySelector('#smartSkipNote');
            if (smartNote) {
                if (smartSkipped > 0 || statusMessage) {
                    var note = statusMessage ? localizeDetail(statusMessage) : t('progress.smartSkipped', { n: smartSkipped });
                    smartNote.textContent = note;
                    smartNote.classList.remove('hide');
                } else {
                    smartNote.classList.add('hide');
                }
            }
            
            // Update current item
            var currentItemBox = view.querySelector('#currentItemBox');
            var currentItemEl = view.querySelector('#currentItem');
            if (currentItem && isRunning) {
                currentItemEl.textContent = currentItem;
                currentItemBox.classList.remove('hide');
            } else {
                currentItemBox.classList.add('hide');
            }

            // Update ETA
            var etaBox = view.querySelector('#etaBox');
            var etaValue = view.querySelector('#etaValue');
            if (isRunning && eta && eta > 0) {
                etaValue.textContent = this.formatETA(eta);
                etaBox.classList.remove('hide');
            } else {
                etaBox.classList.add('hide');
            }

            // Render result lists
            if (!summaryOnly) {
                this.ratingChanges = progress.Changes || progress.changes || {};
                this.resultOrder = { updatedList: progress.UpdatedOrder || progress.updatedOrder || [], skippedList: progress.SkippedOrder || progress.skippedOrder || [], failureList: progress.FailureOrder || progress.failureOrder || [] };
                this.renderResultList(view, updatedDetails, 'updatedList', 'success');
                this.renderResultList(view, skippedDetails, 'skippedList', 'skipped');
                this.renderResultList(view, failureDetails, 'failureList', 'failure');
            }

            // Update start time for elapsed tracking
            if (startTime && !this.startTime) {
                this.startTime = new Date(startTime);
            }

            // Update status
            if (isRunning) {
                this.setStatus(view, 'running', t('ui.runningProgress', { done: processedItems, total: totalItems }));
            }
            
            return { 
                isRunning: isRunning,
                wasCancelled: wasCancelled,
                statusMessage: statusMessage,
                updatedItems: updatedItems, 
                skippedItems: skippedItems, 
                errorItems: errorItems,
                totalItems: totalItems,
                smartSkipped: smartSkipped
            };
        }

        setStatus(view, status, text) {
            var badge = view.querySelector('#statusBadge');
            var statusText = view.querySelector('#statusText');
            badge.className = 'statusBadge ' + status;
            statusText.textContent = text;
        }

        updateElapsedTime(view) {
            if (!this.startTime) return;
            
            var elapsed = Date.now() - this.startTime.getTime();
            var elapsedEl = view.querySelector('#elapsedTime');
            elapsedEl.textContent = t('ui.elapsedPrefix') + this.formatElapsed(elapsed);
        }

        fetchProgress(view, forceFullRender) {
            var self = this;
            
            return ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Progress', { SummaryOnly: !forceFullRender }),
                dataType: 'json'
            }).then(function(progress) {
                return self.updateProgressUI(view, progress, !forceFullRender);
            }).catch(function(err) {
                console.error('Error fetching progress:', err);
                return null;
            });
        }

        startRefresh(view) {
            var self = this;

            // Check for API keys first
            ApiClient.getPluginConfiguration(pluginId).then(function(config) {
                if (!config.OmdbApiKey && !config.MdbListApiKey && !config.EnableImdbScraping) {
                    toast({ text: t('toast.noKeys') });
                    return;
                }

                if (!config.UpdateMovies && !config.UpdateSeries && !config.UpdateEpisodes) {
                    toast({ text: t('toast.noItemTypes') });
                    return;
                }

                // Reset UI
                self.startTime = null;
                view.querySelector('#btnRunRefresh').classList.add('hide');
                view.querySelector('#btnCancelRefresh').classList.remove('hide');
                view.querySelector('#progressSection').classList.remove('hide');
                view.querySelector('#elapsedTime').textContent = '';
                view.querySelector('#etaBox').classList.add('hide');
                var smartNote = view.querySelector('#smartSkipNote');
                if (smartNote) {
                    smartNote.textContent = '';
                    smartNote.classList.add('hide');
                }
                self.setStatus(view, 'running', t('ui.starting'));
                
                // Reset stats display
                view.querySelector('#statProcessed').textContent = '0';
                view.querySelector('#statUpdated').textContent = '0';
                view.querySelector('#statUpdated').classList.remove('hasResults');
                view.querySelector('#statSkipped').textContent = '0';
                view.querySelector('#statErrors').textContent = '0';
                view.querySelector('#statErrors').classList.remove('hasResults');
                view.querySelector('#progressBarFill').style.width = '0%';
                view.querySelector('#progressBarText').textContent = '0%';
                view.querySelector('#currentItemBox').classList.add('hide');
                view.querySelector('#updatedBadge').textContent = '0';
                view.querySelector('#skippedBadge').textContent = '0';
                view.querySelector('#failureBadge').textContent = '0';
                view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">' + t('list.noUpdated') + '</li>';
                view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">' + t('list.noSkipped') + '</li>';
                view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">' + t('list.noFailures') + '</li>';

                // Get selection values
                var libraryId = view.querySelector('#selectLibrary').value;
                var seriesId = view.querySelector('#selectSeries').value;
                var seasonId = view.querySelector('#selectSeason').value;
                var episodeId = view.querySelector('#selectEpisode').value;
                var movieId = view.querySelector('#selectMovie').value;

                var addedWithinDays = 0;
                var addedWithinBox = view.querySelector('#addedWithinSelection');
                var addedWithinSelect = view.querySelector('#selectAddedWithin');
                if (addedWithinBox && !addedWithinBox.classList.contains('hide') && addedWithinSelect) {
                    addedWithinDays = parseInt(addedWithinSelect.value || '0', 10) || 0;
                }
                
                var fullLibrary = view.querySelector('#scanScope').value === 'all';
                if (fullLibrary) { libraryId = seriesId = seasonId = episodeId = movieId = ''; }
                else if (!libraryId) { self.stopRefresh(view); self.setStatus(view, 'warning', t('ui.chooseLibrary')); return; }
                self.launchScan(view, {
                    FullLibrary: fullLibrary,
                    LibraryId: libraryId || '', SeriesId: seriesId || '', SeasonId: seasonId || '',
                    EpisodeId: episodeId || '', MovieId: movieId || '', AddedWithinDays: addedWithinDays || 0
                });
            });
        }

        launchScan(view, payload) {
            var self = this;
            return ApiClient.ajax({ type: 'POST', url: ApiClient.getUrl('RatingSync/Start'),
                data: JSON.stringify(payload), contentType: 'application/json', dataType: 'json'
            }).then(function(result) {
                self.startTime = new Date();
                self.startPolling(view, result.TaskId || result.taskId);
            }).catch(function() {
                self.setStatus(view, 'error', t('ui.couldNotStart'));
                self.stopRefresh(view);
                toast({ text: t('toast.scanNotStarted') });
            });
        }

        startPolling(view, taskId) {
            var self = this;
            self._pollTick = 0;
            
            if (self.pollInterval) {
                clearInterval(self.pollInterval);
            }
            if (self.elapsedInterval) {
                clearInterval(self.elapsedInterval);
            }

            // Update elapsed time every second
            self.elapsedInterval = setInterval(function() {
                self.updateElapsedTime(view);
            }, 1000);

            var polling = false;
            self.pollInterval = setInterval(function() {
                if (polling) return;
                polling = true;
                self._pollTick++;
                self.fetchProgress(view, self._pollTick % 4 === 0).then(function() {
                    if (self._pollTick % 4 === 0) self.updateApiCounters(view);
                    return ApiClient.getScheduledTask(taskId);
                }).then(function(task) {
                    if (task.State === 'Idle') return self.fetchProgress(view, true).then(function(stats) {
                        if (stats && !stats.isRunning) self.finishRefresh(view, stats);
                    });
                }).catch(function() {
                    self.setStatus(view, 'warning', t('ui.connectionInterrupted'));
                }).then(function() { polling = false; });
            }, 1500);
        }

        finishRefresh(view, stats) {
            var self = this;
            
            // Stop all intervals
            if (self.pollInterval) {
                clearInterval(self.pollInterval);
                self.pollInterval = null;
            }
            if (self.elapsedInterval) {
                clearInterval(self.elapsedInterval);
                self.elapsedInterval = null;
            }
            
            var updated = stats ? stats.updatedItems : 0;
            var skipped = stats ? stats.skippedItems : 0;
            var errors = stats ? stats.errorItems : 0;
            var cancelled = stats && stats.wasCancelled;
            var statusMessage = stats && stats.statusMessage;
            
            var statusText;
            var statusClass = errors > 0 ? 'error' : 'completed';
            if (cancelled) {
                statusClass = 'warning';
                statusText = t('ui.cancelledWith', { n: updated });
            } else if (statusMessage && (!stats || stats.totalItems === 0)) {
                statusClass = 'warning';
                statusText = localizeDetail(statusMessage);
            } else {
                statusText = t('ui.completedWith', { n: updated });
            }
            if (!cancelled && skipped > 0) statusText += t('ui.skippedSuffix', { n: skipped });
            if (errors > 0) statusText += t('ui.errorsSuffix', { n: errors });
            
            self.setStatus(view, statusClass, statusText);
            self.stopRefresh(view);
            
            // Hide ETA
            view.querySelector('#etaBox').classList.add('hide');
            
            // Final elapsed time update
            self.updateElapsedTime(view);
            self.updateApiCounters(view);
        }

        cancelRefresh(view) {
            var self = this;
            
            self.setStatus(view, 'warning', t('ui.cancelling'));
            
            ApiClient.getScheduledTasks().then(function(tasks) {
                var task = tasks.find(function(t) { return t.Key === 'RatingSync'; });
                if (task && task.State === 'Running') {
                    ApiClient.stopScheduledTask(task.Id).then(function() {
                        self.setStatus(view, 'idle', t('ui.cancelled'));
                        self.stopRefresh(view);
                    });
                } else {
                    self.stopRefresh(view);
                }
            });
        }

        stopRefresh(view) {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
            
            view.querySelector('#btnRunRefresh').classList.remove('hide');
            view.querySelector('#btnCancelRefresh').classList.add('hide');
            view.querySelector('#currentItemBox').classList.add('hide');
        }

        clearResults(view) {
            var self = this;
            
            ApiClient.ajax({
                type: 'POST',
                url: ApiClient.getUrl('RatingSync/ClearProgress')
            }).then(function() {
                view.querySelector('#statProcessed').textContent = '0';
                view.querySelector('#statUpdated').textContent = '0';
                view.querySelector('#statUpdated').classList.remove('hasResults');
                view.querySelector('#statSkipped').textContent = '0';
                view.querySelector('#statErrors').textContent = '0';
                view.querySelector('#statErrors').classList.remove('hasResults');
                view.querySelector('#progressBarFill').style.width = '0%';
                view.querySelector('#progressBarText').textContent = '0%';
                view.querySelector('#elapsedTime').textContent = '';
                view.querySelector('#updatedBadge').textContent = '0';
                view.querySelector('#skippedBadge').textContent = '0';
                view.querySelector('#failureBadge').textContent = '0';
                view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">' + t('list.noUpdated') + '</li>';
                view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">' + t('list.noSkipped') + '</li>';
                view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">' + t('list.noFailures') + '</li>';
                self.startTime = null;
                self.setStatus(view, 'idle', t('ui.ready'));
            }).catch(function() {
                // Just clear locally if API fails
                view.querySelector('#statProcessed').textContent = '0';
                view.querySelector('#statUpdated').textContent = '0';
                view.querySelector('#statUpdated').classList.remove('hasResults');
                view.querySelector('#statSkipped').textContent = '0';
                view.querySelector('#statErrors').textContent = '0';
                view.querySelector('#statErrors').classList.remove('hasResults');
                view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">' + t('list.noUpdated') + '</li>';
                view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">' + t('list.noSkipped') + '</li>';
                view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">' + t('list.noFailures') + '</li>';
            });
        }

        checkInitialState(view) {
            var self = this;
            
            // First, always fetch existing progress to restore UI state
            self.fetchProgress(view, true).then(function(stats) {
                // Check if task is currently running
                ApiClient.getScheduledTasks().then(function(tasks) {
                    var task = tasks.find(function(t) { return t.Key === 'RatingSync'; });
                    
                    if (task && task.State === 'Running') {
                        // Task is running — always resume polling (even if ProgressTracker hasn't flipped yet)
                        view.querySelector('#btnRunRefresh').classList.add('hide');
                        view.querySelector('#btnCancelRefresh').classList.remove('hide');
                        view.querySelector('#progressSection').classList.remove('hide');
                        self.setStatus(view, 'running', t('ui.running'));
                        self.startPolling(view, task.Id);
                    } else {
                        // Task not running
                        if (stats && stats.statusMessage && stats.totalItems === 0) {
                            self.setStatus(view, 'warning', localizeDetail(stats.statusMessage));
                        } else if (stats && stats.totalItems > 0) {
                            var statusText = t('ui.runSummary', { u: stats.updatedItems, s: stats.skippedItems });
                            if (stats.errorItems > 0) {
                                statusText += t('ui.errorsSuffix', { n: stats.errorItems });
                            }
                            if (stats.wasCancelled) {
                                self.setStatus(view, 'warning', t('ui.lastRunCancelled', { status: statusText }));
                            } else {
                                self.setStatus(view, stats.errorItems > 0 ? 'error' : 'completed', t('ui.lastRun', { status: statusText }));
                            }
                        }
                    }
                });
            });
        }

        onResume(options) {
            super.onResume(options);
            var self = this;
            var view = this.view;

            // Translate the static markup once per resume. Dynamic content is
            // localized at render time with t() / localizeDetail().
            translateDom(view);

            if (!self._uiBound) {
                self._uiBound = true;
                self.bindTabNavigation(view);
                self.bindResultTabs(view);
                self.bindLibrarySelection(view);
                view.querySelector('#scanScope').addEventListener('change', function() {
                    var target = this.value === 'target';
                    view.querySelector('#targetSelection').classList.toggle('hide', !target);
                    view.querySelector('#scopeInfo').textContent = target ? t('ui.scopeInfoTarget') : t('ui.scopeInfoSaved');
                });
                view.querySelectorAll('[data-history-view]').forEach(function(button) {
                    button.addEventListener('click', function() {
                        view.querySelectorAll('[data-history-view]').forEach(function(b) { b.classList.toggle('active', b === button); });
                        ['historyScansPanel','historyMissingPanel','historyItemsPanel'].forEach(function(id) { view.querySelector('#'+id).classList.toggle('hide', id !== button.dataset.historyView); });
                    });
                });
                view.querySelector('#historyOutcome').addEventListener('change', function() { self.renderScanHistory(view); });

                var form = view.querySelector('.imdbRefreshConfigForm');
                if (form) {
                    form.addEventListener('submit', function (e) {
                        e.preventDefault();
                        self.saveConfig(view);
                        return false;
                    });
                }

                var btnRun = view.querySelector('#btnRunRefresh');
                if (btnRun) {
                    btnRun.addEventListener('click', function() {
                        self.startRefresh(view);
                    });
                }

                var btnCancel = view.querySelector('#btnCancelRefresh');
                if (btnCancel) {
                    btnCancel.addEventListener('click', function() {
                        self.cancelRefresh(view);
                    });
                }

                var btnClearResults = view.querySelector('#btnClearResults');
                if (btnClearResults) {
                    btnClearResults.addEventListener('click', function() {
                        self.clearResults(view);
                    });
                }

                var chkOmdbRateLimit = view.querySelector('#chkOmdbRateLimit');
                if (chkOmdbRateLimit) {
                    chkOmdbRateLimit.addEventListener('change', function() {
                        view.querySelector('#omdbLimitOptions').style.display = this.checked ? 'block' : 'none';
                    });
                }

                var chkTieredRescan = view.querySelector('#chkTieredRescan');
                if (chkTieredRescan) {
                    chkTieredRescan.addEventListener('change', function() {
                        view.querySelector('#tieredRescanOptions').style.display = this.checked ? 'block' : 'none';
                    });
                }

                var chkMdbListRateLimit = view.querySelector('#chkMdbListRateLimit');
                if (chkMdbListRateLimit) {
                    chkMdbListRateLimit.addEventListener('change', function() {
                        view.querySelector('#mdblistLimitOptions').style.display = this.checked ? 'block' : 'none';
                    });
                }

                var btnLoadMissing = view.querySelector('#btnLoadMissing');
                if (btnLoadMissing) {
                    btnLoadMissing.addEventListener('click', function() {
                        self.loadMissingData(view);
                    });
                }

                var btnScanMissingSelected = view.querySelector('#btnScanMissingSelected');
                if (btnScanMissingSelected) {
                    btnScanMissingSelected.addEventListener('click', function() {
                        self.scanSelectedMissingItem(view);
                    });
                }

                var missingDataType = view.querySelector('#missingDataType');
                if (missingDataType) {
                    missingDataType.addEventListener('change', function() {
                        if (self.missingDataCache) {
                            self.renderMissingData(view, self.missingDataCache);
                        }
                    });
                }

                var missingDataIssue = view.querySelector('#missingDataIssue');
                if (missingDataIssue) {
                    missingDataIssue.addEventListener('change', function() {
                        if (self.missingDataCache) {
                            self.renderMissingData(view, self.missingDataCache);
                        }
                    });
                }

                var btnSearchHistory = view.querySelector('#btnSearchHistory');
                if (btnSearchHistory) {
                    btnSearchHistory.addEventListener('click', function() {
                        self.searchItemHistory(view);
                    });
                }

                var txtItemSearch = view.querySelector('#txtItemSearch');
                if (txtItemSearch) {
                    txtItemSearch.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            self.searchItemHistory(view);
                        }
                    });
                }

                var btnCloseScanReport = view.querySelector('#btnCloseScanReport');
                if (btnCloseScanReport) {
                    btnCloseScanReport.addEventListener('click', function() {
                        self.closeScanReport(view);
                    });
                }

                var scanReportBackdrop = view.querySelector('#scanReportBackdrop');
                if (scanReportBackdrop) {
                    scanReportBackdrop.addEventListener('click', function() {
                        self.closeScanReport(view);
                    });
                }

                var btnCopyScanReport = view.querySelector('#btnCopyScanReport');
                if (btnCopyScanReport) {
                    btnCopyScanReport.addEventListener('click', function() {
                        self.copyScanReportToClipboard(view);
                    });
                }

                var btnDeleteScan = view.querySelector('#btnDeleteScan');
                if (btnDeleteScan) {
                    btnDeleteScan.addEventListener('click', function() {
                        var sessionId = self.activeScanReportSession && self.activeScanReportSession.SessionId;
                        self.deleteScanBySessionId(view, sessionId);
                    });
                }

                if (!self._scanReportKeydownBound) {
                    self._scanReportKeydownBound = true;
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'Escape') {
                            var modal = view.querySelector('#scanReportModal');
                            if (modal && !modal.classList.contains('hide')) {
                                self.closeScanReport(view);
                            }
                        }
                    });
                }
            }

            // Load configuration
            self.loadConfig(view);

            // Load API counters
            self.updateApiCounters(view);

            // Load libraries
            self.loadLibraries(view);

            self.updateAddedWithinVisibility(view);

            // Check if task is already running and restore state
            self.checkInitialState(view);
        }

        // History tab methods
        loadScanHistory(view) {
            var self = this;
            var container = view.querySelector('#sessionList');
            container.innerHTML = '<p class="loadingText">' + t('history.loading') + '</p>';
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/History', { Count: 20 }),
                dataType: 'json'
            }).then(function(sessions) {
                self.scanHistorySessions = sessions || [];

                self.renderScanHistory(view);
            }).catch(function(err) {
                console.error('Error loading scan history:', err);
                container.innerHTML = '<p class="emptyText">' + t('history.error') + '</p>';
            });
        }

        renderScanHistory(view) {
            var self = this;
            var container = view.querySelector('#sessionList');
            var sessions = this.scanHistorySessions || [];
                if (!sessions || sessions.length === 0) {
                    container.innerHTML = '<p class="emptyText">' + t('history.empty') + '</p>';
                    return;
                }
                
                var filter = view.querySelector('#historyOutcome').value;
                var html = '<table class="scanTable"><thead><tr><th>' + t('history.started') + '</th><th>' + t('history.result') + '</th><th>' + t('history.changes') + '</th><th>' + t('history.duration') + '</th><th></th></tr></thead><tbody>';
                var matches = 0;
                sessions.forEach(function(session, idx) {
                    if (filter === 'updated' && !session.UpdatedItems || filter === 'errors' && !session.ErrorItems || filter === 'cancelled' && !session.WasCancelled) return;
                    matches++;
                    var start = new Date(session.StartTime);
                    var duration = session.EndTime ? self.formatElapsed(new Date(session.EndTime)-start) : t('history.running');
                    var outcome = session.WasCancelled ? t('history.stopped') : session.ErrorItems ? t('history.needsAttention') : !session.EndTime ? t('history.running') : t('history.complete');
                    var changes = session.UpdatedItems ? session.UpdatedItems + ' ' + t('history.updatedUnit') : t('history.noChanges');
                    if (session.ErrorItems) changes += ' · ' + session.ErrorItems + ' ' + t('history.errorsUnit');
                    html += '<tr class="sessionCard" data-index="'+idx+'" tabindex="0"><td>'+self.escapeHtml(self.formatDateTime(start))+'<small>'+self.escapeHtml(scopeLabel(session.Scope))+'</small></td><td class="outcome-'+(session.ErrorItems ? 'error' : !session.EndTime ? 'running' : session.WasCancelled ? 'stopped' : 'complete')+'">'+outcome+'</td><td>'+changes+'<small>'+session.ProcessedItems+' '+t('history.processedUnit')+(session.SkippedItems ? ' · '+session.SkippedItems+' '+t('history.skippedUnit') : '')+'</small></td><td>'+duration+'</td><td><button type="button">' + t('history.view') + '</button></td></tr>';
                });
                html += '</tbody></table>';
                if (!matches) html = '<p class="emptyText">' + t('history.noMatch') + '</p>';
                container.innerHTML = html;

                // Click-to-open report (event delegation)
                container.onclick = function(e) {
                    var del = e.target && e.target.closest ? e.target.closest('.sessionDeleteBtn') : null;
                    if (del) {
                        e.preventDefault();
                        e.stopPropagation();
                        var sid = del.getAttribute('data-session-id');
                        self.deleteScanBySessionId(view, sid);
                        return;
                    }

                    var card = e.target && e.target.closest ? e.target.closest('.sessionCard') : null;
                    if (!card) return;
                    var index = parseInt(card.getAttribute('data-index') || '', 10);
                    if (isNaN(index) || !self.scanHistorySessions || !self.scanHistorySessions[index]) return;
                    self.openScanReport(view, self.scanHistorySessions[index]);
                };

                // Keyboard support
                container.onkeydown = function(e) {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    var card = e.target && e.target.classList && e.target.classList.contains('sessionCard') ? e.target : null;
                    if (!card) return;
                    e.preventDefault();
                    var index = parseInt(card.getAttribute('data-index') || '', 10);
                    if (isNaN(index) || !self.scanHistorySessions || !self.scanHistorySessions[index]) return;
                    self.openScanReport(view, self.scanHistorySessions[index]);
                };
        }

        openScanReport(view, session) {
            var self = this;
            var modal = view.querySelector('#scanReportModal');
            if (!modal) return;

            this.activeScanReportSession = session || null;
            this.activeScanReport = null;
            this.scanReportState = {
                activeTab: session && session.ErrorItems ? 'errors' : session && session.UpdatedItems ? 'updated' : 'skipped',
                filterText: '',
                pageSize: 100,
                page: { updated: 1, skipped: 1, errors: 1 }
            };

            var title = view.querySelector('#scanReportTitle');
            if (title) {
                var startDate = session && session.StartTime ? new Date(session.StartTime) : null;
                title.textContent = startDate ? (t('report.titleWithDate', { date: this.formatDateTime(startDate) })) : t('report.title');
            }

            var body = view.querySelector('#scanReportBody');
            if (body) {
                body.innerHTML = '<p class="loadingText">' + t('report.loading') + '</p>';
            }

            // Load full report if available; otherwise fallback to session summary
            var sessionId = session && session.SessionId ? session.SessionId : null;
            if (sessionId) {
                ApiClient.ajax({
                    type: 'GET',
                    url: ApiClient.getUrl('RatingSync/HistoryReport', { SessionId: sessionId }),
                    dataType: 'json'
                }).then(function(report) {
                    self.activeScanReport = report || null;
                    self.rerenderScanReport(view);
                }).catch(function() {
                    self.activeScanReport = null;
                    self.rerenderScanReport(view);
                });
            } else {
                this.rerenderScanReport(view);
            }

            modal.classList.remove('hide');
        }

        bindScanReportBodyEvents(view) {
            var self = this;
            var body = view.querySelector('#scanReportBody');
            if (!body) return;

            // Tab switching + pagination + filter + download
            body.onclick = function(e) {
                var tab = e.target && e.target.closest ? e.target.closest('[data-report-tab]') : null;
                if (tab) {
                    var t = tab.getAttribute('data-report-tab');
                    if (t) {
                        self.scanReportState.activeTab = t;
                        self.rerenderScanReport(view);
                    }
                    return;
                }

                var btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                if (!btn) return;
                var action = btn.getAttribute('data-action');
                if (!action) return;

                if (action === 'prev-updated') self.scanReportState.page.updated = Math.max(1, (self.scanReportState.page.updated || 1) - 1);
                if (action === 'next-updated') self.scanReportState.page.updated = (self.scanReportState.page.updated || 1) + 1;
                if (action === 'prev-skipped') self.scanReportState.page.skipped = Math.max(1, (self.scanReportState.page.skipped || 1) - 1);
                if (action === 'next-skipped') self.scanReportState.page.skipped = (self.scanReportState.page.skipped || 1) + 1;
                if (action === 'prev-errors') self.scanReportState.page.errors = Math.max(1, (self.scanReportState.page.errors || 1) - 1);
                if (action === 'next-errors') self.scanReportState.page.errors = (self.scanReportState.page.errors || 1) + 1;

                if (action === 'download-json') {
                    self.downloadScanReportJson();
                    return;
                }

                self.rerenderScanReport(view);
            };

            var filter = body.querySelector('#scanReportFilter');
            if (filter) {
                filter.oninput = function() {
                    self.scanReportState.filterText = filter.value || '';
                    self.scanReportState.page.updated = 1;
                    self.scanReportState.page.skipped = 1;
                    self.scanReportState.page.errors = 1;
                    self.rerenderScanReport(view);
                };
            }

            var pageSize = body.querySelector('#scanReportPageSize');
            if (pageSize) {
                pageSize.onchange = function() {
                    self.scanReportState.pageSize = parseInt(pageSize.value || '100', 10) || 100;
                    self.scanReportState.page.updated = 1;
                    self.scanReportState.page.skipped = 1;
                    self.scanReportState.page.errors = 1;
                    self.rerenderScanReport(view);
                };
            }
        }

        rerenderScanReport(view) {
            var body = view.querySelector('#scanReportBody');
            if (!body) return;
            body.innerHTML = this.renderScanReportHtml(this.activeScanReport, this.activeScanReportSession);
            this.bindScanReportBodyEvents(view);
        }

        closeScanReport(view) {
            var modal = view.querySelector('#scanReportModal');
            if (!modal) return;
            if (modal.classList.contains('hide')) return;
            modal.classList.add('hide');
        }

        renderScanReportHtml(report, sessionFallback) {
            var self = this;

            var isLegacy = !report;
            var src = report || sessionFallback;
            if (!src) {
                return '<p class="emptyText">' + t('report.noData') + '</p>';
            }

            var startDate = src.StartTime ? new Date(src.StartTime) : null;
            var endDate = src.EndTime ? new Date(src.EndTime) : null;
            var duration = (startDate && endDate)
                ? self.formatElapsed(endDate - startDate)
                : (src.WasCancelled ? t('ui.cancelled') : (endDate ? '' : t('ui.inProgress')));

            var statusText;
            if (!endDate && !src.WasCancelled) statusText = t('ui.inProgress');
            else if (src.WasCancelled) statusText = t('ui.cancelled');
            else if ((src.ErrorItems || 0) > 0) statusText = t('report.statusCompletedWithErrors');
            else statusText = t('report.statusCompleted');

            var processed = (typeof src.ProcessedItems === 'number' && src.ProcessedItems >= 0)
                ? src.ProcessedItems
                : src.TotalItems;

            var updatedEntries = report
                ? (report.Updated || []).map(function(e) { return { name: e.Name, detail: e.Detail, changes: e.Changes || [] }; })
                : self.objectToPairs(src.UpdatedDetails);
            var skippedEntries = report
                ? (report.Skipped || []).map(function(e) { return { name: e.Name, detail: e.Detail, changes: e.Changes || [] }; })
                : self.objectToPairs(src.SkippedDetails);
            var errorEntries = report
                ? (report.Errors || []).map(function(e) { return { name: e.Name, detail: e.Detail, changes: e.Changes || [] }; })
                : self.objectToPairs(src.FailureDetails);

            if ((!updatedEntries || updatedEntries.length === 0) && src.UpdatedItemNames && src.UpdatedItemNames.length > 0) {
                updatedEntries = src.UpdatedItemNames.map(function(n) { return { name: n, detail: '' }; });
            }

            var state = self.scanReportState || { activeTab: 'overview', filterText: '', pageSize: 100, page: { updated: 1, skipped: 1, errors: 1 } };
            var filterText = (state.filterText || '').toLowerCase();
            var pageSize = state.pageSize || 100;

            updatedEntries = self.applyEntryFilter(updatedEntries, filterText);
            skippedEntries = self.applyEntryFilter(skippedEntries, filterText);
            errorEntries = self.applyEntryFilter(errorEntries, filterText);

            var summary = self.buildReportSummary(updatedEntries, skippedEntries, errorEntries);

            var html = '';
            if (isLegacy) {
                html += '<div class="noteBox">' + t('report.legacy') + '</div>';
            }

            html += '<div class="reportMeta">';
            html += self.reportMetaBox('result', statusText);
            html += self.reportMetaBox('processed', processed + ' / ' + src.TotalItems);
            html += self.reportMetaBox('duration', duration);
            html += '</div>';
            html += '<details class="scanTechnical"><summary>' + t('report.scanDetails') + '</summary><div class="reportMeta">';
            html += self.reportMetaBox('started', startDate ? self.formatDateTime(startDate) : '');
            html += self.reportMetaBox('finished', endDate ? self.formatDateTime(endDate) : '');
            html += self.reportMetaBox('omdbCalls', String(src.OmdbRequests || 0));
            html += self.reportMetaBox('mdbCalls', String(src.MdbListRequests || 0));
            html += self.reportMetaBox('imdbFallback', String(src.ImdbScrapeRequests || 0));
            html += '</div></details>';

            html += '<div class="reportFilterRow">';
            html += '<input id="scanReportFilter" type="text" placeholder="' + self.escapeHtml(t('report.searchPlaceholder')) + '" value="' + self.escapeHtml(state.filterText || '') + '" />';
            html += '<select id="scanReportPageSize" style="padding:0.55em 0.7em;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.35);color:rgba(255,255,255,0.9)">'
                + '<option value="50"' + (pageSize === 50 ? ' selected' : '') + '>' + self.escapeHtml(t('report.perPage', { n: 50 })) + '</option>'
                + '<option value="100"' + (pageSize === 100 ? ' selected' : '') + '>' + self.escapeHtml(t('report.perPage', { n: 100 })) + '</option>'
                + '<option value="250"' + (pageSize === 250 ? ' selected' : '') + '>' + self.escapeHtml(t('report.perPage', { n: 250 })) + '</option>'
                + '</select>';
            html += '<button type="button" class="reportSmallBtn" data-action="download-json"' + (report ? '' : ' disabled') + '>' + self.escapeHtml(t('report.downloadJson')) + '</button>';
            html += '</div>';

            html += self.renderReportTabs(state.activeTab, updatedEntries.length, skippedEntries.length, errorEntries.length);

            if (state.activeTab === 'overview') {
                html += self.renderOverviewSummary(summary);
            } else if (state.activeTab === 'updated') {
                html += self.renderPagedList(t('report.updatedItems'), updatedEntries, 'updated', pageSize, state.page.updated || 1, 'prev-updated', 'next-updated');
            } else if (state.activeTab === 'skipped') {
                html += self.renderPagedList(t('report.skippedItems'), skippedEntries, 'skipped', pageSize, state.page.skipped || 1, 'prev-skipped', 'next-skipped');
            } else if (state.activeTab === 'errors') {
                html += self.renderPagedList(t('report.errors'), errorEntries, 'failure', pageSize, state.page.errors || 1, 'prev-errors', 'next-errors');
            }

            return html;
        }

        reportMetaBox(key, value) {
            var tone = 'tone-neutral';
            if (key === 'updated') tone = 'tone-updated';
            else if (key === 'skipped') tone = 'tone-skipped';
            else if (key === 'errors') tone = 'tone-errors';
            else if (key === 'status') tone = 'tone-status';
            else if (key === 'processed') tone = 'tone-neutral';
            else if (key === 'started' || key === 'finished' || key === 'duration') tone = 'tone-time';

            return '<div class="reportMetaBox ' + tone + '">'
                + '<div class="reportMetaLabel">' + this.escapeHtml(t('report.' + key)) + '</div>'
                + '<div class="reportMetaValue">' + this.escapeHtml(value || '') + '</div>'
                + '</div>';
        }

        renderReportTabs(activeTab, updatedCount, skippedCount, errorCount) {
            var tab = function(id, label, count) {
                var cls = 'reportSmallBtn' + (activeTab === id ? ' ui-btn-active' : '');
                var countText = (count === '' || count === null || typeof count === 'undefined') ? '' : (' (' + count + ')');
                return '<button type="button" class="' + cls + '" data-report-tab="' + id + '">' + label + countText + '</button>';
            };

            var html = '<div class="reportFilterRow" style="margin-top:-0.25em">';
            html += tab('overview', t('report.overview'), '');
            html += tab('updated', t('report.updated'), updatedCount);
            html += tab('skipped', t('report.skipped'), skippedCount);
            html += tab('errors', t('report.errors'), errorCount);
            html += '</div>';
            return html;
        }

        renderOverviewSummary(summary) {
            var self = this;
            var html = '';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-updated">' + self.escapeHtml(t('report.byType')) + '</h4>';
            html += self.renderCountChips(summary.updatedByType, 'updated');
            html += '</div>';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-updated">' + self.escapeHtml(t('report.bySource')) + '</h4>';
            html += self.renderCountChips(summary.updatedBySource, 'updated');
            html += '</div>';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-skipped">' + self.escapeHtml(t('report.topSkip')) + '</h4>';
            html += self.renderCountChips(summary.skippedByReason, 'skipped');
            html += '</div>';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-errors">' + self.escapeHtml(t('report.topErrors')) + '</h4>';
            html += self.renderCountChips(summary.errorsByMessage, 'errors');
            html += '</div>';

            return html;
        }

        renderCountChips(countsObj, tone) {
            var entries = Object.keys(countsObj || {}).map(function(k) { return { key: k, count: countsObj[k] }; });
            entries.sort(function(a, b) { return b.count - a.count; });
            if (entries.length === 0) return '<p class="reportNote">' + this.escapeHtml(t('report.noDataChip')) + '</p>';

            var html = '<div style="display:flex;flex-wrap:wrap;gap:0.5em">';
            entries.slice(0, 20).forEach(function(e) {
                html += '<span class="reportChip ' + this.escapeHtml('tone-' + (tone || 'neutral')) + '">' 
                    + '<span class="reportChipCount">' + e.count + '</span>'
                    + '<span class="reportChipText">' + this.escapeHtml(localizeDetail(e.key)) + '</span>'
                    + '</span>';
            }.bind(this));
            html += '</div>';
            return html;
        }

        normalizeSkippedReason(reason) {
            if (!reason) return reason;
            var text = String(reason).trim();
            // Drop trailing "(6.9)" / "(75%)" / etc to avoid splitting the same reason by rating value.
            var m = text.match(/^(.*?)(\s*\(([^)]*)\))\s*$/);
            if (m && m[3] && /[0-9]/.test(m[3])) {
                text = (m[1] || '').trim();
            }
            return text.replace(/\s+/g, ' ').trim();
        }

        buildReportSummary(updatedEntries, skippedEntries, errorEntries) {
            var self = this;
            var inc = function(obj, key) {
                if (!key) key = t('report.unknown');
                obj[key] = (obj[key] || 0) + 1;
            };

            var updatedByType = {};
            var updatedBySource = {};
            (updatedEntries || []).forEach(function(e) {
                var d = e && e.detail ? e.detail : '';
                var hasImdb = d.indexOf('IMDb community') >= 0 || d.indexOf('IMDb:') >= 0;
                var hasRt = d.indexOf('RT critic') >= 0 || d.indexOf('RT:') >= 0;
                var type = hasImdb && hasRt ? 'IMDb + RT' : (hasImdb ? t('report.typeImdb') : (hasRt ? t('report.typeRt') : t('report.typeOther')));
                inc(updatedByType, type);

                var src = self.extractSourceLabel(d);
                inc(updatedBySource, src || t('report.unknown'));
            });

            var skippedByReason = {};
            (skippedEntries || []).forEach(function(e) {
                var d = e && e.detail ? String(e.detail) : '';
                var primary = d.split(',')[0].trim();
                primary = self.normalizeSkippedReason(primary);
                inc(skippedByReason, primary || t('report.unknown'));
            });

            var errorsByMessage = {};
            (errorEntries || []).forEach(function(e) {
                var d = e && e.detail ? String(e.detail) : '';
                inc(errorsByMessage, d || t('report.unknown'));
            });

            return {
                updatedByType: updatedByType,
                updatedBySource: updatedBySource,
                skippedByReason: skippedByReason,
                errorsByMessage: errorsByMessage
            };
        }

        extractSourceLabel(detail) {
            if (!detail) return null;
            var match = String(detail).match(/\(([^()]+)\)\s*$/);
            return match && match[1] ? match[1] : null;
        }

        renderPagedList(title, entries, typeClass, pageSize, page, prevAction, nextAction) {
            entries = entries || [];
            page = page || 1;
            pageSize = pageSize || 100;
            var total = entries.length;
            var pages = Math.max(1, Math.ceil(total / pageSize));
            if (page > pages) page = pages;
            var start = (page - 1) * pageSize;
            var slice = entries.slice(start, start + pageSize);

            var html = '<div class="reportSection">';
            html += '<h4>' + this.escapeHtml(title) + '</h4>';

            html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.75em;flex-wrap:wrap;margin:0.25em 0 0.75em 0">';
            html += '<div class="reportNote" style="margin:0">' + this.escapeHtml(t('report.showing', { from: (total === 0 ? 0 : (start + 1)), to: Math.min(total, start + pageSize), total: total })) + '</div>';
            html += '<div style="display:flex;gap:0.5em">'
                + '<button type="button" class="reportSmallBtn" data-action="' + prevAction + '"' + (page <= 1 ? ' disabled' : '') + '>' + this.escapeHtml(t('report.prev')) + '</button>'
                + '<button type="button" class="reportSmallBtn" data-action="' + nextAction + '"' + (page >= pages ? ' disabled' : '') + '>' + this.escapeHtml(t('report.next')) + '</button>'
                + '</div>';
            html += '</div>';

            if (slice.length === 0) {
                html += '<p class="reportNote">' + this.escapeHtml(t('report.noItems')) + '</p>';
                html += '</div>';
                return html;
            }

            html += '<ul class="reportList">';
            slice.forEach(function(item) {
                var name = item && item.name ? item.name : '';
                var rawDetail = item && item.detail ? item.detail : '';
                var detail = localizeDetail(rawDetail);
                html += '<li class="reportListItem ' + typeClass + '"><div class="reportItemName">' + this.escapeHtml(name) + '</div><div class="reportItemDetail">';
                if (item.changes && item.changes.length) {
                    html += '<div class="ratingChange resultColumns"><span>' + this.escapeHtml(t('report.colRating')) + '</span><span>' + this.escapeHtml(t('report.colBefore')) + '</span><span>' + this.escapeHtml(t('report.colAfter')) + '</span><span>' + this.escapeHtml(t('report.colSource')) + '</span></div>';
                    item.changes.forEach(function(change) {
                        html += '<div class="ratingChange"><span>'+this.escapeHtml(localizeDetail(change.Rating))+'</span><span>'+this.escapeHtml(change.Before == null ? '—' : change.Before)+'</span><span>'+this.escapeHtml(change.After)+'</span><span>'+this.escapeHtml(localizeDetail(change.Source))+'</span></div>';
                    }, this);
                } else if (typeClass === 'skipped') {
                    html += /already matches|already current/i.test(rawDetail) ? t('list.alreadyCurrent') : /missing.*(id|index|metadata)/i.test(rawDetail) ? t('list.missingMetadata') : t('list.ratingUnavailable');
                    html += '<details><summary>' + this.escapeHtml(t('list.details')) + '</summary><p>'+this.escapeHtml(detail)+'</p></details>';
                } else html += this.escapeHtml(detail);
                html += '</div></li>';
            }.bind(this));
            html += '</ul>';
            html += '</div>';
            return html;
        }

        downloadScanReportJson() {
            var report = this.activeScanReport;
            if (!report) {
                toast(t('toast.reportUnavailable'));
                return;
            }
            try {
                var json = JSON.stringify(report, null, 2);
                var blob = new Blob([json], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'rating-sync-scan-report-' + (report.SessionId || 'report') + '.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function() { URL.revokeObjectURL(url); }, 250);
            } catch (e) {
                toast(t('toast.downloadFailed'));
            }
        }

        applyEntryFilter(entries, filterText) {
            if (!filterText) return entries || [];
            var ft = String(filterText).toLowerCase();
            return (entries || []).filter(function(e) {
                var name = (e && (e.Name || e.name) ? String(e.Name || e.name) : '').toLowerCase();
                var detail = (e && (e.Detail || e.detail) ? String(e.Detail || e.detail) : '').toLowerCase();
                return name.indexOf(ft) >= 0 || detail.indexOf(ft) >= 0;
            });
        }

        objectToPairs(obj) {
            if (!obj) return [];
            var keys = Object.keys(obj);
            keys.sort();
            return keys.map(function(k) { return { name: k, detail: obj[k] }; });
        }

        copyScanReportToClipboard(view) {
            var text = this.buildScanReportText(this.activeScanReport, this.activeScanReportSession);
            if (!text) {
                toast(t('toast.noReportToCopy'));
                return;
            }
            if (!navigator.clipboard || !navigator.clipboard.writeText) {
                toast(t('toast.clipboardUnavailable'));
                return;
            }

            navigator.clipboard.writeText(text).then(function() {
                toast(t('toast.reportCopied'));
            }).catch(function() {
                toast(t('toast.copyFailed'));
            });
        }

        buildScanReportText(report, sessionFallback) {
            var src = report || sessionFallback;
            if (!src) return null;

            var startDate = src.StartTime ? new Date(src.StartTime) : null;
            var endDate = src.EndTime ? new Date(src.EndTime) : null;
            var lines = [];
            lines.push(t('copy.title'));
            if (startDate) lines.push(t('copy.started') + this.formatDateTime(startDate));
            if (endDate) lines.push(t('copy.finished') + this.formatDateTime(endDate));
            lines.push(t('copy.total') + (src.TotalItems || 0));
            lines.push(t('copy.processed') + ((typeof src.ProcessedItems === 'number') ? src.ProcessedItems : (src.TotalItems || 0)));
            lines.push(t('report.updated') + ': ' + (src.UpdatedItems || 0));
            lines.push(t('report.skipped') + ': ' + (src.SkippedItems || 0));
            lines.push(t('report.errors') + ': ' + (src.ErrorItems || 0));
            lines.push('');

            var addList = function(title, list) {
                lines.push(title + ':');
                (list || []).forEach(function(e) {
                    var name = e && (e.Name || e.name) ? (e.Name || e.name) : '';
                    var detail = e && (e.Detail || e.detail) ? (e.Detail || e.detail) : '';
                    var line = '- ' + name;
                    if (detail) line += ' — ' + detail;
                    lines.push(line);
                });
                lines.push('');
            };

            if (report) {
                addList(t('report.updated'), report.Updated);
                addList(t('report.skipped'), report.Skipped);
                addList(t('report.errors'), report.Errors);
            } else {
                addList(t('report.updated'), this.objectToPairs(src.UpdatedDetails));
                addList(t('report.skipped'), this.objectToPairs(src.SkippedDetails));
                addList(t('report.errors'), this.objectToPairs(src.FailureDetails));
            }

            return lines.join('\n');
        }

        loadMissingData(view) {
            var self = this;
            var container = view.querySelector('#missingDataContainer');
            var type = view.querySelector('#missingDataType').value;

            self.selectedMissingId = null;
            self.selectedMissingItem = null;
            var scanBtn = view.querySelector('#btnScanMissingSelected');
            if (scanBtn) scanBtn.disabled = true;
            
            container.innerHTML = '<p class="loadingText">' + t('missing.searching') + '</p>';
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/MissingData', { Type: type }),
                dataType: 'json'
            }).then(function(items) {
                self.missingDataCache = items || [];
                if (!items || items.length === 0) {
                    container.innerHTML = '<p class="emptyText">' + t('missing.none') + '</p>';
                    return;
                }

                self.renderMissingData(view, items);
            }).catch(function(err) {
                console.error('Error loading missing data:', err);
                container.innerHTML = '<p class="emptyText">' + t('missing.error') + '</p>';
            });
        }

        renderMissingData(view, items) {
            var self = this;
            var container = view.querySelector('#missingDataContainer');
            var issue = (view.querySelector('#missingDataIssue') && view.querySelector('#missingDataIssue').value) || '';
            var selectedType = (view.querySelector('#missingDataType') && view.querySelector('#missingDataType').value) || '';
            var showEpisodeContext = (selectedType === '' || selectedType === 'episodes');

            var filtered = (items || []).filter(function(item) {
                if (!issue) return true;
                var reason = item && item.MissingReason ? item.MissingReason : '';
                if (issue === 'imdb') return reason.indexOf('No IMDb ID') >= 0;
                if (issue === 'community') return reason.indexOf('No Community Rating') >= 0;
                if (issue === 'critic') return reason.indexOf('No Critic Rating') >= 0;
                return true;
            });

            if (!filtered || filtered.length === 0) {
                container.innerHTML = '<p class="emptyText">' + t('missing.noMatch') + '</p>';
                return;
            }

            var html = '<table class="dataTable" id="missingDataTable">';
            html += '<thead><tr>';
            html += '<th>' + t('missing.colName') + '</th>';
            if (showEpisodeContext) {
                html += '<th>' + t('missing.colSeries') + '</th>';
                html += '<th>' + t('missing.colSeason') + '</th>';
            }
            html += '<th>' + t('missing.colType') + '</th>';
            html += '<th>' + t('missing.colImdb') + '</th>';
            html += '<th>' + t('missing.colCommunity') + '</th>';
            html += '<th>' + t('missing.colCritic') + '</th>';
            html += '<th>' + t('missing.colIssue') + '</th>';
            html += '</tr></thead>';
            html += '<tbody>';

            filtered.forEach(function(item, idx) {
                var typeClass = item.Type.toLowerCase();
                var isSelected = self.selectedMissingId && item.Id === self.selectedMissingId;
                html += '<tr data-index="' + idx + '"' + (isSelected ? ' class="selected"' : '') + '>';

                var displayName = item.Name;
                if (item.Year && displayName && displayName.indexOf('(' + item.Year + ')') === -1) {
                    displayName += ' (' + item.Year + ')';
                }

                html += '<td>' + self.escapeHtml(displayName) + '</td>';

                if (showEpisodeContext) {
                    var seriesName = item.SeriesName || '—';
                    var seasonText = '—';
                    if (item.SeasonNumber != null) {
                        var sn = item.SeasonNumber;
                        seasonText = 'S' + (sn < 10 ? '0' + sn : sn);
                    } else if (item.SeasonName) {
                        seasonText = item.SeasonName;
                    }

                    html += '<td>' + self.escapeHtml(seriesName) + '</td>';
                    html += '<td>' + self.escapeHtml(seasonText) + '</td>';
                }

                html += '<td><span class="type-badge ' + typeClass + '">' + self.escapeHtml(typeLabel(item.Type)) + '</span></td>';
                html += '<td class="' + (item.HasImdbId ? 'present' : 'missing') + '">' + (item.ImdbId || '—') + '</td>';
                html += '<td class="' + (item.HasCommunityRating ? 'present' : 'missing') + '">' + (item.CommunityRating ? item.CommunityRating.toFixed(1) : '—') + '</td>';
                html += '<td class="' + (item.HasCriticRating ? 'present' : 'missing') + '">' + (item.CriticRating ? item.CriticRating.toFixed(0) + '%' : '—') + '</td>';
                html += '<td>' + self.escapeHtml(localizeDetail(item.MissingReason)) + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            html += '<p style="padding: 0.75em 1em; font-size: 0.85em; color: rgba(255,255,255,0.5);">' + self.escapeHtml(t('missing.showing', { n: filtered.length })) + '</p>';

            container.innerHTML = html;

            // Bind row click -> select + run item history search
            var table = view.querySelector('#missingDataTable');
            if (!table) return;

            Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function(row) {
                row.addEventListener('click', function() {
                    var index = parseInt(row.getAttribute('data-index'), 10);
                    var selected = filtered[index];
                    if (!selected) return;

                    self.selectedMissingId = selected.Id;
                    self.selectedMissingItem = selected;

                    var scanBtn = view.querySelector('#btnScanMissingSelected');
                    if (scanBtn) scanBtn.disabled = false;

                    // Re-render to update selected row highlight
                    self.renderMissingData(view, self.missingDataCache || []);
                });
            });
        }

        scanSelectedMissingItem(view) {
            var self = this;
            var selected = self.selectedMissingItem;

            if (!selected) {
                toast({ text: t('toast.selectItemFirst') });
                return;
            }

            // Switch to Run tab so the user can see progress
            var navButtons = view.querySelectorAll('.localnav .nav-button');
            navButtons.forEach(function(b) { b.classList.remove('ui-btn-active'); });
            var runBtn = view.querySelector('.localnav .nav-button[data-target="runPage"]');
            if (runBtn) runBtn.classList.add('ui-btn-active');
            view.querySelectorAll('.tabPage').forEach(function(page) {
                page.classList.remove('active');
            });
            var runPage = view.querySelector('#runPage');
            if (runPage) runPage.classList.add('active');

            // Reset UI like startRefresh
            self.startTime = null;
            view.querySelector('#btnRunRefresh').classList.add('hide');
            view.querySelector('#btnCancelRefresh').classList.remove('hide');
            view.querySelector('#progressSection').classList.remove('hide');
            view.querySelector('#elapsedTime').textContent = '';
            view.querySelector('#etaBox').classList.add('hide');
            self.setStatus(view, 'running', t('ui.queuingSelected'));
            view.querySelector('#statProcessed').textContent = '0';
            view.querySelector('#statUpdated').textContent = '0';
                view.querySelector('#statUpdated').classList.remove('hasResults');
            view.querySelector('#statSkipped').textContent = '0';
            view.querySelector('#statErrors').textContent = '0';
                view.querySelector('#statErrors').classList.remove('hasResults');
            view.querySelector('#progressBarFill').style.width = '0%';
            view.querySelector('#progressBarText').textContent = '0%';
            view.querySelector('#currentItemBox').classList.add('hide');
            view.querySelector('#updatedBadge').textContent = '0';
            view.querySelector('#skippedBadge').textContent = '0';
            view.querySelector('#failureBadge').textContent = '0';
            view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">' + t('list.noUpdated') + '</li>';
            view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">' + t('list.noSkipped') + '</li>';
            view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">' + t('list.noFailures') + '</li>';

            var payload = {
                LibraryId: '',
                SeriesId: '',
                SeasonId: '',
                EpisodeId: '',
                MovieId: ''
            };

            if (selected.Type === 'Movie') {
                payload.MovieId = selected.Id;
            } else if (selected.Type === 'Series') {
                payload.SeriesId = selected.Id;
            } else if (selected.Type === 'Episode') {
                payload.EpisodeId = selected.Id;
            } else {
                toast({ text: t('ui.unsupportedTypePrefix') + selected.Type });
                self.setStatus(view, 'error', t('ui.unsupportedType'));
                self.stopRefresh(view);
                return;
            }

            self.launchScan(view, payload);
        }

        searchItemHistory(view) {
            var self = this;
            var container = view.querySelector('#itemHistoryContainer');
            var search = view.querySelector('#txtItemSearch').value;
            
            container.innerHTML = '<p class="loadingText">' + t('itemhist.loading') + '</p>';
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/ItemHistory', { Search: search, Limit: 100 }),
                dataType: 'json'
            }).then(function(items) {
                if (!items || items.length === 0) {
                    container.innerHTML = '<p class="emptyText">' + self.escapeHtml(t('itemhist.none', { q: search })) + '</p>';
                    return;
                }
                
                var html = '<table class="dataTable">';
                html += '<thead><tr>';
                html += '<th>' + t('itemhist.colName') + '</th>';
                html += '<th>' + t('itemhist.colType') + '</th>';
                html += '<th>' + t('itemhist.colLastScanned') + '</th>';
                html += '<th>' + t('itemhist.colCurrent') + '</th>';
                html += '<th>' + t('itemhist.colLastChange') + '</th>';
                html += '</tr></thead>';
                html += '<tbody>';
                
                items.forEach(function(item) {
                    var typeClass = item.Type.toLowerCase();
                    var lastScanned = item.LastScanned ? self.formatDateTime(new Date(item.LastScanned)) : '—';
                    var rating = item.CurrentRating ? item.CurrentRating.toFixed(1) : '—';
                    var critic = item.CurrentCriticRating ? ' / ' + item.CurrentCriticRating.toFixed(0) + '%' : '';
                    
                    html += '<tr>';
                    html += '<td>' + self.escapeHtml(item.Name) + '</td>';
                    html += '<td><span class="type-badge ' + typeClass + '">' + self.escapeHtml(typeLabel(item.Type)) + '</span></td>';
                    html += '<td>' + lastScanned + '</td>';
                    html += '<td>' + rating + critic + '</td>';
                    html += '<td>' + (item.LastChange ? self.escapeHtml(item.LastChange) : '—') + '</td>';
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
                
                container.innerHTML = html;
            }).catch(function(err) {
                console.error('Error searching item history:', err);
                container.innerHTML = '<p class="emptyText">' + t('itemhist.error') + '</p>';
            });
        }

        formatDateTime(date) {
            if (!date) return '—';
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        onPause() {
            // Clean up intervals when leaving page
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
            super.onPause();
        }
    };
});
