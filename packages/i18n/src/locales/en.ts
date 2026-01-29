/**
 * 英文翻译资源
 */
import type { TranslationSchema } from "./zh.js";

export const en: TranslationSchema = {
  translation: {
    brand: "TestOps AI",
    nav: {
      items: [
        { label: "Home", href: "/#home" },
        { label: "Solutions", href: "/#solutions" },
        { label: "Workflow", href: "/#workflow" },
        { label: "AI Core", href: "/#ai" },
        { label: "Plans", href: "/#plans" }
      ],
      login: "Sign in",
      dashboard: "Console"
    },
    hero: {
      badge: "AI TestOps",
      title: "AI-first TestOps Platform",
      subtitle:
        "From requirement intake to test execution and reporting. Make testing observable, measurable, and automated like DevOps.",
      primary: "Book a demo",
      secondary: "View architecture",
      consoleTitle: "Live quality command",
      consoleLines: [
        "✓ Requirements parsed · 12 scenarios",
        "✓ Test matrix generated · 92% coverage",
        "→ Regression scheduled · 18/24",
        "→ Release gate scoring · 8% risk"
      ],
      metrics: [
        { label: "End-to-end automation", value: "90%" },
        { label: "Delivery visibility", value: "100%" },
        { label: "Efficiency uplift", value: "3x" }
      ]
    },
    overview: {
      title: "Make testing the core engine of delivery",
      description:
        "TestOps AI orchestrates quality with AI: requirement understanding, test design generation, execution loops, risk prediction, and reporting insights.",
      cards: [
        {
          title: "AI-first TestOps",
          desc: "Requirements, design, execution, and reporting run on one AI-driven pipeline with full observability.",
          bullets: [
            "Auto-generate scope and coverage suggestions",
            "Reusable test knowledge base",
            "One-click quality gates and dashboards"
          ]
        },
        {
          title: "Unified quality operations",
          desc: "Manual and automation testing, defects, risks, and efficiency metrics in one view.",
          bullets: [
            "Live progress and blocker detection",
            "Defect trends and regression priority",
            "Continuous quality KPI optimization"
          ]
        }
      ]
    },
    pillars: {
      title: "Capability matrix",
      items: [
        {
          title: "Requirement-led",
          desc: "Generate scope and coverage from PRD or user stories."
        },
        {
          title: "Smart design",
          desc: "Auto-generate cases, data, and assertions with templates."
        },
        {
          title: "Execution orchestration",
          desc: "Unified schedules for manual and automation with live updates."
        },
        {
          title: "Quality insights",
          desc: "Risk heatmap, defect trend, coverage, and quality gates."
        },
        {
          title: "Knowledge accumulation",
          desc: "Turn test assets into a continuous quality knowledge base."
        },
        {
          title: "Governance",
          desc: "Audit trails, permissions, and traceability."
        }
      ]
    },
    flow: {
      title: "Full-cycle TestOps workflow",
      steps: [
        {
          title: "Requirement intake",
          desc: "Ingest tickets, PRDs, and API docs to build scope."
        },
        {
          title: "Planning",
          desc: "AI generates test matrix, risk grading, and resourcing."
        },
        {
          title: "Design",
          desc: "Generate cases, data, and scripts from models and history."
        },
        {
          title: "Execution",
          desc: "Orchestrate automation, manual, performance, security."
        },
        {
          title: "Defects",
          desc: "Cluster, analyze root cause, and prioritize regressions."
        },
        {
          title: "Reporting",
          desc: "Auto-generate quality reports and release gates."
        }
      ]
    },
    testing: {
      badge: "AI-Powered Testing",
      title: "Intelligent Planning, Full Coverage",
      desc: "AI automatically analyzes requirements and generates test plans, supporting multiple testing protocols and platforms for comprehensive testing needs",
      capabilities: [
        {
          title: "HTTP / REST API",
          desc: "Comprehensive HTTP API testing with RESTful, GraphQL, and WebSocket support"
        },
        {
          title: "gRPC",
          desc: "High-performance gRPC service testing with Unary and Streaming calls"
        },
        {
          title: "Mobile UI",
          desc: "iOS / Android native app automation on real devices and simulators"
        },
        {
          title: "Browser Testing",
          desc: "Cross-browser automation for Chrome / Firefox / Safari / Edge"
        },
        {
          title: "Windows Desktop",
          desc: "Windows desktop automation with WinUI / WPF / Win32 support"
        },
        {
          title: "AI Planning",
          desc: "Auto-generate test cases from requirements with intelligent scenario and boundary detection"
        }
      ]
    },
    ai: {
      title: "AI-first core capabilities",
      items: [
        {
          title: "Requirement intelligence",
          desc: "Extract scenarios and risks from product context."
        },
        {
          title: "Asset generation",
          desc: "Generate cases, data, API scripts, and test notes."
        },
        {
          title: "Execution copilot",
          desc: "Diagnose blockers and prioritize regression paths."
        },
        {
          title: "Insightful reporting",
          desc: "Executive-ready reports and release recommendations."
        }
      ]
    },
    integrations: {
      title: "Integrations with your stack",
      items: [
        "Jira / Tapd / Feishu",
        "GitHub / GitLab / Azure DevOps",
        "Jenkins / GitHub Actions / Argo",
        "Postman / Playwright / Cypress",
        "SonarQube / Sentry / Datadog",
        "Enterprise chat & notification hubs"
      ]
    },
    security: {
      title: "Enterprise-grade security",
      items: [
        "Role-based access and org isolation",
        "Encryption and audit logging",
        "Multi-region deployment",
        "Compliance workflows & gates",
        "Asset versioning & approvals"
      ]
    },
    cta: {
      title: "Build AI-driven testing operations",
      desc: "Make QA the strategic engine for delivery.",
      primary: "Get a plan",
      secondary: "Start trial"
    },
    closing: {
      title: "Let testing evolve like code",
      subtitle: "AI TestOps · Align requirements, quality, and delivery in every iteration"
    },
    login: {
      title: "Sign in to TestOps AI",
      email: "Email",
      password: "Password",
      submit: "Sign in",
      loading: "Signing in..."
    },
    dashboard: {
      title: "TestOps Command Center",
      welcome: "Welcome back",
      stats: ["Requirement backlog", "Active test runs", "Release gates"],
      promptTitle: "Please sign in",
      promptBody: "Sign in to view your operational insights.",
      toLogin: "Go to sign in",
      workspace: "Workspace",
      insightTitle: "Quality insights",
      insightDesc: "Auto-generated risk heatmaps, coverage, and gate recommendations.",
      insightItems: ["Coverage 92%", "Regression risk 8%", "Blockers 3", "Pending 5"],
      assistantTitle: "AI execution copilot",
      assistantDesc: "Detect blockers, suggest fixes, and prioritize regression paths.",
      assistantItems: [
        "Login flow anomaly detected; prioritize regression",
        "Payment API coverage dropped by 12%",
        "Mobile regression defect convergence up 20%"
      ],
      menu: [
        "Workbench",
        "Test Requirements",
        "Test Plans",
        "Test Design",
        "Execution",
        "Defects & Risk",
        "Quality Reports",
        "Automation Assets",
        "Settings"
      ]
    },
    aiWorkflow: {
      aiAutoProcess: "AI Fully Automated",
      upload: {
        title: "Upload Requirements",
        desc: "Drag files here, or click to browse",
        selectFile: "Select File",
        sampleFile: "E-commerce Platform Requirements v3.2.pdf",
        sampleMeta: "3.8 MB · 156 pages · Includes API docs"
      },
      analyzing: {
        title: "AI Analyzing Requirements",
        desc: "Deep parsing document structure, identifying modules & test points",
        docStructure: "Document Structure Analysis",
        modules: [
          "1. User Management",
          "2. Product Management",
          "3. Order Processing",
          "4. Payment Gateway",
          "5. Logistics Tracking"
        ],
        stats: [
          { label: "Modules", value: "28" },
          { label: "Test Points", value: "186" },
          { label: "Boundaries", value: "42" },
          { label: "API Endpoints", value: "67" }
        ],
        progress: "Analysis Progress",
        analyzing: "Analyzing..."
      },
      testPlan: {
        title: "AI Creating Test Plan",
        desc: "Intelligent test strategy & priority planning based on requirements",
        complete: "Complete",
        testCases: "Test Cases",
        modules: [
          {
            module: "User Mgmt",
            priority: "High",
            items: ["Login/Register", "Access Control", "Profile", "OAuth"]
          },
          {
            module: "Orders",
            priority: "High",
            items: ["Create Order", "Status Flow", "Refunds", "Concurrency"]
          },
          {
            module: "Payment",
            priority: "Critical",
            items: ["Alipay", "WeChat Pay", "Bank Card", "Refund Logic"]
          },
          {
            module: "Products",
            priority: "Medium",
            items: ["CRUD", "Inventory", "Pricing", "Categories"]
          },
          {
            module: "Logistics",
            priority: "Medium",
            items: ["Tracking", "Status Sync", "Exceptions", "Multi-channel"]
          },
          {
            module: "API Gateway",
            priority: "High",
            items: ["Rate Limit", "Auth", "Logging", "Versioning"]
          }
        ]
      },
      generate: {
        title: "AI Generating Test Cases",
        desc: "Smart scenario detection, auto-generate boundary condition cases",
        page: "Page",
        step1: "Smart Scenario Detection",
        step2: "Auto-detect Boundary Conditions",
        step3: "HTTP / REST API Case Generation",
        step4: "Browser UI Test Case Generation",
        step5: "Mobile UI Test Case Generation",
        step6: "Case Generation Complete",
        scenarios: [
          { scenario: "Positive Flow", desc: "Login → Browse → Add to Cart → Checkout" },
          { scenario: "Exception Flow", desc: "Network interruption, timeout retry, concurrency" },
          { scenario: "Boundary Testing", desc: "Max quantity, price limits, inventory threshold" },
          { scenario: "Security Testing", desc: "SQL injection, XSS, privilege escalation" }
        ],
        boundaries: [
          { field: "Username", min: "2 chars", max: "32 chars", special: "Special char filter" },
          { field: "Password", min: "8 chars", max: "128 chars", special: "Strength check" },
          { field: "Price", min: "0.01", max: "999999.99", special: "Precision handling" },
          { field: "Quantity", min: "1", max: "9999", special: "Stock validation" },
          { field: "Coupon", min: "1", max: "Order amount", special: "Stacking rules" },
          { field: "Address", min: "10 chars", max: "200 chars", special: "Address parsing" }
        ],
        apis: [
          { method: "POST", path: "/api/v1/users/login", desc: "User login" },
          { method: "GET", path: "/api/v1/products", desc: "Product list" },
          { method: "POST", path: "/api/v1/orders", desc: "Create order" },
          { method: "PUT", path: "/api/v1/orders/:id/status", desc: "Update order status" },
          { method: "DELETE", path: "/api/v1/cart/items/:id", desc: "Remove cart item" }
        ],
        cases: "cases",
        browsers: [
          { browser: "Chrome", version: "v120+" },
          { browser: "Firefox", version: "v115+" },
          { browser: "Safari", version: "v17+" },
          { browser: "Edge", version: "v118+" }
        ],
        browserTests: ["Page Render", "Interaction Response", "Form Validation", "Cross-browser"],
        iosPlatform: "iOS Platform",
        androidPlatform: "Android Platform",
        iosDevices: ["iPhone 15 Pro", "iPhone 14", "iPad Pro", "iPad Air"],
        androidDevices: ["Pixel 8 Pro", "Samsung S24", "Xiaomi 14", "OPPO Find X7"],
        summary: {
          types: [
            { type: "API Tests", count: 562 },
            { type: "Browser UI", count: 438 },
            { type: "iOS Mobile", count: 128 },
            { type: "Android Mobile", count: 139 },
            { type: "Performance", count: 86 }
          ],
          total: "1,353",
          readyToExecute: "test cases generated, ready to execute"
        }
      },
      execute: {
        title: "AI Auto-executing Tests",
        desc: "Multi-protocol parallel execution with real-time monitoring",
        lanes: [
          { type: "HTTP / REST API", desc: "Full HTTP testing, RESTful & GraphQL support" },
          { type: "gRPC Services", desc: "High-performance gRPC testing, Unary / Streaming" },
          { type: "Browser Tests", desc: "Chrome / Firefox / Safari / Edge cross-browser" },
          { type: "iOS Mobile", desc: "iPhone / iPad real device & simulator" },
          { type: "Android Mobile", desc: "Pixel / Samsung / Xiaomi multi-device" }
        ],
        stats: [
          { label: "Total", value: "1,353" },
          { label: "Passed", value: "1,312" },
          { label: "Failed", value: "28" },
          { label: "Duration", value: "4m 32s" }
        ]
      },
      report: {
        title: "AI Generating Test Report",
        desc: "Intelligent analysis of results, visual report generation",
        complete: "Workflow Complete",
        metrics: [
          { label: "Pass Rate", value: "97.1%" },
          { label: "Coverage", value: "94.8%" },
          { label: "Total Cases", value: "1,353" },
          { label: "Defects", value: "28" }
        ],
        chartTitle: "Test Type Distribution",
        chartLabels: ["API", "UI", "iOS", "Android", "gRPC"],
        defectTitle: "Defect Distribution",
        defects: [
          { module: "Payment", count: 12, severity: "High" },
          { module: "Orders", count: 8, severity: "Medium" },
          { module: "Users", count: 5, severity: "Low" },
          { module: "Other", count: 3, severity: "Low" }
        ],
        browserRecording: "Browser Recording - Chrome",
        downloadReport: "Download Report",
        shareReport: "Share Report",
        timeSaved: "Total time 4m 32s · Saved 48+ hours of manual work"
      }
    },
    errors: {
      common: {
        unauthorized: "Not logged in",
        forbidden: "No permission to access",
        requestFailed: "Request failed",
        missingWorkspace: "Missing workspace parameter",
        workspaceForbidden: "No permission to access this workspace",
        adminRequired: "Admin permission required",
        superadminRequired: "Super admin permission required"
      },
      auth: {
        invalidCredentials: "Invalid email or password",
        defaultWorkspaceNotFound: "Default workspace not found",
        emailAlreadyRegistered: "Email already registered",
        registrationDisabled: "Registration is currently disabled",
        invitationInvalid: "Invitation code is invalid or already used",
        invitationExpired: "Invitation code has expired"
      },
      user: {
        notFound: "User not found",
        emailInUse: "Email already in use",
        wrongPassword: "Current password is incorrect"
      },
      workspace: {
        notFound: "Workspace not found",
        onlyOwnerCanUpdate: "Only the owner can update",
        onlyOwnerCanDelete: "Only the owner can delete",
        slugExists: "Slug already exists"
      },
      todo: {
        notFound: "Todo not found"
      },
      testRequirement: {
        notFound: "Test requirement not found",
        createFetchFailed: "Unable to query record after creation",
        updateFetchFailed: "Unable to query record after update",
        deleteChildrenFirst: "Please delete all child requirements first"
      }
    },
    proxy: {
      title: "Proxy Subscription",
      newSubscribe: "New Subscription",
      editSubscribe: "Edit Subscription",
      deleteSuccess: "Deleted successfully",
      deleteFailed: "Delete failed",
      createSuccess: "Created successfully",
      createFailed: "Create failed",
      updateSuccess: "Updated successfully",
      updateFailed: "Update failed",
      copiedToClipboard: "Copied to clipboard",
      confirmDelete: "Confirm Delete",
      confirmDeleteDesc: "Are you sure you want to delete this subscription?",
      columns: {
        creator: "Creator",
        remark: "Remark",
        clashUrl: "Clash Subscribe URL",
        singboxUrl: "Sing-box Subscribe URL",
        lastUpdate: "Last Update",
        actions: "Actions"
      },
      actions: {
        preview: "Preview Nodes",
        edit: "Edit",
        delete: "Delete"
      },
      tabs: {
        basic: "Basic Info",
        subscribeUrl: "Subscribe URL",
        ruleList: "Rule List",
        group: "Groups",
        filter: "Filters",
        customConfig: "Custom Config",
        servers: "Extra Servers"
      },
      form: {
        remark: "Remark",
        remarkPlaceholder: "Subscription remark",
        authorizedUsers: "Authorized Users",
        authorizedUsersPlaceholder: "Select users to authorize (optional)",
        subscribeUrlLabel: "Subscribe URLs (JSON array, comments supported)",
        subscribeUrlRequired: "Please enter subscribe URL",
        subscribeUrlPlaceholder: '["https://example.com/subscribe"]',
        ruleListLabel: "Rule List (JSON object, comments supported)",
        ruleListPlaceholder: '{"GroupName": [{"name": "RuleName", "url": "RuleURL"}]}',
        groupLabel: "Group Config (JSON array, comments supported)",
        groupPlaceholder: '[{"name": "GroupName", "type": "select", "proxies": ["Node1"]}]',
        filterLabel: "Node Filters (JSON array, comments supported)",
        filterPlaceholder: '["keyword1", "keyword2"]',
        customConfigLabel: "Custom Rules (JSON array, comments supported)",
        customConfigPlaceholder: '["DOMAIN,example.com,DIRECT"]',
        serversLabel: "Extra Servers (JSON array, comments supported)",
        serversPlaceholder: '[{"name": "ServerName", "type": "ss", "server": "1.2.3.4", "port": 443}]',
        jsonFormatError: "JSON format error"
      },
      preview: {
        title: "Node Preview",
        unnamed: "Unnamed Subscription",
        noNodes: "No nodes found",
        totalNodes: "Total {{total}} nodes, {{active}} active",
        filtered: "Filtered",
        clickToExpand: "Click row to expand details",
        source: "Source",
        manual: "Manual",
        protocol: "Protocol",
        nodeName: "Node Name",
        server: "Server",
        port: "Port",
        transport: "Transport/TLS",
        secret: "Secret/UUID",
        clickToCopy: "Click to copy",
        clickToCopyFull: "Click to copy full secret",
        filteredBy: "Filtered by rule \"{{rule}}\"",
        noDetailInfo: "No detailed configuration",
        filters: {
          validNodes: "Valid Nodes",
          filtered: "Filtered"
        }
      },
      common: {
        confirm: "Confirm",
        cancel: "Cancel"
      }
    },
    footer: {
      copyright: "© 2026 TestOps AI. All rights reserved.",
      tagline: "AI-first testing operations platform"
    },
    systemSettings: {
      title: "System Settings",
      generalTab: "General",
      usersTab: "User Management",
      allowRegistration: "Allow New User Registration",
      allowRegistrationDesc: "When disabled, new users cannot register",
      userList: "User List",
      userRole: "Role",
      lastLoginAt: "Last Login",
      userCreatedAt: "Registered",
      userActions: "Actions",
      roleUser: "User",
      roleAdmin: "Admin",
      roleSuperAdmin: "Super Admin",
      changeRole: "Change Role",
      resetPassword: "Reset Password",
      deleteUser: "Delete User",
      confirmDelete: "Confirm Delete",
      confirmDeleteDesc: "Are you sure you want to delete user {{name}}? This action cannot be undone.",
      resetPasswordTitle: "Reset Password",
      resetPasswordDesc: "Set a new password for user {{name}}",
      newPassword: "New Password",
      saveSuccess: "Saved successfully",
      deleteSuccess: "Deleted successfully",
      resetSuccess: "Password reset successfully",
      addUser: "Add User",
      addUserTitle: "Add New User",
      addUserDesc: "Manually create a new user account",
      userName: "Name",
      userEmail: "Email",
      userPassword: "Password",
      userRoleSelect: "Select Role",
      addUserSuccess: "User created successfully",
      emailExists: "This email is already registered",
      invitationTab: "Invitations",
      generateInvitation: "Generate Invitation Link",
      invitationList: "Invitation Codes",
      invitationCode: "Code",
      invitationStatus: "Status",
      invitationCreatedAt: "Created",
      invitationExpiresAt: "Expires",
      invitationUsedBy: "Used By",
      invitationUsedAt: "Used At",
      invitationStatusUnused: "Unused",
      invitationStatusUsed: "Used",
      invitationStatusExpired: "Expired",
      invitationNeverExpire: "Never",
      invitationCopied: "Invitation link copied to clipboard",
      invitationGenerated: "Invitation link generated",
      invitationDeleted: "Invitation code deleted",
      copyInvitationLink: "Copy Link",
      deleteInvitation: "Delete",
      expiresInHours: "Expires in (hours)",
      noExpiration: "No expiration"
    }
  }
};
