// ============================================================
// 装饰性永久文本总表（不来自 content/ 的固定文案）
// 改版后如需调整站点固定文案，只改这一处。
// 注意：TYPE_META / SIX_DIMS / GRADES / PRESET_RELATION_KINDS /
//       CHRONICLE_PERIODS 属于内容驱动常量，见 lib/types.ts 与
//       lib/chronicle.ts，不在本文件维护。
// ============================================================

export const SITE_COPY = {
  shell: {
    // 顶部等宽字体状态栏（左 / 右）
    statusLeft: "YANGSHAN ARCHIVE SYSTEM // 仰山市档案与公共安全部",
    statusRight: "YRP · ARCHIVE DIVISION",
    // 左侧竖向导轨
    railBrandTop: "仰山档案",
    railBrandSub: "YANGSHAN ARCHIVE",
    // 导轨导航项（序号自动生成于渲染处）
    nav: [
      { href: "/", label: "首页", en: "HOME" },
      { href: "/archives/", label: "档案库", en: "ARCHIVES" },
      { href: "/chronicle/", label: "编年史", en: "CHRONICLE" },
      { href: "/network/", label: "关系网", en: "NETWORK" },
    ] as { href: string; label: string; en: string }[],
    railUtils: [
      { href: "/search/", label: "检索", en: "SEARCH", title: "全文检索" },
      { href: "/random/", label: "随机", en: "RANDOM", title: "随机调阅一份档案" },
      { href: "/admin/", label: "后台", en: "ADMIN", title: "协作编辑登录后台" },
    ] as { href: string; label: string; en: string; title: string }[],
    railFooter: "自由 · 平衡 · 新知",
    // 页脚
    footerMotto: "自由 · 平衡 · 新知",
    footerNote: "仰山复兴计划项目组 · 档案管理系统 — 本库档案对全体访客公开，协作编辑请",
    footerLogin: "登录后台",
    footerEn: "YANGSHAN REVITALIZATION PROJECT · ARCHIVE DIVISION",
  },

  home: {
    eyebrow: "// YANGSHAN REJUVENATION PROJECT — ARCHIVE TERMINAL",
    titleSolid: "仰山",
    titleOutline: "ARCHIVE",
    desc: "本系统收录仰山市境内登记在册的谬误现象、社会面重要个体、各方势力情报与世界观基础设定。全部已发布档案对访客公开，欢迎自由调阅。",
    statLabel: "在册档案",
    statUnit: "份",
    catEn: {
      anomaly: "ANOMALY FILES",
      person: "PERSONNEL DOSSIER",
      faction: "FACTION INTEL",
      lore: "LORE ARCHIVE",
      cihai: "CIHAI LEXICON",
    } as Record<string, string>,
    latestTitle: "最新归档",
    catTitle: "档案分区",
    latestMore: "进入档案库",
    rulerLabel: "CALIBRATED INDEX",
    factionTitle: "势力情报",
    factionAll: "全部势力",
    factionEmpty: "暂无势力档案",
  },

  archives: {
    title: "档案库",
    eyebrow: "// DOSSIER INDEX",
    loading: "档案索引加载中…",
    count: (n: number) => `共 ${n} 份在册档案`,
    tabAll: "全部",
    filterTag: "标签",
    filterMark: "特殊谬误标记",
    filterFaction: "所属势力",
    filterStat: "六维评级",
    filterDim: "维度",
    filterGrade: "评级",
    filterAll: "全部",
    filterClear: "清除",
    empty: "没有符合条件的档案。",
    pagePrev: "上一页",
    pageNext: "下一页",
    pagerAria: "分页",
  },

  detail: {
    eyebrowOf: (en: string, zh: string) => `// ${en} — ${zh}`,
    codename: "识别代称",
    recordedBy: (name: string, date: string) => `录入：${name} ｜ 更新于 ${date}`,
    recordedByName: "档案馆",
    markBadge: (mark: string) => `特殊谬误标记 · ${mark}`,
    secCode: (n: number) => `SEC-${String(n).padStart(2, "0")}`,
    // anomaly 小节名
    secDesc: "谬误描述",
    secDanger: "谬误危险性分析",
    secUtilization: "谬误利用性分析",
    secReversibility: "谬误可逆性分析",
    secOrigin: "谬误溯源分析",
    secDisposal: "谬误处置措施",
    secReport: "参考谬误观测或处置报告",
    secPostscript: "附记",
    // person 小节名
    infoName: "姓名",
    infoGender: "性别",
    infoAge: "年龄",
    infoUnit: "登记岗位及所在单位",
    infoRace: "种族",
    infoFaction: "势力归属",
    factionMissing: (slug: string) => `（势力档案未发布或不存在的 slug：${slug}）`,
    secBackground: "个人背景及履历",
    secAppearance: "外貌等识别特征",
    secAnomalyEffect: "影响个体特殊谬误概述",
    secHoldings: "持有特殊谬误体或谬误科技情况",
    statsTitle: "工作能力评定",
    statsLegend: "S 卓越 / A 优良 / B 均衡 / C 一般 / D 缺陷",
    relationTitle: "关系线索",
    relationEmpty: "该个体暂无任何登记关系。关系线索可由管理员在后台维护。",
    galleryTitle: "图档",
    // 右侧索引栏
    indexTitle: "INDEX",
    indexUnit: "登记单位",
    indexUnitValue: "仰山市档案与公共安全部",
    indexRevised: "最近修订",
    indexRelated: "关联档案",
    indexRelatedEmpty: "暂无关联档案",
    indexStatus: "发布状态",
    statusPublished: "已发布",
    statusDraft: "草稿",
    // 底部操作条
    backToIndex: "返回目录",
    locateChronicle: "编年史定位",
    randomDossier: "随机调阅",
    relatedChronicleTitle: "相关历史事件",
    relatedChronicleView: "查看",
  },

  chronicle: {
    eyebrow: "// CHRONICLE OF YANGSHAN · 自神话时期至万邦时期",
    title: "仰山编年史",
    // 《仰山年表【新】》卷首序言与收录说明（原文照录）
    intro:
      "注意：仰山的历史记录在“鼠患”影响下散佚严重，官方的历史研究受各方面影响长期停滞，直到万邦初年才完全重启，推进得比预想得更加缓慢。故本年表仅尝试为所有的，有志于为仰山历史研究工作贡献力量的民间或官方学者提供有益参考。谨记，历史并不作为完整、连续且透明的事实在研究中显露，而是尝试在叙述无法缝合、言尽并统一的位置，通过空白、沉默、矛盾、断裂、重复、边缘等形式显露自身。",
    notice: "本年表暂未收录万邦15年的历史记录。",
    filterPlaceholder: "过滤事件文本…",
    empty: "没有符合过滤条件的事件。",
    expand: "详情 ▾",
    collapse: "收起 ▴",
    anchorTitle: "定位链接",
    count: (n: number, m: number) => `${n} / ${m}`,
  },

  network: {
    eyebrow: "// RELATION NETWORK — TACTICAL BOARD",
    title: "关系网",
    intro: "金线为关系线索，标签牌为关系类型；拖拽移动卡片，滚轮缩放板面，点击卡片调阅档案。",
    modePersons: "仅人员",
    modeAll: "人员 + 势力",
    searchPlaceholder: "查找线索（姓名 / 代称）",
    legendTitle: "关系类型",
    boardStrip: (p: number, r: number, k: number) => `人员 ${p} · 关系 ${r} · 类型 ${k}`,
    localHint: "以该个体为中心的局部关系线索板 · 拖拽可移动卡片 · 点击卡片调阅档案",
    noFaction: "未登记势力",
    emptyPersons: "暂无已发布的人员档案。",
    emptyRelations: "暂无登记关系",
    archiveNo: (id: string) => `档案 ${id}`,
    zoomIn: "放大",
    zoomOut: "缩小",
    zoomReset: "重置视图",
  },

  search: {
    eyebrow: "// FULL-TEXT RETRIEVAL",
    title: "档案检索",
    placeholder: "输入标题、识别代称或正文关键词…",
    button: "检索",
    searching: "检索中…",
    empty: (q: string) => `未检索到与「${q}」相关的档案。`,
    hitCount: (n: number) => `共命中 ${n} 份档案：`,
    hint: "输入关键词以检索全部档案（标题 / 识别代称 / 正文全文）。",
  },

  random: {
    code: "YS-RANDOM · ARCHIVE RETRIEVAL",
    loading: "正在调阅随机档案…",
    empty: "暂无可调阅的档案。",
    failed: "档案清单加载失败，请返回档案库。",
    back: "返回档案库",
  },

  notFound: {
    code: "YS-404 · ARCHIVE NOT FOUND",
    title: "该档案不存在或未发布",
    desc: "您尝试调阅的档案可能尚未发布、已被移除，或编号有误。",
    back: "返回档案库",
    random: "随机调阅一份",
  },
} as const;
