/**
 * 中文翻译资源
 */
export const zh = {
  translation: {
    brand: "TestOps AI",
    nav: {
      items: [
        { label: "官网", href: "/#home" },
        { label: "解决方案", href: "/#solutions" },
        { label: "全流程", href: "/#workflow" },
        { label: "AI 能力", href: "/#ai" },
        { label: "方案", href: "/#plans" }
      ],
      login: "登录",
      dashboard: "控制台"
    },
    hero: {
      badge: "AI TestOps",
      title: "AI 驱动的 TestOps 系统",
      subtitle:
        "从需求录入到测试活动，再到报告产出的一站式平台。让测试流程像 DevOps 一样可观测、可度量、可自动化。",
      primary: "预约演示",
      secondary: "了解架构",
      consoleTitle: "质量运营实时指挥台",
      consoleLines: [
        "✓ 需求解析完成 · 12 个场景",
        "✓ 生成测试矩阵 · 覆盖率 92%",
        "→ 自动化回归调度中 · 18/24",
        "→ 风险门禁评估中 · 8%"
      ],
      metrics: [
        { label: "全流程自动化", value: "90%" },
        { label: "交付可视化", value: "100%" },
        { label: "协作效率提升", value: "3x" }
      ]
    },
    overview: {
      title: "让测试成为持续交付的核心引擎",
      description:
        "TestOps AI 以测试为中心重新编排研发协作：需求智能拆解、测试设计生成、执行与回归闭环、风险预测与报告洞察。",
      cards: [
        {
          title: "AI-first TestOps",
          desc: "需求、测试设计、执行与报告都在同一条 AI 驱动的流水线上完成，实时可视、可追溯。",
          bullets: [
            "测试范围自动生成与覆盖建议",
            "测试资产沉淀为可复用知识库",
            "一键发布门禁与质量看板"
          ]
        },
        {
          title: "统一质量运营视角",
          desc: "将手工与自动化测试、缺陷、风险、效率指标统一在一张图中展示。",
          bullets: [
            "测试活动进度与阻塞自动识别",
            "缺陷趋势与回归优先级建议",
            "质量 KPI 持续优化"
          ]
        }
      ]
    },
    pillars: {
      title: "平台能力矩阵",
      items: [
        {
          title: "需求驱动",
          desc: "从 PRD/用户故事自动生成测试范围与覆盖建议。"
        },
        {
          title: "智能设计",
          desc: "AI 自动补全用例、数据与断言，支持模板复用。"
        },
        {
          title: "执行编排",
          desc: "手工 + 自动化统一排期，实时反馈测试进度。"
        },
        {
          title: "质量洞察",
          desc: "风险热力图、缺陷趋势、覆盖率与质量门禁。"
        },
        {
          title: "知识沉淀",
          desc: "测试资产沉淀为知识库，持续优化。"
        },
        {
          title: "治理合规",
          desc: "流程审计、权限矩阵、交付可追溯。"
        }
      ]
    },
    flow: {
      title: "覆盖全流程的 TestOps 引擎",
      steps: [
        {
          title: "需求录入",
          desc: "支持工单、PRD、API 文档与需求模板，自动建立测试范围。"
        },
        {
          title: "测试规划",
          desc: "AI 生成测试矩阵、风险评估与测试资源计划。"
        },
        {
          title: "测试设计",
          desc: "从模型与历史资产中生成用例、数据与执行脚本。"
        },
        {
          title: "测试执行",
          desc: "统一调度自动化、手工、性能、安全测试活动。"
        },
        {
          title: "缺陷管理",
          desc: "智能聚类、根因分析、回归建议与影响面评估。"
        },
        {
          title: "测试报告",
          desc: "自动生成多维度质量报告，支持发布门禁。"
        }
      ]
    },
    testing: {
      badge: "AI 驱动测试",
      title: "智能规划，全场景覆盖",
      desc: "AI 自动分析需求、生成测试计划，支持多种测试协议和平台，一站式解决所有测试需求",
      capabilities: [
        {
          title: "HTTP / REST API",
          desc: "全面的 HTTP 接口测试，支持 RESTful、GraphQL、WebSocket"
        },
        {
          title: "gRPC",
          desc: "高性能 gRPC 服务测试，支持 Unary、Streaming 调用"
        },
        {
          title: "移动端 UI",
          desc: "iOS / Android 原生 App 自动化测试，支持真机和模拟器"
        },
        {
          title: "浏览器测试",
          desc: "Chrome / Firefox / Safari / Edge 跨浏览器自动化测试"
        },
        {
          title: "Windows 桌面",
          desc: "Windows 桌面应用自动化，支持 WinUI / WPF / Win32"
        },
        {
          title: "AI 智能规划",
          desc: "基于需求自动生成测试用例，智能识别测试场景和边界条件"
        }
      ]
    },
    ai: {
      title: "AI 优先的核心能力",
      items: [
        {
          title: "需求理解引擎",
          desc: "从上下文提取关键场景，生成测试范围与风险标签。"
        },
        {
          title: "测试资产生成",
          desc: "自动生成用例、数据、接口测试脚本与测试说明。"
        },
        {
          title: "执行智能助手",
          desc: "实时给出阻塞原因、修复建议与回归优先级。"
        },
        {
          title: "报告洞察",
          desc: "生成管理层视角报告与发布决策建议。"
        }
      ]
    },
    integrations: {
      title: "无缝集成研发生态",
      items: [
        "Jira / Tapd / 飞书",
        "GitHub / GitLab / Azure DevOps",
        "Jenkins / GitHub Actions / Argo",
        "Postman / Playwright / Cypress",
        "SonarQube / Sentry / Datadog",
        "企业 IM 与通知中台"
      ]
    },
    security: {
      title: "企业级安全与治理",
      items: [
        "角色权限与组织隔离",
        "数据加密与审计日志",
        "多地域部署与容灾",
        "合规流程与发布门禁",
        "资产版本管理与审批"
      ]
    },
    cta: {
      title: "开始构建 AI 驱动的测试全流程",
      desc: "让测试团队成为研发交付的战略引擎。",
      primary: "获取方案",
      secondary: "申请试用"
    },
    closing: {
      title: "让测试像代码一样持续进化",
      subtitle: "AI TestOps · 连接需求、质量与交付的每一次迭代"
    },
    login: {
      title: "登录 TestOps AI",
      email: "邮箱",
      password: "密码",
      submit: "登录",
      loading: "登录中..."
    },
    dashboard: {
      title: "控制台",
      welcome: "欢迎回来",
      stats: ["订阅总数", "活跃节点", "今日请求"],
      promptTitle: "请先登录",
      promptBody: "登录后可查看 Proxy 订阅概况。",
      toLogin: "去登录",
      workspace: "工作空间",
      insightTitle: "Proxy 概况",
      insightDesc: "查看你的代理订阅统计信息。",
      insightItems: ["订阅数 0", "节点数 0", "活跃 0", "待更新 0"],
      assistantTitle: "快速操作",
      assistantDesc: "常用功能快捷入口。",
      assistantItems: [
        "创建新的代理订阅",
        "管理订阅规则",
        "查看订阅日志"
      ]
    },
    aiWorkflow: {
      aiAutoProcess: "AI 全自动流程",
      upload: {
        title: "上传需求文档",
        desc: "拖拽文件到这里，或点击选择文件",
        selectFile: "选择文件",
        sampleFile: "电商平台需求规格说明书_v3.2.pdf",
        sampleMeta: "3.8 MB · 156 页 · 包含 API 接口文档"
      },
      analyzing: {
        title: "AI 智能分析需求文档",
        desc: "深度解析文档结构，识别功能模块与测试点",
        docStructure: "文档结构分析",
        modules: [
          "1. 用户管理模块",
          "2. 商品管理模块",
          "3. 订单处理模块",
          "4. 支付网关模块",
          "5. 物流追踪模块"
        ],
        stats: [
          { label: "功能模块", value: "28" },
          { label: "测试点", value: "186" },
          { label: "边界条件", value: "42" },
          { label: "API接口", value: "67" }
        ],
        progress: "分析进度",
        analyzing: "分析中..."
      },
      testPlan: {
        title: "AI 创建测试计划",
        desc: "基于需求智能规划测试策略与优先级",
        complete: "完成",
        testCases: "测试用例",
        modules: [
          {
            module: "用户管理",
            priority: "高",
            items: ["登录注册", "权限控制", "个人信息", "OAuth集成"]
          },
          {
            module: "订单处理",
            priority: "高",
            items: ["创建订单", "状态流转", "退款处理", "并发控制"]
          },
          {
            module: "支付网关",
            priority: "关键",
            items: ["支付宝", "微信支付", "银行卡", "退款逻辑"]
          },
          {
            module: "商品管理",
            priority: "中",
            items: ["商品CRUD", "库存管理", "价格计算", "分类管理"]
          },
          {
            module: "物流追踪",
            priority: "中",
            items: ["物流查询", "状态同步", "异常处理", "多渠道对接"]
          },
          {
            module: "API网关",
            priority: "高",
            items: ["限流熔断", "认证鉴权", "日志追踪", "版本控制"]
          }
        ]
      },
      generate: {
        title: "AI 智能生成测试用例",
        desc: "智能识别测试场景，自动生成边界条件用例",
        page: "页",
        step1: "智能识别测试场景",
        step2: "自动识别边界条件",
        step3: "HTTP / REST API 用例生成",
        step4: "浏览器 UI 测试用例生成",
        step5: "移动端 UI 测试用例生成",
        step6: "用例生成完成",
        scenarios: [
          {
            scenario: "正向流程测试",
            desc: "用户登录 → 浏览商品 → 加入购物车 → 下单支付"
          },
          {
            scenario: "异常流程测试",
            desc: "网络中断、超时重试、并发冲突处理"
          },
          {
            scenario: "边界值测试",
            desc: "最大购买数量、价格边界、库存临界值"
          },
          {
            scenario: "安全性测试",
            desc: "SQL注入、XSS攻击、越权访问检测"
          }
        ],
        boundaries: [
          { field: "用户名", min: "2字符", max: "32字符", special: "特殊字符过滤" },
          { field: "密码", min: "8字符", max: "128字符", special: "强度验证" },
          { field: "商品价格", min: "0.01", max: "999999.99", special: "精度处理" },
          { field: "购买数量", min: "1", max: "9999", special: "库存校验" },
          { field: "优惠券金额", min: "1", max: "订单金额", special: "叠加规则" },
          { field: "收货地址", min: "10字符", max: "200字符", special: "地址解析" }
        ],
        apis: [
          { method: "POST", path: "/api/v1/users/login", desc: "用户登录接口" },
          { method: "GET", path: "/api/v1/products", desc: "商品列表查询" },
          { method: "POST", path: "/api/v1/orders", desc: "创建订单接口" },
          { method: "PUT", path: "/api/v1/orders/:id/status", desc: "更新订单状态" },
          { method: "DELETE", path: "/api/v1/cart/items/:id", desc: "删除购物车商品" }
        ],
        cases: "用例",
        browsers: [
          { browser: "Chrome", version: "v120+" },
          { browser: "Firefox", version: "v115+" },
          { browser: "Safari", version: "v17+" },
          { browser: "Edge", version: "v118+" }
        ],
        browserTests: ["页面渲染测试", "交互响应测试", "表单验证测试", "跨浏览器兼容性"],
        iosPlatform: "iOS 平台",
        androidPlatform: "Android 平台",
        iosDevices: ["iPhone 15 Pro", "iPhone 14", "iPad Pro", "iPad Air"],
        androidDevices: ["Pixel 8 Pro", "Samsung S24", "Xiaomi 14", "OPPO Find X7"],
        summary: {
          types: [
            { type: "API 测试", count: 562 },
            { type: "浏览器 UI", count: 438 },
            { type: "移动端 iOS", count: 128 },
            { type: "移动端 Android", count: 139 },
            { type: "性能压测", count: 86 }
          ],
          total: "1,353",
          readyToExecute: "个测试用例已生成，准备执行"
        }
      },
      execute: {
        title: "AI 自动执行测试",
        desc: "多协议并行执行，实时监控测试进度",
        lanes: [
          { type: "HTTP / REST API", desc: "全面的 HTTP 接口测试，支持 RESTful、GraphQL" },
          { type: "gRPC 服务", desc: "高性能 gRPC 服务测试，Unary / Streaming" },
          { type: "浏览器测试", desc: "Chrome / Firefox / Safari / Edge 跨浏览器" },
          { type: "移动端 iOS", desc: "iPhone / iPad 真机与模拟器测试" },
          { type: "移动端 Android", desc: "Pixel / Samsung / Xiaomi 多设备覆盖" }
        ],
        stats: [
          { label: "总执行", value: "1,353" },
          { label: "通过", value: "1,312" },
          { label: "失败", value: "28" },
          { label: "耗时", value: "4m 32s" }
        ]
      },
      report: {
        title: "AI 产出精美测试报告",
        desc: "智能分析测试结果，生成可视化报告",
        complete: "全流程完成",
        metrics: [
          { label: "通过率", value: "97.1%" },
          { label: "覆盖率", value: "94.8%" },
          { label: "总用例", value: "1,353" },
          { label: "缺陷数", value: "28" }
        ],
        chartTitle: "测试类型分布",
        chartLabels: ["API", "UI", "iOS", "Android", "gRPC"],
        defectTitle: "缺陷分布",
        defects: [
          { module: "支付模块", count: 12, severity: "高" },
          { module: "订单模块", count: 8, severity: "中" },
          { module: "用户模块", count: 5, severity: "低" },
          { module: "其他", count: 3, severity: "低" }
        ],
        browserRecording: "浏览器测试录屏 - Chrome",
        downloadReport: "下载完整报告",
        shareReport: "分享报告",
        timeSaved: "全程耗时 4分32秒 · 节省人工 48+ 小时"
      }
    },
      errors: {
        common: {
          unauthorized: "未登录",
          forbidden: "无权限访问",
          requestFailed: "请求失败",
          missingWorkspace: "缺少工作空间参数",
          workspaceForbidden: "无权限访问该工作空间",
          adminRequired: "需要管理员权限",
          superadminRequired: "需要超级管理员权限"
        },
        auth: {
          invalidCredentials: "账号或密码错误",
          defaultWorkspaceNotFound: "未找到默认工作空间",
          emailAlreadyRegistered: "邮箱已注册",
          registrationDisabled: "系统暂不开放注册",
          invitationInvalid: "邀请码无效或已被使用",
          invitationExpired: "邀请码已过期"
        },
        user: {
          notFound: "用户不存在",
          emailInUse: "邮箱已被使用",
          wrongPassword: "原密码错误"
        },
        workspace: {
          notFound: "工作空间不存在",
          onlyOwnerCanUpdate: "仅创建者可修改",
          onlyOwnerCanDelete: "仅创建者可删除",
          slugExists: "Slug 已存在"
        },
        todo: {
          notFound: "待办不存在"
        },
        testRequirement: {
          notFound: "测试需求不存在",
          createFetchFailed: "创建后无法查询到记录",
          updateFetchFailed: "更新后无法查询到记录",
          deleteChildrenFirst: "请先删除所有子需求"
        }
      },
    proxy: {
      title: "代理订阅管理",
      newSubscribe: "新建订阅",
      editSubscribe: "编辑订阅",
      deleteSuccess: "删除成功",
      deleteFailed: "删除失败",
      createSuccess: "创建成功",
      createFailed: "创建失败",
      updateSuccess: "更新成功",
      updateFailed: "更新失败",
      copiedToClipboard: "已复制到剪贴板",
      confirmDelete: "确认删除",
      confirmDeleteDesc: "确定要删除这个订阅吗？",
      columns: {
        creator: "创建者",
        remark: "备注",
        clashUrl: "Clash 订阅链接",
        singboxUrl: "Sing-box 订阅链接",
        lastUpdate: "最后更新",
        actions: "操作"
      },
      actions: {
        stats: "统计",
        preview: "预览节点",
        edit: "编辑",
        delete: "删除"
      },
      tabs: {
        basic: "基础信息",
        subscribeUrl: "订阅地址",
        ruleList: "规则列表",
        group: "分组",
        filter: "过滤器",
        customConfig: "自定义配置",
        servers: "额外服务器"
      },
      form: {
        remark: "备注",
        remarkPlaceholder: "订阅备注",
        authorizedUsers: "授权用户",
        authorizedUsersPlaceholder: "选择要授权的用户（可选）",
        authorizedUsersOwnerOnly: "只有创建者可以修改授权用户",
        subscribeUrlLabel: "订阅地址 (JSON 数组，支持注释)",
        subscribeUrlRequired: "请输入订阅地址",
        subscribeUrlPlaceholder: '["https://example.com/subscribe"]',
        ruleListLabel: "规则列表 (JSON 对象，支持注释)",
        ruleListPlaceholder: '{"分组名": [{"name": "规则名", "url": "规则地址"}]}',
        groupLabel: "分组配置 (JSON 数组，支持注释)",
        groupPlaceholder: '[{"name": "分组名", "type": "select", "proxies": ["节点1"]}]',
        filterLabel: "节点过滤器 (JSON 数组，支持注释)",
        filterPlaceholder: '["关键词1", "关键词2"]',
        customConfigLabel: "自定义规则 (JSON 数组，支持注释)",
        customConfigPlaceholder: '["DOMAIN,example.com,DIRECT"]',
        serversLabel: "额外服务器 (JSON 数组，支持注释)",
        serversPlaceholder: '[{"name": "服务器名", "type": "ss", "server": "1.2.3.4", "port": 443}]',
        jsonFormatError: "JSON 格式错误",
        resetToDefault: "恢复默认",
        resetSuccess: "已恢复为默认配置",
        resetFailed: "获取默认配置失败"
      },
      preview: {
        title: "节点预览",
        unnamed: "未命名订阅",
        noNodes: "未找到节点",
        totalNodes: "共 {{total}} 个节点，有效 {{active}} 个",
        filtered: "已过滤",
        clickToExpand: "点击行展开详情",
        source: "来源",
        manual: "手动",
        protocol: "协议",
        nodeName: "节点名称",
        server: "服务器",
        port: "端口",
        transport: "传输/TLS",
        secret: "密钥/UUID",
        clickToCopy: "点击复制",
        clickToCopyFull: "点击复制完整密钥",
        filteredBy: "已被过滤规则「{{rule}}」匹配",
        noDetailInfo: "暂无详细配置信息",
        filters: {
          validNodes: "有效节点",
          filtered: "已过滤"
        }
      },
      common: {
        confirm: "确定",
        cancel: "取消"
      }
    },
    footer: {
      copyright: "© 2026 TestOps AI. All rights reserved.",
      tagline: "AI 驱动的测试全流程平台"
    },
    systemSettings: {
      title: "系统设置",
      generalTab: "通用设置",
      usersTab: "用户管理",
      allowRegistration: "允许新用户注册",
      allowRegistrationDesc: "关闭后，新用户将无法注册账号",
      userList: "用户列表",
      userRole: "角色",
      lastLoginAt: "最近登录",
      userCreatedAt: "注册时间",
      userActions: "操作",
      roleUser: "普通用户",
      roleAdmin: "管理员",
      roleSuperAdmin: "超级管理员",
      changeRole: "修改角色",
      resetPassword: "重置密码",
      deleteUser: "删除用户",
      confirmDelete: "确认删除",
      confirmDeleteDesc: "确定要删除用户 {{name}} 吗？此操作不可撤销。",
      resetPasswordTitle: "重置密码",
      resetPasswordDesc: "为用户 {{name}} 设置新密码",
      newPassword: "新密码",
      saveSuccess: "保存成功",
      deleteSuccess: "删除成功",
      resetSuccess: "密码重置成功",
      addUser: "添加用户",
      addUserTitle: "添加新用户",
      addUserDesc: "手动创建新用户账号",
      userName: "用户名",
      userEmail: "邮箱",
      userPassword: "密码",
      userRoleSelect: "选择角色",
      addUserSuccess: "用户创建成功",
      emailExists: "该邮箱已被注册",
      invitationTab: "邀请注册",
      generateInvitation: "生成邀请链接",
      invitationList: "邀请码列表",
      invitationCode: "邀请码",
      invitationStatus: "状态",
      invitationCreatedAt: "创建时间",
      invitationExpiresAt: "过期时间",
      invitationUsedBy: "使用者",
      invitationUsedAt: "使用时间",
      invitationStatusUnused: "未使用",
      invitationStatusUsed: "已使用",
      invitationStatusExpired: "已过期",
      invitationNeverExpire: "永不过期",
      invitationCopied: "邀请链接已复制到剪贴板",
      invitationGenerated: "邀请链接已生成",
      invitationDeleted: "邀请码已删除",
      copyInvitationLink: "复制链接",
      deleteInvitation: "删除",
      expiresInHours: "有效期（小时）",
      noExpiration: "不设置过期时间"
    }
  }
};

export type TranslationSchema = typeof zh;
