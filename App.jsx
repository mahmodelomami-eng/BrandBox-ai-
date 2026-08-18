import React, { useState, useEffect, useRef, useReducer } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Layers,
  Palette,
  CreditCard,
  Sliders,
  Coins,
  FolderOpen,
  Download,
  Bot,
  Database,
  Plus,
  Search,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Send,
  Trash2,
  LogOut,
  Lock,
  CheckCircle2,
  Server,
  ShieldAlert,
  History,
  Eye,
  FolderPlus,
  ArrowRight,
  Briefcase,
  Users,
  Target,
  Globe,
  MessageCircle,
  ChevronDown,
  Activity,
  Settings,
  ExternalLink,
  Filter,
  Play,
  Clock,
  AlertTriangle,
  AlertCircle,
  Ban,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  FileText,
  Check,
  Zap,
  Award,
  QrCode,
  SlidersHorizontal,
  ChevronLeft,
  LockKeyhole,
  UserCheck,
  ShieldQuestion,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Edit3,
  UserX,
  AlertOctagon,
  Bell,
  Cpu,
  BarChart3,
  PieChart,
  Copy,
  Share2,
  Sparkle,
  Tag,
  FileType,
  CheckSquare,
  Wand2,
  Film,
  Layers3,
  ChevronRight,
} from "lucide-react";

export const UNIFIED_MODEL_REGISTRY = {
  chat: [
    {
      id: "openai/gpt-4o-mini",
      displayName: "GPT-4o Mini",
      provider: "OpenAI",
      creditCost: 2,
      minPlan: "free",
      isActive: true,
      capabilities: ["text", "code", "arabic-optimized"],
      environment: "production",
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      displayName: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      creditCost: 4,
      minPlan: "starter",
      isActive: true,
      capabilities: ["analysis", "coding", "long-context"],
      environment: "production",
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      displayName: "Llama 3.3 70B",
      provider: "Meta",
      creditCost: 2,
      minPlan: "free",
      isActive: true,
      capabilities: ["open-weights", "fast"],
      environment: "production",
    },
    {
      id: "google/gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      provider: "Google",
      creditCost: 1,
      minPlan: "free",
      isActive: true,
      capabilities: ["ultra-fast", "cost-efficient"],
      environment: "production",
    },
  ],
  image: [
    {
      id: "imagen-4.0-generate-001",
      displayName: "Imagen 4.0 Ultra",
      provider: "Google",
      creditCost: 5,
      minPlan: "starter",
      isActive: true,
      capabilities: ["photorealistic", "3d", "cinematic"],
      environment: "production",
    },
    {
      id: "gemini-3.1-flash-image-preview",
      displayName: "Gemini Flash Image",
      provider: "Google",
      creditCost: 4,
      minPlan: "free",
      isActive: true,
      capabilities: ["editing", "fast"],
      environment: "production",
    },
    {
      id: "flux-1-schnell",
      displayName: "Flux 1 Schnell",
      provider: "Black Forest Labs",
      creditCost: 3,
      minPlan: "free",
      isActive: true,
      capabilities: ["anime", "minimalist"],
      environment: "production",
    },
  ],
  video: [
    {
      id: "runway-gen3-alpha",
      displayName: "Runway Gen-3 Alpha",
      provider: "Runway",
      creditCost: 15,
      minPlan: "pro",
      isActive: false,
      status: "provider_not_configured",
      capabilities: ["video-generation"],
      environment: "staging",
    },
  ],
};

export const INITIAL_PLANS = [
  {
    id: "free",
    name: "المجانية (Free)",
    priceMonthlyLYD: 0,
    priceMonthlyUSD: 0,
    monthlyCredits: 50,
    maxProjects: 2,
    videoAccess: false,
    brandKitAccess: true,
    commercialUsage: false,
    description: "مثالية لتجربة المنصة واستكشاف الأدوات الأساسية.",
    badge: "البداية",
    isActive: true,
  },
  {
    id: "starter",
    name: "الأساسية (Starter)",
    priceMonthlyLYD: 45,
    priceMonthlyUSD: 9,
    monthlyCredits: 200,
    maxProjects: 5,
    videoAccess: false,
    brandKitAccess: true,
    commercialUsage: true,
    description: "ل للمستقلين وصناع المحتوى الناشئين.",
    badge: "النمو",
    isActive: true,
  },
  {
    id: "pro",
    name: "الاحترافية (Pro)",
    priceMonthlyLYD: 145,
    priceMonthlyUSD: 29,
    monthlyCredits: 1000,
    maxProjects: 25,
    videoAccess: true,
    brandKitAccess: true,
    commercialUsage: true,
    description: "الخيار الأفضل للشركات الناشئة والمصممين المحترفين.",
    badge: "الأكثر شعبية",
    isPopular: true,
    isActive: true,
  },
  {
    id: "business",
    name: "الأعمال (Business)",
    priceMonthlyLYD: 395,
    priceMonthlyUSD: 79,
    monthlyCredits: 5000,
    maxProjects: 100,
    videoAccess: true,
    brandKitAccess: true,
    commercialUsage: true,
    description: "للوكالات الرقمية والفرق التسويقية التنافسية.",
    badge: "المرونة القصوى",
    isActive: true,
  },
];

export const INITIAL_CREDIT_PACKAGES = [
  {
    id: "pkg_100",
    name: "باقة 100 نقطة",
    credits: 100,
    priceLYD: 25,
    priceUSD: 5,
    bonus: 0,
    isActive: true,
  },
  {
    id: "pkg_500",
    name: "باقة 500 نقطة",
    credits: 500,
    priceLYD: 100,
    priceUSD: 20,
    bonus: 50,
    isActive: true,
  },
  {
    id: "pkg_1000",
    name: "باقة 1000 نقطة",
    credits: 1000,
    priceLYD: 175,
    priceUSD: 35,
    bonus: 150,
    isBestValue: true,
    isActive: true,
  },
  {
    id: "pkg_5000",
    name: "باقة 5000 نقطة",
    credits: 5000,
    priceLYD: 750,
    priceUSD: 150,
    bonus: 1000,
    isActive: true,
  },
];

export const TEMPLATES_DATABASE = [
  {
    id: "tpl-01",
    title: "حملة ترويج القهوة المختصة",
    category: "مطاعم ومقاهي",
    industry: "الأغذية والمشروبات",
    description: "تصميم بصرية سينمائية مع نص إعلاني فاخر باللغة العربية.",
    badge: "شائع",
    thumbnail:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "tpl-02",
    title: "إعلان مجمع سكني فاخر",
    category: "إعلانات",
    industry: "العقارات",
    description: "صور معمارية حديثة مع نصوص تسويقية موجهة للمستثمرين.",
    badge: "احترافي",
    thumbnail:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "tpl-03",
    title: "افتتاح مركز تعليمي جديد",
    category: "مدارس وتعلّيم",
    industry: "التعليم",
    description: "بوستات توعية وقبول وتعديل الهوية البصرية للجامعات والمدارس.",
    badge: "جديد",
    thumbnail:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "tpl-04",
    title: "تهنئة المناسبات الرسمية والأعياد",
    category: "مناسبات رسمية",
    industry: "عام",
    description: "قوالب بطاقات معايدة فاخرة قابلة للتخصيص بشعار شركتك.",
    badge: "موسمي",
    thumbnail:
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "tpl-05",
    title: "انفوجرافيك إحصائيات الشركات",
    category: "انفوجرافيك",
    industry: "أعمال",
    description: "عروض بصرية للبيانات ومؤشرات الأداء التنافسية.",
    badge: "أعمال",
    thumbnail:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "tpl-06",
    title: "خصومات وتخفيضات التجارة الإلكترونية",
    category: "وسائل التواصل",
    industry: "التجارة الإلكترونية",
    description: "تصاميم خصم حصرية وبنرات ستوري متناسقة مع متجرك.",
    badge: "تخفيضات",
    thumbnail:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&auto=format&fit=crop&q=80",
  },
];

export const ROLE_PERMISSIONS_MATRIX = {
  SUPER_ADMIN: new Set([
    "USERS_READ",
    "USERS_MANAGE",
    "PROJECTS_READ",
    "PROJECTS_MANAGE",
    "SUBSCRIPTIONS_READ",
    "SUBSCRIPTIONS_MANAGE",
    "PAYMENTS_READ",
    "PAYMENTS_MANAGE",
    "CREDITS_READ",
    "CREDITS_MANAGE",
    "PLANS_READ",
    "PLANS_MANAGE",
    "PACKAGES_READ",
    "PACKAGES_MANAGE",
    "PROVIDERS_READ",
    "PROVIDERS_MANAGE",
    "MODELS_READ",
    "MODELS_MANAGE",
    "GENERATIONS_READ",
    "GENERATIONS_MANAGE",
    "ASSETS_READ",
    "ASSETS_MANAGE",
    "AUDIT_LOGS_READ",
    "ERRORS_READ",
    "ANALYTICS_READ",
    "SETTINGS_READ",
    "SETTINGS_MANAGE",
    "ADMIN_MANAGE",
    "SECURITY_MANAGE",
  ]),
  ADMIN: new Set([
    "USERS_READ",
    "USERS_MANAGE",
    "PROJECTS_READ",
    "PROJECTS_MANAGE",
    "SUBSCRIPTIONS_READ",
    "SUBSCRIPTIONS_MANAGE",
    "PAYMENTS_READ",
    "PAYMENTS_MANAGE",
    "CREDITS_READ",
    "CREDITS_MANAGE",
    "GENERATIONS_READ",
    "GENERATIONS_MANAGE",
    "ASSETS_READ",
    "ASSETS_MANAGE",
    "AUDIT_LOGS_READ",
    "ERRORS_READ",
    "ANALYTICS_READ",
    "PLANS_READ",
    "PACKAGES_READ",
    "PROVIDERS_READ",
    "MODELS_READ",
    "SETTINGS_READ",
  ]),
  SUPPORT: new Set([
    "USERS_READ",
    "PROJECTS_READ",
    "SUBSCRIPTIONS_READ",
    "PAYMENTS_READ",
    "GENERATIONS_READ",
    "ASSETS_READ",
  ]),
  USER: new Set([]),
};

export function checkHasPermission(role, permission) {
  if (!role || role === "USER") return false;
  const permissions = ROLE_PERMISSIONS_MATRIX[role];
  return permissions ? permissions.has(permission) : false;
}

const initialUsers = [
  {
    id: "usr_supabase_981240",
    firstName: "محمود",
    lastName: "الحسن",
    email: "mahmoud@brandbox.ai",
    phone: "0912345678",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    adminRole: "SUPER_ADMIN",
    status: "active",
    planId: "pro",
    creditBalance: 340,
    createdAt: "2026-01-15T08:00:00Z",
    lastActive: "منذ دقيقة",
  },
  {
    id: "usr_supabase_412091",
    firstName: "فاطمة",
    lastName: "الورفلي",
    email: "fatima@techly.ly",
    phone: "0928887766",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    adminRole: "ADMIN",
    status: "active",
    planId: "starter",
    creditBalance: 120,
    createdAt: "2026-02-10T10:30:00Z",
    lastActive: "منذ ساعة",
  },
  {
    id: "usr_supabase_330192",
    firstName: "عمر",
    lastName: "الصرّاف",
    email: "omar.support@brandbox.ai",
    phone: "0941112233",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    adminRole: "SUPPORT",
    status: "active",
    planId: "free",
    creditBalance: 45,
    createdAt: "2026-03-01T14:15:00Z",
    lastActive: "منذ يومين",
  },
  {
    id: "usr_supabase_883012",
    firstName: "طارق",
    lastName: "البدري",
    email: "tariq@designstudio.ly",
    phone: "0915554433",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    adminRole: "USER",
    status: "suspended",
    planId: "business",
    creditBalance: 0,
    createdAt: "2026-04-20T09:00:00Z",
    lastActive: "منذ أسبوع",
  },
];

const initialState = {
  auth: {
    isAuthenticated: true,
    user: initialUsers[0],
  },
  usersList: initialUsers,
  plansList: INITIAL_PLANS,
  packagesList: INITIAL_CREDIT_PACKAGES,
  modelRegistry: UNIFIED_MODEL_REGISTRY,
  providersList: [
    {
      id: "google",
      name: "Google Vertex AI",
      status: "healthy",
      configured: true,
      latencyMs: 140,
      capabilities: ["text", "image", "multimodal"],
      lastSuccess: "2026-08-11T03:55:00Z",
      lastFailure: null,
    },
    {
      id: "openai",
      name: "OpenAI Direct API",
      status: "healthy",
      configured: true,
      latencyMs: 280,
      capabilities: ["text", "code"],
      lastSuccess: "2026-08-11T03:50:00Z",
      lastFailure: null,
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      status: "healthy",
      configured: true,
      latencyMs: 310,
      capabilities: ["text", "long-context"],
      lastSuccess: "2026-08-11T02:10:00Z",
      lastFailure: null,
    },
    {
      id: "bfl",
      name: "Black Forest Labs (Flux)",
      status: "degraded",
      configured: true,
      latencyMs: 820,
      capabilities: ["image"],
      lastSuccess: "2026-08-11T01:30:00Z",
      lastFailure: "2026-08-10T22:15:00Z",
    },
    {
      id: "runway",
      name: "Runway Gen-3",
      status: "not_configured",
      configured: false,
      latencyMs: 0,
      capabilities: ["video"],
      lastSuccess: null,
      lastFailure: null,
    },
  ],
  subscriptionsList: [
    {
      id: "sub-001",
      userId: "usr_supabase_981240",
      userName: "محمود الحسن",
      planId: "pro",
      planName: "الاحترافية (Pro)",
      status: "active",
      amountLYD: 145,
      currentPeriodStart: "2026-08-01T00:00:00Z",
      currentPeriodEnd: "2026-09-01T00:00:00Z",
      autoRenew: true,
    },
    {
      id: "sub-002",
      userId: "usr_supabase_412091",
      userName: "فاطمة الورفلي",
      planId: "starter",
      planName: "الأساسية (Starter)",
      status: "active",
      amountLYD: 45,
      currentPeriodStart: "2026-08-05T00:00:00Z",
      currentPeriodEnd: "2026-09-05T00:00:00Z",
      autoRenew: true,
    },
    {
      id: "sub-003",
      userId: "usr_supabase_883012",
      userName: "طارق البدري",
      planId: "business",
      planName: "الأعمال (Business)",
      status: "cancelled",
      amountLYD: 395,
      currentPeriodStart: "2026-07-01T00:00:00Z",
      currentPeriodEnd: "2026-08-01T00:00:00Z",
      autoRenew: false,
    },
  ],
  paymentsList: [
    {
      id: "pay-801",
      orderReference: "BBX-172333-882",
      userId: "usr_supabase_981240",
      userName: "محمود الحسن",
      provider: "Ezone Pay",
      providerTxId: "ezp_tx_99182301",
      amountLYD: 145,
      currency: "LYD",
      status: "paid",
      itemType: "subscription",
      createdAt: "2026-08-01T00:00:00Z",
    },
    {
      id: "pay-802",
      orderReference: "BBX-172335-104",
      userId: "usr_supabase_981240",
      userName: "محمود الحسن",
      provider: "Ezone Pay",
      providerTxId: "ezp_tx_99182399",
      amountLYD: 25,
      currency: "LYD",
      status: "paid",
      itemType: "purchase",
      createdAt: "2026-08-05T11:20:00Z",
    },
    {
      id: "pay-803",
      orderReference: "BBX-172339-441",
      userId: "usr_supabase_412091",
      userName: "فاطمة الورفلي",
      provider: "Ezone Pay",
      providerTxId: "ezp_tx_99182410",
      amountLYD: 45,
      currency: "LYD",
      status: "paid",
      itemType: "subscription",
      createdAt: "2026-08-05T00:00:00Z",
    },
    {
      id: "pay-804",
      orderReference: "BBX-172340-990",
      userId: "usr_supabase_883012",
      userName: "طارق البدري",
      provider: "Ezone Pay",
      providerTxId: null,
      amountLYD: 395,
      currency: "LYD",
      status: "failed",
      itemType: "subscription",
      createdAt: "2026-08-01T00:00:00Z",
    },
  ],
  systemErrors: [
    {
      id: "err-901",
      severity: "WARNING",
      service: "Image Processing",
      route: "/admin/generations",
      userEmail: "tariq@designstudio.ly",
      message: "تجاوز زمن الانتظار المسموح به لنموذج Flux 1 Schnell",
      status: "unresolved",
      createdAt: "2026-08-10T22:15:00Z",
    },
    {
      id: "err-902",
      severity: "INFO",
      service: "Webhook Processor",
      route: "/api/v1/ezonepay/webhook",
      userEmail: "system@ezonepay.ly",
      message: "إعادة محاولة معالجة Webhook مكرر (تم التعامل مع idempotency)",
      status: "resolved",
      createdAt: "2026-08-05T11:20:05Z",
    },
  ],
  adminAlerts: [
    {
      id: "alt-01",
      type: "warning",
      title: "انخفاض الاستجابة في Flux 1",
      description: "تجاوز متوسط زمن استجابة Black Forest Labs 800ms.",
      createdAt: "منذ ساعتين",
      isRead: false,
    },
    {
      id: "alt-02",
      type: "info",
      title: "تأكيد Webhook S2S",
      description: "تم معالجة شحن عبر Ezone Pay بنجاح.",
      createdAt: "منذ 5 ساعات",
      isRead: true,
    },
  ],
  credits: {
    balance: 340,
    limit: 1000,
    usedThisMonth: 660,
    transactions: [
      {
        id: "tx-101",
        userId: "usr_supabase_981240",
        amount: -2,
        type: "generation",
        description: "توليد نص عبر GPT-4o Mini",
        referenceType: "chat",
        createdAt: "2026-08-10T18:30:00Z",
      },
      {
        id: "tx-102",
        userId: "usr_supabase_981240",
        amount: -5,
        type: "generation",
        description: "توليد صورة عبر Imagen 4.0 Ultra",
        referenceType: "image",
        createdAt: "2026-08-10T16:15:00Z",
      },
      {
        id: "tx-103",
        userId: "usr_supabase_981240",
        amount: 1000,
        type: "subscription",
        description: "تجديد الاشتراك الشهري (باقة Pro عبر Ezone Pay Webhook)",
        referenceType: "subscription",
        createdAt: "2026-08-01T00:00:00Z",
      },
      {
        id: "tx-104",
        userId: "usr_supabase_981240",
        amount: 100,
        type: "purchase",
        description: "شراء باقة 100 نقطة إضافية عبر Ezone Pay",
        referenceType: "purchase",
        createdAt: "2026-08-05T11:20:00Z",
      },
    ],
  },
  brandKit: {
    brandName: "القهوة الإثيوبية الفاخرة",
    tagline: "المذاق الأصيل من أعالي الهضاب",
    description:
      "علامة تجارية متخصصة في توفير القهوة المختصة العالية الجودة لعشاق المذاق الرفيع.",
    primaryColor: "#8B4513",
    secondaryColor: "#D2691E",
    accentColor: "#FF2E4C",
    fontFamily: "Cairo (عربي عصري)",
    toneOfVoice: "احترافي، دافئ، وحماسي",
    logoUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80",
    website: "https://coffee.brandbox.ly",
  },
  activeTab: "dashboard",
  adminRoute: "/admin",
  activeProjectId: "proj-1",
  projectWorkspaceTab: "overview",
  projects: [
    {
      id: "proj-1",
      ownerId: "usr_supabase_981240",
      ownerName: "محمود الحسن",
      name: "حملة متجر القهوة المختصة",
      type: "صورة + نص",
      description:
        "إطلاق خط إنتاج القهوة الإثيوبية الفاخرة مع هوية بصرية مخصصة.",
      industry: "الأغذية والمشروبات",
      targetAudience: "عشاق القهوة وجمهور جيل Z",
      language: "العربية",
      tone: "عصري وحماسي",
      timeAgo: "منذ ساعتين",
      thumbnail:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80",
      createdAt: "2026-08-10T12:00:00Z",
    },
    {
      id: "proj-2",
      ownerId: "usr_supabase_412091",
      ownerName: "فاطمة الورفلي",
      name: "تسويق المجمع العقاري الحديث",
      type: "فيديو AI",
      description: "حملة ترويجية للمجمعات السكنية الفاخرة في العاصمة طرابلس.",
      industry: "العقارات",
      targetAudience: "المستثمرون والعائلات الفاخرة",
      language: "العربية",
      tone: "احترافي وراقي",
      timeAgo: "منذ 5 ساعات",
      thumbnail:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80",
      createdAt: "2026-08-10T08:00:00Z",
    },
  ],
  generations: [
    {
      id: "gen-201",
      userId: "usr_supabase_981240",
      userName: "محمود الحسن",
      type: "image",
      provider: "Google",
      model: "imagen-4.0-generate-001",
      prompt: "فنجان قهوة فاخر مع إضاءة سينمائية دافئة وخلفية متجر عصري",
      settings: { style: "Cinematic", aspectRatio: "1:1", useBrandKit: true },
      status: "completed",
      durationMs: 2100,
      resultUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
      creditsUsed: 5,
      projectId: "proj-1",
      createdAt: "2026-08-10T16:15:00Z",
    },
  ],
  assets: [
    {
      id: "asset-301",
      generationId: "gen-201",
      userId: "usr_supabase_981240",
      userName: "محمود الحسن",
      projectId: "proj-1",
      projectName: "حملة متجر القهوة المختصة",
      type: "image",
      name: "تصميم_إعلان_القهوة_01.png",
      filePath:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
      mimeType: "image/png",
      width: 1024,
      height: 1024,
      createdAt: "2026-08-10T16:15:00Z",
    },
  ],
  auditLogs: [
    {
      id: "audit-001",
      actorId: "usr_supabase_981240",
      actorEmail: "mahmoud@brandbox.ai",
      actorRole: "SUPER_ADMIN",
      action: "ADMIN_ADJUSTED_CREDITS",
      entity: "credits",
      entityId: "usr_supabase_981240",
      beforeState: { balance: 240 },
      afterState: { balance: 340 },
      result: { status: "success" },
      metadata: { reason: "تعديل إداري لاختبار الشحن" },
      createdAt: "2026-08-11T02:15:00Z",
    },
  ],
  toastNotification: null,
  isCreateProjectOpen: false,
  selectedUserModal: null,
  activeCreditModal: false,
  activeSubModal: null,
  activePlanModal: null,
  activePackageModal: null,
  activeModelModal: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.payload };

    case "SET_ADMIN_ROUTE":
      return { ...state, activeTab: "admin-shell", adminRoute: action.payload };

    case "SET_ACTIVE_PROJECT":
      return {
        ...state,
        activeProjectId: action.payload,
        activeTab: "project-workspace",
        projectWorkspaceTab: "overview",
      };

    case "SET_PROJECT_WORKSPACE_TAB":
      return { ...state, projectWorkspaceTab: action.payload };

    case "SWITCH_SIMULATED_ROLE": {
      const selectedRole = action.payload;
      const targetUser = state.usersList.find(
        (u) => u.adminRole === selectedRole,
      ) || {
        ...state.auth.user,
        adminRole: selectedRole,
      };
      return {
        ...state,
        auth: { ...state.auth, user: targetUser },
      };
    }

    case "UPDATE_BRAND_KIT":
      return {
        ...state,
        brandKit: { ...state.brandKit, ...action.payload },
      };

    case "CREATE_PROJECT": {
      const newProj = {
        id: `proj-${Date.now()}`,
        ownerId: state.auth.user.id,
        ownerName: `${state.auth.user.firstName} ${state.auth.user.lastName}`,
        name: action.payload.name,
        type: action.payload.type || "صورة + نص",
        description: action.payload.description || "",
        industry: action.payload.industry || "عام",
        targetAudience: action.payload.targetAudience || "الجميع",
        language: "العربية",
        tone: action.payload.tone || "احترافي",
        timeAgo: "الآن",
        thumbnail:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80",
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        projects: [newProj, ...state.projects],
        activeProjectId: newProj.id,
        activeTab: "project-workspace",
        projectWorkspaceTab: "overview",
        isCreateProjectOpen: false,
      };
    }

    case "ADMIN_SUSPEND_USER": {
      const { targetUserId, reason } = action.payload;
      const actor = state.auth.user;
      const updatedUsers = state.usersList.map((u) =>
        u.id === targetUserId ? { ...u, status: "suspended" } : u,
      );
      const target = state.usersList.find((u) => u.id === targetUserId);

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_SUSPENDED_USER",
        entity: "profiles",
        entityId: targetUserId,
        beforeState: { status: target?.status || "active" },
        afterState: { status: "suspended" },
        result: { status: "success" },
        metadata: { reason: reason || "إيقاف تشغيلي بقرار إداري" },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        usersList: updatedUsers,
        auditLogs: [auditRecord, ...state.auditLogs],
      };
    }

    case "ADMIN_REACTIVATE_USER": {
      const { targetUserId } = action.payload;
      const actor = state.auth.user;
      const updatedUsers = state.usersList.map((u) =>
        u.id === targetUserId ? { ...u, status: "active" } : u,
      );
      const target = state.usersList.find((u) => u.id === targetUserId);

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_REACTIVATED_USER",
        entity: "profiles",
        entityId: targetUserId,
        beforeState: { status: target?.status || "suspended" },
        afterState: { status: "active" },
        result: { status: "success" },
        metadata: { reason: "إعادة تفعيل الحساب بعد المراجعة" },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        usersList: updatedUsers,
        auditLogs: [auditRecord, ...state.auditLogs],
      };
    }

    case "ADMIN_ADJUST_CREDITS": {
      const { targetUserId, amount, reason, reference } = action.payload;
      const actor = state.auth.user;
      const target = state.usersList.find((u) => u.id === targetUserId);

      if (!target) return state;

      const beforeBalance = target.creditBalance;
      const newBalance = Math.max(0, beforeBalance + amount);
      const updatedUsers = state.usersList.map((u) =>
        u.id === targetUserId ? { ...u, creditBalance: newBalance } : u,
      );

      const creditTx = {
        id: `tx-${Date.now()}`,
        userId: targetUserId,
        amount,
        type: amount >= 0 ? "grant" : "deduction",
        description: `تسوية إدارية بواسطة (${actor.email}): ${reason}`,
        referenceType: reference || "admin_adjustment",
        createdAt: new Date().toISOString(),
      };

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_ADJUSTED_CREDITS",
        entity: "credits",
        entityId: targetUserId,
        beforeState: { balance: beforeBalance },
        afterState: { balance: newBalance },
        result: { status: "success" },
        metadata: { amount, reason, reference },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        usersList: updatedUsers,
        credits: {
          ...state.credits,
          balance:
            targetUserId === state.auth.user.id
              ? newBalance
              : state.credits.balance,
          transactions: [creditTx, ...state.credits.transactions],
        },
        auditLogs: [auditRecord, ...state.auditLogs],
        activeCreditModal: false,
      };
    }

    case "ADMIN_CANCEL_SUBSCRIPTION": {
      const { subId, reason } = action.payload;
      const actor = state.auth.user;
      const targetSub = state.subscriptionsList.find((s) => s.id === subId);

      if (!targetSub) return state;

      const updatedSubs = state.subscriptionsList.map((s) =>
        s.id === subId ? { ...s, status: "cancelled", autoRenew: false } : s,
      );

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_CANCELLED_SUBSCRIPTION",
        entity: "subscriptions",
        entityId: subId,
        beforeState: {
          status: targetSub.status,
          autoRenew: targetSub.autoRenew,
        },
        afterState: { status: "cancelled", autoRenew: false },
        result: { status: "success" },
        metadata: { reason: reason || "إلغاء إداري بناءً على الطلب" },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        subscriptionsList: updatedSubs,
        auditLogs: [auditRecord, ...state.auditLogs],
        activeSubModal: null,
      };
    }

    case "ADMIN_EXTEND_SUBSCRIPTION": {
      const { subId, extraDays } = action.payload;
      const actor = state.auth.user;
      const targetSub = state.subscriptionsList.find((s) => s.id === subId);

      if (!targetSub) return state;

      const currentEnd = new Date(targetSub.currentPeriodEnd);
      const newEnd = new Date(
        currentEnd.getTime() + extraDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const updatedSubs = state.subscriptionsList.map((s) =>
        s.id === subId ? { ...s, currentPeriodEnd: newEnd } : s,
      );

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_EXTENDED_SUBSCRIPTION",
        entity: "subscriptions",
        entityId: subId,
        beforeState: { currentPeriodEnd: targetSub.currentPeriodEnd },
        afterState: { currentPeriodEnd: newEnd },
        result: { status: "success" },
        metadata: { extraDays },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        subscriptionsList: updatedSubs,
        auditLogs: [auditRecord, ...state.auditLogs],
        activeSubModal: null,
      };
    }

    case "ADMIN_UPDATE_MODEL_PRICE": {
      const { modelId, newCreditCost } = action.payload;
      const actor = state.auth.user;

      let oldCost = 0;
      let modelCategory = "chat";

      Object.keys(state.modelRegistry).forEach((cat) => {
        const found = state.modelRegistry[cat].find((m) => m.id === modelId);
        if (found) {
          oldCost = found.creditCost;
          modelCategory = cat;
        }
      });

      const updatedRegistry = { ...state.modelRegistry };
      updatedRegistry[modelCategory] = updatedRegistry[modelCategory].map(
        (m) => (m.id === modelId ? { ...m, creditCost: newCreditCost } : m),
      );

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_CHANGED_MODEL_PRICE",
        entity: "models",
        entityId: modelId,
        beforeState: { creditCost: oldCost },
        afterState: { creditCost: newCreditCost },
        result: { status: "success" },
        metadata: { category: modelCategory },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        modelRegistry: updatedRegistry,
        auditLogs: [auditRecord, ...state.auditLogs],
        activeModelModal: null,
      };
    }

    case "ADMIN_UPDATE_PLAN": {
      const { planId, newPriceLYD, newCredits } = action.payload;
      const actor = state.auth.user;
      const targetPlan = state.plansList.find((p) => p.id === planId);

      if (!targetPlan) return state;

      const updatedPlans = state.plansList.map((p) =>
        p.id === planId
          ? { ...p, priceMonthlyLYD: newPriceLYD, monthlyCredits: newCredits }
          : p,
      );

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_CHANGED_PLAN",
        entity: "plans",
        entityId: planId,
        beforeState: {
          priceMonthlyLYD: targetPlan.priceMonthlyLYD,
          monthlyCredits: targetPlan.monthlyCredits,
        },
        afterState: {
          priceMonthlyLYD: newPriceLYD,
          monthlyCredits: newCredits,
        },
        result: { status: "success" },
        metadata: { planName: targetPlan.name },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        plansList: updatedPlans,
        auditLogs: [auditRecord, ...state.auditLogs],
        activePlanModal: null,
      };
    }

    case "ADMIN_UPDATE_PACKAGE": {
      const { pkgId, newPriceLYD, newCredits } = action.payload;
      const actor = state.auth.user;
      const targetPkg = state.packagesList.find((p) => p.id === pkgId);

      if (!targetPkg) return state;

      const updatedPackages = state.packagesList.map((p) =>
        p.id === pkgId
          ? { ...p, priceLYD: newPriceLYD, credits: newCredits }
          : p,
      );

      const auditRecord = {
        id: `audit-${Date.now()}`,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.adminRole,
        action: "ADMIN_CHANGED_PACKAGE",
        entity: "packages",
        entityId: pkgId,
        beforeState: {
          priceLYD: targetPkg.priceLYD,
          credits: targetPkg.credits,
        },
        afterState: { priceLYD: newPriceLYD, credits: newCredits },
        result: { status: "success" },
        metadata: { pkgName: targetPkg.name },
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        packagesList: updatedPackages,
        auditLogs: [auditRecord, ...state.auditLogs],
        activePackageModal: null,
      };
    }

    case "SET_SELECTED_USER_MODAL":
      return { ...state, selectedUserModal: action.payload };

    case "SET_ACTIVE_CREDIT_MODAL":
      return { ...state, activeCreditModal: action.payload };

    case "SET_ACTIVE_SUB_MODAL":
      return { ...state, activeSubModal: action.payload };

    case "SET_ACTIVE_PLAN_MODAL":
      return { ...state, activePlanModal: action.payload };

    case "SET_ACTIVE_PACKAGE_MODAL":
      return { ...state, activePackageModal: action.payload };

    case "SET_ACTIVE_MODEL_MODAL":
      return { ...state, activeModelModal: action.payload };

    case "SET_CREATE_PROJECT_MODAL":
      return { ...state, isCreateProjectOpen: action.payload };

    case "SHOW_TOAST":
      return { ...state, toastNotification: action.payload };

    case "CLEAR_TOAST":
      return { ...state, toastNotification: null };

    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showToast = (text, type = "info") => {
    dispatch({ type: "SHOW_TOAST", payload: { text, type } });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 4500);
  };

  const isAdminShellActive = state.activeTab === "admin-shell";
  const currentUserRole = state.auth.user?.adminRole || "USER";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#090A0F] text-gray-100 font-sans flex flex-col selection:bg-[#FF2E4C] selection:text-white"
    >
      {/* Toast Notification Banner */}
      {state.toastNotification && (
        <div
          className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-fade-in ${
            state.toastNotification.type === "error"
              ? "bg-[#121520] border-red-500/50 text-red-200"
              : state.toastNotification.type === "success"
                ? "bg-[#121520] border-emerald-500/50 text-emerald-200"
                : "bg-[#121520] border-[#FF2E4C]/40 text-white"
          }`}
        >
          {state.toastNotification.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : state.toastNotification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-[#FF2E4C] shrink-0" />
          )}
          <span>{state.toastNotification.text}</span>
          <button
            onClick={() => dispatch({ type: "CLEAR_TOAST" })}
            className="text-gray-400 hover:text-white mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Navigation Header */}
      <Header
        state={state}
        dispatch={dispatch}
        showToast={showToast}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 relative overflow-hidden">
        {isAdminShellActive ? (
          <AdminShellLayout
            state={state}
            dispatch={dispatch}
            showToast={showToast}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        ) : (
          <UserWorkspaceLayout
            state={state}
            dispatch={dispatch}
            showToast={showToast}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
      </div>

      {/* Management Modals */}
      {state.isCreateProjectOpen && (
        <CreateProjectModal dispatch={dispatch} showToast={showToast} />
      )}
      {state.selectedUserModal && (
        <UserDetailModal
          user={state.selectedUserModal}
          state={state}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {state.activeCreditModal && (
        <AdminCreditAdjustmentModal
          state={state}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {state.activeSubModal && (
        <AdminSubscriptionModal
          sub={state.activeSubModal}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {state.activePlanModal && (
        <AdminPlanEditModal
          plan={state.activePlanModal}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {state.activePackageModal && (
        <AdminPackageEditModal
          pkg={state.activePackageModal}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {state.activeModelModal && (
        <AdminModelPriceModal
          model={state.activeModelModal}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function Header({
  state,
  dispatch,
  showToast,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const isAdminShellActive = state.activeTab === "admin-shell";
  const currentUserRole = state.auth.user?.adminRole || "USER";

  return (
    <header className="h-16 bg-[#0D0F17] border-b border-[#1F2438] px-4 lg:px-8 flex items-center justify-between z-40 sticky top-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-gray-400 hover:text-white p-2"
        >
          <Layers className="w-6 h-6" />
        </button>

        <div
          onClick={() => dispatch({ type: "SET_TAB", payload: "dashboard" })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E50914] to-[#FF2E4C] flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-[#FF2E4C]/20 group-hover:scale-105 transition">
            B
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-wider text-white">
              BRAND <span className="text-[#FF2E4C]">BOX</span> AI
            </span>
            <span className="hidden sm:inline-block text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold mr-2">
              PHASE 8.4 VERIFIED
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Simulated Role Selector */}
        <div className="flex items-center gap-1.5 bg-[#121520] border border-[#1F2438] px-2.5 py-1 rounded-xl text-xs">
          <ShieldQuestion className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden md:inline text-gray-400 font-bold text-[11px]">
            اختبار الدور:
          </span>
          <select
            value={currentUserRole}
            onChange={(e) => {
              dispatch({
                type: "SWITCH_SIMULATED_ROLE",
                payload: e.target.value,
              });
              showToast(`تم تغيير دور الحساب إلى: ${e.target.value}`, "info");
            }}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
          >
            <option value="SUPER_ADMIN" className="bg-[#121520] text-white">
              SUPER_ADMIN (كامل)
            </option>
            <option value="ADMIN" className="bg-[#121520] text-white">
              ADMIN (تشغيلي)
            </option>
            <option value="SUPPORT" className="bg-[#121520] text-white">
              SUPPORT (قراءة فقط)
            </option>
            <option value="USER" className="bg-[#121520] text-white">
              USER (مستخدم عادي)
            </option>
          </select>
        </div>

        {/* Toggle Admin Control Center Shell Switcher */}
        {currentUserRole !== "USER" && (
          <button
            onClick={() => {
              if (isAdminShellActive) {
                dispatch({ type: "SET_TAB", payload: "dashboard" });
              } else {
                dispatch({ type: "SET_ADMIN_ROUTE", payload: "/admin" });
              }
            }}
            className={`text-xs font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition border shadow-lg ${
              isAdminShellActive
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                : "bg-[#FF2E4C] hover:bg-[#E50914] text-white border-[#FF2E4C]/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isAdminShellActive
                ? "العودة لمساحة العمل"
                : "لوحة التحكم الإدارية (Admin)"}
            </span>
          </button>
        )}

        <div
          onClick={() => dispatch({ type: "SET_TAB", payload: "billing" })}
          className="hidden sm:flex items-center gap-2 bg-[#FF2E4C]/10 border border-[#FF2E4C]/30 px-3.5 py-1.5 rounded-lg cursor-pointer hover:bg-[#FF2E4C]/20 transition"
        >
          <Coins className="w-4 h-4 text-[#FF2E4C]" />
          <span className="text-xs font-semibold text-gray-300">الرصيد:</span>
          <span className="text-xs font-bold text-[#FF2E4C]">
            {state.auth.user.creditBalance ?? state.credits.balance}
          </span>
        </div>
      </div>
    </header>
  );
}

function UserWorkspaceLayout({
  state,
  dispatch,
  showToast,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <aside
        className={`w-64 bg-[#0D0F17] border-l border-[#1F2438] flex-col justify-between fixed lg:static inset-y-0 right-0 z-30 transform ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out flex shrink-0`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
              منطقة العمل المركزية
            </p>
            <NavItem
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="لوحة التحكم"
              active={state.activeTab === "dashboard"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "dashboard" });
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<FolderOpen className="w-4 h-4" />}
              label="المشاريع (Projects)"
              active={
                state.activeTab === "projects" ||
                state.activeTab === "project-workspace"
              }
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "projects" });
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<MessageSquare className="w-4 h-4" />}
              label="المساعد الذكي (AI Chat)"
              active={state.activeTab === "chat"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "chat" });
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<ImageIcon className="w-4 h-4" />}
              label="مولد الصور (AI Images)"
              active={state.activeTab === "images"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "images" });
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<Video className="w-4 h-4" />}
              label="مولد الفيديو (AI Video)"
              active={state.activeTab === "video"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "video" });
                setMobileMenuOpen(false);
              }}
            />
          </div>

          <div className="space-y-1 pt-4 border-t border-[#1F2438]/60">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
              أدوات الهوية والمحتوى
            </p>
            <NavItem
              icon={<Palette className="w-4 h-4" />}
              label="مدير الهوية (Brand Kit)"
              active={state.activeTab === "brand-kit"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "brand-kit" });
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<Layers3 className="w-4 h-4" />}
              label="مكتبة القوالب (Templates)"
              active={state.activeTab === "templates"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "templates" });
                setMobileMenuOpen(false);
              }}
            />
          </div>

          <div className="space-y-1 pt-4 border-t border-[#1F2438]/60">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
              الحساب والدفع
            </p>
            <NavItem
              icon={<Wallet className="w-4 h-4" />}
              label="المحفظة والاستهلاك"
              active={state.activeTab === "billing"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "billing" });
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<CreditCard className="w-4 h-4" />}
              label="خطط الأسعار (Ezone Pay)"
              active={state.activeTab === "pricing"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "pricing" });
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<Settings className="w-4 h-4" />}
              label="الإعدادات"
              active={state.activeTab === "settings"}
              onClick={() => {
                dispatch({ type: "SET_TAB", payload: "settings" });
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8 min-h-[calc(100vh-4rem)]">
        {state.activeTab === "dashboard" && (
          <UserDashboardView state={state} dispatch={dispatch} />
        )}
        {state.activeTab === "projects" && (
          <UserProjectsView state={state} dispatch={dispatch} />
        )}
        {state.activeTab === "project-workspace" && (
          <ProjectWorkspaceView
            state={state}
            dispatch={dispatch}
            showToast={showToast}
          />
        )}
        {state.activeTab === "chat" && (
          <UserChatView
            state={state}
            dispatch={dispatch}
            showToast={showToast}
          />
        )}
        {state.activeTab === "images" && (
          <UserImageView
            state={state}
            dispatch={dispatch}
            showToast={showToast}
          />
        )}
        {state.activeTab === "video" && (
          <UserVideoView
            state={state}
            dispatch={dispatch}
            showToast={showToast}
          />
        )}
        {state.activeTab === "brand-kit" && (
          <BrandKitManagerView
            state={state}
            dispatch={dispatch}
            showToast={showToast}
          />
        )}
        {state.activeTab === "templates" && (
          <TemplatesLibraryView
            state={state}
            dispatch={dispatch}
            showToast={showToast}
          />
        )}
        {state.activeTab === "billing" && (
          <UserBillingView state={state} dispatch={dispatch} />
        )}
        {state.activeTab === "pricing" && (
          <UserPricingView state={state} dispatch={dispatch} />
        )}
        {state.activeTab === "settings" && (
          <UserSettingsView
            state={state}
            dispatch={dispatch}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${active ? "text-white bg-[#FF2E4C]/15 border border-[#FF2E4C]/30 font-bold" : "text-gray-400 hover:text-white hover:bg-[#121520]"}`}
    >
      <span className={active ? "text-[#FF2E4C]" : ""}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MetricCard({ label, value, subtitle, icon }) {
  return (
    <div className="p-4 bg-[#121520] border border-[#1F2438] rounded-2xl flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
        <div className="text-xl font-bold text-white">{value}</div>
        {subtitle && (
          <div className="text-[10px] text-gray-500 mt-0.5">{subtitle}</div>
        )}
      </div>
      <div className="p-3 bg-[#0D0F17] rounded-xl border border-[#1F2438]">
        {icon}
      </div>
    </div>
  );
}

function UserDashboardView({ state, dispatch }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            مرحباً بك في Brand Box AI 👋
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            منصة الذكاء الاصطناعي الشاملة لإدارة المحتوى والمشاريع التسويقية
            باللغة العربية.
          </p>
        </div>
        <button
          onClick={() =>
            dispatch({ type: "SET_CREATE_PROJECT_MODAL", payload: true })
          }
          className="bg-[#FF2E4C] hover:bg-[#E50914] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF2E4C]/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>مشروع جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="المشاريع النشطة"
          value={state.projects.length}
          subtitle="مشاريع تسويقية"
          icon={<FolderOpen className="w-5 h-5 text-[#FF2E4C]" />}
        />
        <MetricCard
          label="الرصيد المتاح"
          value={`${state.auth.user.creditBalance ?? state.credits.balance} نقطة`}
          subtitle="جاهزة للتوليد"
          icon={<Coins className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          label="الأصول المنسقة"
          value={state.assets.length}
          subtitle="ملفات بصرية"
          icon={<ImageIcon className="w-5 h-5 text-blue-400" />}
        />
      </div>

      {/* Quick Shortcuts */}
      <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>اختصارات التوليد السريع</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => dispatch({ type: "SET_TAB", payload: "chat" })}
            className="p-4 bg-[#0D0F17] border border-[#1F2438] hover:border-[#FF2E4C]/50 rounded-xl text-right transition group"
          >
            <MessageSquare className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition" />
            <div className="font-bold text-xs text-white">
              المساعد الذكي (AI Chat)
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              صياغة نصوص إعلانية وتحليلات سريعة
            </p>
          </button>
          <button
            onClick={() => dispatch({ type: "SET_TAB", payload: "images" })}
            className="p-4 bg-[#0D0F17] border border-[#1F2438] hover:border-[#FF2E4C]/50 rounded-xl text-right transition group"
          >
            <ImageIcon className="w-5 h-5 text-[#FF2E4C] mb-2 group-hover:scale-110 transition" />
            <div className="font-bold text-xs text-white">
              توليد الصور (Imagen 4.0)
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              إنشاء تصاميم بصرية بدقة فائقة
            </p>
          </button>
          <button
            onClick={() => dispatch({ type: "SET_TAB", payload: "brand-kit" })}
            className="p-4 bg-[#0D0F17] border border-[#1F2438] hover:border-[#FF2E4C]/50 rounded-xl text-right transition group"
          >
            <Palette className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition" />
            <div className="font-bold text-xs text-white">
              إدارة الهوية البصرية
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              ضبط ألوان ونبرة العلامة التجارية
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

function UserProjectsView({ state, dispatch }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">المشاريع التسويقية</h2>
          <p className="text-xs text-gray-400">
            إدارة ومتابعة سياق الهويات التجارية وحملاتها.
          </p>
        </div>
        <button
          onClick={() =>
            dispatch({ type: "SET_CREATE_PROJECT_MODAL", payload: true })
          }
          className="bg-[#FF2E4C] hover:bg-[#E50914] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>مشروع جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.projects.map((p) => (
          <div
            key={p.id}
            onClick={() =>
              dispatch({ type: "SET_ACTIVE_PROJECT", payload: p.id })
            }
            className="p-5 bg-[#121520] border border-[#1F2438] hover:border-[#FF2E4C]/50 rounded-2xl cursor-pointer transition space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                {p.industry}
              </span>
              <span className="text-[10px] text-gray-500">{p.timeAgo}</span>
            </div>
            <h3 className="font-bold text-white text-sm group-hover:text-[#FF2E4C] transition">
              {p.name}
            </h3>
            <p className="text-xs text-gray-400 line-clamp-2">
              {p.description}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-[#1F2438] text-xs">
              <span className="text-gray-400">
                الجمهور:{" "}
                <strong className="text-gray-200">{p.targetAudience}</strong>
              </span>
              <span className="text-[#FF2E4C] font-bold flex items-center gap-1">
                دخول مساحة العمل <ArrowLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArrowLeft(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function ProjectWorkspaceView({ state, dispatch, showToast }) {
  const activeProj =
    state.projects.find((p) => p.id === state.activeProjectId) ||
    state.projects[0];
  const activeTab = state.projectWorkspaceTab || "overview";

  const workspaceTabs = [
    {
      id: "overview",
      label: "نظرة عامة",
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: "chat",
      label: "المساعد الذكي",
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: "image",
      label: "مولد الصور",
      icon: <ImageIcon className="w-4 h-4" />,
    },
    { id: "video", label: "مولد الفيديو", icon: <Video className="w-4 h-4" /> },
    {
      id: "assets",
      label: "الأصول (Assets)",
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: "history",
      label: "سجل التوليد",
      icon: <History className="w-4 h-4" />,
    },
    {
      id: "templates",
      label: "القوالب المتاحة",
      icon: <Layers3 className="w-4 h-4" />,
    },
    {
      id: "brand-kit",
      label: "هوية المشروع",
      icon: <Palette className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => dispatch({ type: "SET_TAB", payload: "projects" })}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>المشاريع</span>
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-xs font-bold text-[#FF2E4C]">
              {activeProj.name}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-white">
            {activeProj.name}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeProj.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#0D0F17] border border-[#1F2438] text-gray-300 px-3 py-1.5 rounded-xl font-bold">
            النبرة: {activeProj.tone}
          </span>
          <span className="text-xs bg-[#0D0F17] border border-[#1F2438] text-amber-400 px-3 py-1.5 rounded-xl font-bold">
            المجال: {activeProj.industry}
          </span>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-[#1F2438] overflow-x-auto pb-2">
        {workspaceTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              dispatch({ type: "SET_PROJECT_WORKSPACE_TAB", payload: tab.id })
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === tab.id
                ? "bg-[#FF2E4C] text-white shadow-lg shadow-[#FF2E4C]/20"
                : "text-gray-400 hover:text-white hover:bg-[#121520]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-Tab Content Rendering */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-[#FF2E4C]" /> إعدادات الهوية وسياق
              التوليد
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#1F2438]">
                <span className="text-gray-400">اسم العلامة:</span>
                <span className="font-bold text-white">
                  {state.brandKit.brandName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1F2438]">
                <span className="text-gray-400">الجمهور المستهدف:</span>
                <span className="font-bold text-white">
                  {activeProj.targetAudience}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1F2438]">
                <span className="text-gray-400">اللغة الرسمية:</span>
                <span className="font-bold text-white">
                  {activeProj.language}
                </span>
              </div>
            </div>
          </div>
          <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> أصول المشروع
            </h3>
            <p className="text-xs text-gray-400">
              إجمالي الأصول المخصصة لهذا المشروع:{" "}
              {state.assets.filter((a) => a.projectId === activeProj.id).length}
            </p>
          </div>
        </div>
      )}

      {activeTab === "chat" && (
        <UserChatView state={state} dispatch={dispatch} showToast={showToast} />
      )}
      {activeTab === "image" && (
        <UserImageView
          state={state}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {activeTab === "video" && (
        <UserVideoView
          state={state}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {activeTab === "assets" && (
        <UserAssetsView state={state} activeProjectId={activeProj.id} />
      )}
      {activeTab === "history" && (
        <UserHistoryView state={state} activeProjectId={activeProj.id} />
      )}
      {activeTab === "templates" && (
        <TemplatesLibraryView
          state={state}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
      {activeTab === "brand-kit" && (
        <BrandKitManagerView
          state={state}
          dispatch={dispatch}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function UserChatView({ state, dispatch, showToast }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "أهلاً بك! أنا المساعد الذكي المخصص لـ Brand Box AI. كيف يمكنني مساعدتك اليوم؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `[تم التوليد بنجاح عبر نموذج ${selectedModel}]: بناءً على طلبك، يمكننا صياغة العرض الترويجي التالي بطريقة عصرية جذابة تحاكي التطلعات.`,
        },
      ]);
      showToast("تم التوليد واستهلاك النقاط بنجاح!", "success");
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#FF2E4C]" /> المحادثة والمساعد
          الذكي
        </h2>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-[#0D0F17] border border-[#1F2438] text-white text-xs p-2 rounded-xl focus:outline-none cursor-pointer"
        >
          {state.modelRegistry.chat.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.creditCost} نقاط)
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-4 h-80 overflow-y-auto space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-xl p-3.5 rounded-2xl text-xs ${msg.role === "user" ? "bg-[#FF2E4C] text-white" : "bg-[#0D0F17] border border-[#1F2438] text-gray-200"}`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="اكتب استفسارك أو طلبك التسويقي..."
          className="flex-1 bg-[#121520] border border-[#1F2438] text-white text-xs rounded-xl p-3 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs px-6 rounded-xl flex items-center gap-2 transition"
        >
          <Send className="w-4 h-4" />
          <span>إرسال</span>
        </button>
      </div>
    </div>
  );
}

function UserImageView({ state, dispatch, showToast }) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("imagen-4.0-generate-001");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#FF2E4C]" /> مولد الصور العالي
            الدقة (AI Images)
          </h2>
          <p className="text-xs text-gray-400">
            توليد تصاميم بصرية سينمائية للمشروع عبر أفضل النماذج العالمية.
          </p>
        </div>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-[#121520] border border-[#1F2438] text-white text-xs p-2.5 rounded-xl cursor-pointer"
        >
          {state.modelRegistry.image.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.creditCost} نقاط)
            </option>
          ))}
        </select>
      </div>

      <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="صف الصورة المراد توليدها بدقة باللغة العربية أو الإنجليزية..."
          className="w-full bg-[#0D0F17] border border-[#1F2438] text-white text-xs rounded-xl p-3 focus:outline-none"
          rows={3}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">أبعاد الصورة:</span>
            <span className="text-xs bg-[#0D0F17] border border-[#1F2438] px-2.5 py-1 rounded-lg text-white font-mono">
              1:1 Square
            </span>
          </div>

          <button
            onClick={() => {
              if (!prompt)
                return showToast("يرجى كتابة وصف الصورة أولاً", "error");
              showToast("جاري التوليد واستهلاك النقاط...", "success");
            }}
            className="bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF2E4C]/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>توليد الصورة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function UserVideoView({ state, dispatch, showToast }) {
  const videoModel = UNIFIED_MODEL_REGISTRY.video[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Video className="w-4 h-4 text-[#FF2E4C]" /> مولد الفيديو الذكي (AI
          Video Generator)
        </h2>
        <p className="text-xs text-gray-400">
          بنية معالجة مقاطع الفيديو المتزامنة وغير المتزامنة (Runway Gen-3
          Alpha).
        </p>
      </div>

      {/* Provider Status Alert */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="font-bold text-amber-300">
              حالة النموذج: {videoModel.displayName} (مرحلة التجهيز Staging)
            </div>
            <p className="text-gray-400">
              المزود غير متاح حالياً للتوليد المباشر الحقيقي (
              {videoModel.status}).
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 font-bold rounded-lg border border-amber-500/30">
          غير مفعل
        </span>
      </div>

      <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4 opacity-75">
        <textarea
          disabled
          placeholder="أدخل الوصف الزمني والمشهدي لمقطع الفيديو..."
          className="w-full bg-[#0D0F17] border border-[#1F2438] text-gray-500 text-xs rounded-xl p-3 focus:outline-none cursor-not-allowed"
          rows={3}
        />

        <button
          disabled
          onClick={() =>
            showToast("النموذج غير مهيأ في الإنتاج حالياً", "error")
          }
          className="bg-gray-800 text-gray-500 font-bold text-xs px-6 py-2.5 rounded-xl cursor-not-allowed"
        >
          توليد الفيديو (15 نقطة - غير متاح)
        </button>
      </div>
    </div>
  );
}

function BrandKitManagerView({ state, dispatch, showToast }) {
  const [brand, setBrand] = useState(state.brandKit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#FF2E4C]" /> مدير الهوية البصرية
            (Brand Kit)
          </h2>
          <p className="text-xs text-gray-400">
            حفظ وحقن ألوان ونبرة العلامة التجارية في جميع توليدات الذكاء
            الاصطناعي.
          </p>
        </div>
        <button
          onClick={() => {
            dispatch({ type: "UPDATE_BRAND_KIT", payload: brand });
            showToast("تم حفظ إعدادات الهوية البصرية بنجاح!", "success");
          }}
          className="bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs px-5 py-2 rounded-xl transition"
        >
          حفظ التغييرات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4 text-xs">
          <div>
            <label className="block text-gray-400 font-bold mb-1">
              اسم العلامة التجارية:
            </label>
            <input
              type="text"
              value={brand.brandName}
              onChange={(e) =>
                setBrand({ ...brand, brandName: e.target.value })
              }
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">
              الشعار اللفظي (Tagline):
            </label>
            <input
              type="text"
              value={brand.tagline}
              onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">
              وصف العلامة والنشاط:
            </label>
            <textarea
              value={brand.description}
              onChange={(e) =>
                setBrand({ ...brand, description: e.target.value })
              }
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
              rows={3}
            />
          </div>
        </div>

        <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4 text-xs">
          <h3 className="font-bold text-white text-sm">لوحة الألوان والنبرة</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-400 mb-1">الرئيسي:</label>
              <input
                type="color"
                value={brand.primaryColor}
                onChange={(e) =>
                  setBrand({ ...brand, primaryColor: e.target.value })
                }
                className="w-full h-10 rounded-lg cursor-pointer bg-transparent"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">الثانوي:</label>
              <input
                type="color"
                value={brand.secondaryColor}
                onChange={(e) =>
                  setBrand({ ...brand, secondaryColor: e.target.value })
                }
                className="w-full h-10 rounded-lg cursor-pointer bg-transparent"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">التمييز:</label>
              <input
                type="color"
                value={brand.accentColor}
                onChange={(e) =>
                  setBrand({ ...brand, accentColor: e.target.value })
                }
                className="w-full h-10 rounded-lg cursor-pointer bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">
              نبرة الخطاب (Tone of Voice):
            </label>
            <input
              type="text"
              value={brand.toneOfVoice}
              onChange={(e) =>
                setBrand({ ...brand, toneOfVoice: e.target.value })
              }
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatesLibraryView({ state, dispatch, showToast }) {
  const [search, setSearch] = useState("");

  const filtered = TEMPLATES_DATABASE.filter(
    (t) => t.title.includes(search) || t.industry.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers3 className="w-5 h-5 text-[#FF2E4C]" /> مكتبة القوالب
            التسويقية (Templates)
          </h2>
          <p className="text-xs text-gray-400">
            قوالب جاهزة قابلة للتنسيق والاستخدام المباشر في مشاريعك.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="البحث في القوالب..."
          className="bg-[#121520] border border-[#1F2438] text-white text-xs rounded-xl px-3 py-2 focus:outline-none w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="p-4 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <img
                src={tpl.thumbnail}
                alt="Template"
                className="w-full h-36 object-cover rounded-xl border border-[#1F2438]"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] bg-[#FF2E4C]/20 text-[#FF2E4C] px-2 py-0.5 rounded font-bold">
                  {tpl.category}
                </span>
                <span className="text-[10px] text-gray-400">{tpl.badge}</span>
              </div>
              <h3 className="font-bold text-white text-xs">{tpl.title}</h3>
              <p className="text-[11px] text-gray-400">{tpl.description}</p>
            </div>
            <button
              onClick={() => {
                dispatch({
                  type: "CREATE_PROJECT",
                  payload: {
                    name: tpl.title,
                    type: "صورة + نص",
                    industry: tpl.industry,
                  },
                });
                showToast(
                  `تم فتح مشروع جديد بناءً على قالب: ${tpl.title}`,
                  "success",
                );
              }}
              className="w-full bg-[#1F2438] hover:bg-gray-700 text-white font-bold text-xs py-2 rounded-xl transition"
            >
              استخدام القالب في مشروع
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserAssetsView({ state, activeProjectId }) {
  const assets = state.assets.filter(
    (a) => !activeProjectId || a.projectId === activeProjectId,
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white">أصول الوسائط والملفات</h3>
      {assets.length === 0 ? (
        <p className="text-xs text-gray-500">
          لا توجد أصول محفوظة بهذا المشروع
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assets.map((a) => (
            <div
              key={a.id}
              className="p-3 bg-[#121520] border border-[#1F2438] rounded-xl space-y-2"
            >
              <img
                src={a.filePath}
                alt="Asset"
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="text-xs font-bold text-white truncate">
                {a.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserHistoryView({ state, activeProjectId }) {
  const gens = state.generations.filter(
    (g) => !activeProjectId || g.projectId === activeProjectId,
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white">سجل العمليات والتوليد</h3>
      {gens.map((g) => (
        <div
          key={g.id}
          className="p-3 bg-[#121520] border border-[#1F2438] rounded-xl text-xs flex justify-between items-center"
        >
          <span className="text-gray-200 truncate max-w-md">{g.prompt}</span>
          <span className="font-bold text-[#FF2E4C]">{g.creditsUsed} نقاط</span>
        </div>
      ))}
    </div>
  );
}

function UserBillingView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">المحفظة وسجل الاستهلاك</h2>
        <p className="text-xs text-gray-400">
          الرصيد المتاح:{" "}
          <span className="font-bold text-[#FF2E4C]">
            {state.auth.user.creditBalance ?? state.credits.balance} نقطة
          </span>{" "}
          • طريقة التجديد: محرك Ezone Pay (Server-to-Server Webhook Engine)
        </p>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#1F2438] font-bold text-xs text-white">
          سجل معاملات النقاط الأخيرة
        </div>
        <div className="divide-y divide-[#1F2438]">
          {state.credits.transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 flex justify-between items-center text-xs"
            >
              <div>
                <div className="font-bold text-white">{tx.description}</div>
                <div className="text-[10px] text-gray-500">
                  {new Date(tx.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>
              <span
                className={`font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} نقطة
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserPricingView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          خطط الأسعار واشتراكات Ezone Pay
        </h2>
        <p className="text-xs text-gray-400">
          اختر الخطة المناسبة لحجم نشاطك التجاري.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {state.plansList.map((plan) => (
          <div
            key={plan.id}
            className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                {plan.badge}
              </span>
              <h3 className="font-bold text-white text-sm">{plan.name}</h3>
              <div className="text-2xl font-black text-[#FF2E4C]">
                {plan.priceMonthlyLYD} د.ل{" "}
                <span className="text-xs text-gray-400 font-normal">
                  / شهرياً
                </span>
              </div>
              <p className="text-xs text-gray-400">{plan.description}</p>
            </div>
            <button className="w-full bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs py-2.5 rounded-xl transition">
              اختيار الخطة عبر Ezone Pay
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserSettingsView({ state, showToast }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          إعدادات الحساب والتفضيلات
        </h2>
        <p className="text-xs text-gray-400">
          إدارة معلومات الملف الشخصي والتنبيهات.
        </p>
      </div>

      <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4 max-w-xl text-xs">
        <div>
          <label className="block text-gray-400 font-bold mb-1">
            البريد الإلكتروني:
          </label>
          <input
            type="text"
            disabled
            value={state.auth.user.email}
            className="w-full bg-[#0D0F17] border border-[#1F2438] text-gray-400 p-2.5 rounded-xl cursor-not-allowed font-mono"
          />
        </div>

        <div>
          <label className="block text-gray-400 font-bold mb-1">
            اللغة المفضلة:
          </label>
          <select className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl">
            <option>العربية (RTL)</option>
          </select>
        </div>

        <button
          onClick={() =>
            showToast("تم تحديث التفضيلات الشخصية بنجاح!", "success")
          }
          className="bg-[#FF2E4C] text-white font-bold px-5 py-2.5 rounded-xl transition"
        >
          حفظ التفضيلات
        </button>
      </div>
    </div>
  );
}

function CreateProjectModal({ dispatch, showToast }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("الأغذية والمشروبات");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-md space-y-4 relative">
        <button
          onClick={() =>
            dispatch({ type: "SET_CREATE_PROJECT_MODAL", payload: false })
          }
          className="absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#FF2E4C]" /> إنشاء مشروع تسويقي جديد
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-400 font-bold mb-1">
              اسم المشروع:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حملة المتجر الإلكتروني..."
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">
              المجال / القطاع:
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
            >
              <option value="الأغذية والمشروبات">الأغذية والمشروبات</option>
              <option value="العقارات">العقارات</option>
              <option value="التجارة الإلكترونية">التجارة الإلكترونية</option>
              <option value="التعليم">التعليم</option>
              <option value="الخدمات والتقنية">الخدمات والتقنية</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">
              وصف موجز للهدف:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضيح تفاصيل الهدف والتطلعات..."
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
              rows={3}
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (!name)
              return showToast("يرجى إدخال اسم المشروع أولاً", "error");
            dispatch({
              type: "CREATE_PROJECT",
              payload: { name, industry, description },
            });
            showToast(
              "تم إنشاء المشروع والدخول لمساحة العمل بنجاح!",
              "success",
            );
          }}
          className="w-full bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs py-3 rounded-xl transition"
        >
          إنشاء وفتح مساحة العمل
        </button>
      </div>
    </div>
  );
}

function AdminShellLayout({
  state,
  dispatch,
  showToast,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const role = state.auth.user?.adminRole || "USER";

  const navGroups = [
    {
      title: "OVERVIEW",
      items: [
        {
          path: "/admin",
          label: "لوحة التحكم (Dashboard)",
          perm: "ANALYTICS_READ",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        {
          path: "/admin/users",
          label: "المستخدمين",
          perm: "USERS_READ",
          icon: <Users className="w-4 h-4" />,
        },
        {
          path: "/admin/projects",
          label: "المشاريع",
          perm: "PROJECTS_READ",
          icon: <FolderOpen className="w-4 h-4" />,
        },
        {
          path: "/admin/subscriptions",
          label: "الاشتراكات",
          perm: "SUBSCRIPTIONS_READ",
          icon: <Award className="w-4 h-4" />,
        },
        {
          path: "/admin/payments",
          label: "المدفوعات (Ezone)",
          perm: "PAYMENTS_READ",
          icon: <CreditCard className="w-4 h-4" />,
        },
        {
          path: "/admin/credits",
          label: "سجل النقاط والتسويات",
          perm: "CREDITS_READ",
          icon: <Coins className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "COMMERCE",
      items: [
        {
          path: "/admin/plans",
          label: "خطط الاشتراكات",
          perm: "PLANS_READ",
          icon: <SlidersHorizontal className="w-4 h-4" />,
        },
        {
          path: "/admin/packages",
          label: "حزم النقاط",
          perm: "PACKAGES_READ",
          icon: <Tag className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "AI OPERATIONS",
      items: [
        {
          path: "/admin/providers",
          label: "مزودو الذكاء",
          perm: "PROVIDERS_READ",
          icon: <Server className="w-4 h-4" />,
        },
        {
          path: "/admin/models",
          label: "النماذج والأسعار",
          perm: "MODELS_READ",
          icon: <Cpu className="w-4 h-4" />,
        },
        {
          path: "/admin/generations",
          label: "توليدات AI",
          perm: "GENERATIONS_READ",
          icon: <Sparkles className="w-4 h-4" />,
        },
        {
          path: "/admin/assets",
          label: "أصول المنصة",
          perm: "ASSETS_READ",
          icon: <ImageIcon className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "OBSERVABILITY",
      items: [
        {
          path: "/admin/audit-logs",
          label: "سجل المراجعة (Audit)",
          perm: "AUDIT_LOGS_READ",
          icon: <History className="w-4 h-4" />,
        },
        {
          path: "/admin/errors",
          label: "أخطاء النظام",
          perm: "ERRORS_READ",
          icon: <AlertTriangle className="w-4 h-4" />,
        },
        {
          path: "/admin/analytics",
          label: "التحليلات والمؤشرات",
          perm: "ANALYTICS_READ",
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        {
          path: "/admin/settings",
          label: "إعدادات المنصة",
          perm: "SETTINGS_READ",
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside
        className={`w-64 bg-[#0D0F17] border-l border-[#1F2438] flex flex-col justify-between fixed lg:static inset-y-0 right-0 z-30 transform ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out shrink-0`}
      >
        <div className="p-4 space-y-5 overflow-y-auto">
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
            <div className="text-[11px] font-bold text-amber-300">
              لوحة الإدارة
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              الدور الحالي:{" "}
              <span className="font-mono text-white font-bold">{role}</span>
            </div>
          </div>

          {navGroups.map((group, idx) => {
            const permittedItems = group.items.filter((item) =>
              checkHasPermission(role, item.perm),
            );
            if (permittedItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider px-3 mb-1">
                  {group.title}
                </p>
                {permittedItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      dispatch({ type: "SET_ADMIN_ROUTE", payload: item.path });
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                      state.adminRoute === item.path
                        ? "text-white bg-[#FF2E4C] shadow-lg"
                        : "text-gray-400 hover:text-white hover:bg-[#121520]"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[#090A0F]">
        {state.adminAlerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {state.adminAlerts.map((alt) => (
              <div
                key={alt.id}
                className="p-3 bg-[#121520] border border-amber-500/30 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-bold text-white ml-2">
                      {alt.title}:
                    </span>
                    <span className="text-gray-300">{alt.description}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500">
                  {alt.createdAt}
                </span>
              </div>
            ))}
          </div>
        )}

        <AdminRouteContent
          state={state}
          dispatch={dispatch}
          showToast={showToast}
        />
      </main>
    </div>
  );
}

function AdminRouteContent({ state, dispatch, showToast }) {
  const role = state.auth.user?.adminRole || "USER";
  const route = state.adminRoute;

  if (route === "/admin") {
    if (!checkHasPermission(role, "ANALYTICS_READ"))
      return <AdminForbiddenState permission="ANALYTICS_READ" role={role} />;
    return <AdminDashboardView state={state} dispatch={dispatch} />;
  }

  if (route === "/admin/users") {
    if (!checkHasPermission(role, "USERS_READ"))
      return <AdminForbiddenState permission="USERS_READ" role={role} />;
    return (
      <AdminUsersView state={state} dispatch={dispatch} showToast={showToast} />
    );
  }

  if (route === "/admin/projects") {
    if (!checkHasPermission(role, "PROJECTS_READ"))
      return <AdminForbiddenState permission="PROJECTS_READ" role={role} />;
    return <AdminProjectsView state={state} />;
  }

  if (route === "/admin/subscriptions") {
    if (!checkHasPermission(role, "SUBSCRIPTIONS_READ"))
      return (
        <AdminForbiddenState permission="SUBSCRIPTIONS_READ" role={role} />
      );
    return (
      <AdminSubscriptionsView
        state={state}
        dispatch={dispatch}
        showToast={showToast}
      />
    );
  }

  if (route === "/admin/payments") {
    if (!checkHasPermission(role, "PAYMENTS_READ"))
      return <AdminForbiddenState permission="PAYMENTS_READ" role={role} />;
    return <AdminPaymentsView state={state} />;
  }

  if (route === "/admin/credits") {
    if (!checkHasPermission(role, "CREDITS_READ"))
      return <AdminForbiddenState permission="CREDITS_READ" role={role} />;
    return <AdminCreditsView state={state} dispatch={dispatch} />;
  }

  if (route === "/admin/plans") {
    if (!checkHasPermission(role, "PLANS_READ"))
      return <AdminForbiddenState permission="PLANS_READ" role={role} />;
    return (
      <AdminPlansView state={state} dispatch={dispatch} showToast={showToast} />
    );
  }

  if (route === "/admin/packages") {
    if (!checkHasPermission(role, "PACKAGES_READ"))
      return <AdminForbiddenState permission="PACKAGES_READ" role={role} />;
    return (
      <AdminPackagesView
        state={state}
        dispatch={dispatch}
        showToast={showToast}
      />
    );
  }

  if (route === "/admin/providers") {
    if (!checkHasPermission(role, "PROVIDERS_READ"))
      return <AdminForbiddenState permission="PROVIDERS_READ" role={role} />;
    return <AdminProvidersView state={state} />;
  }

  if (route === "/admin/models") {
    if (!checkHasPermission(role, "MODELS_READ"))
      return <AdminForbiddenState permission="MODELS_READ" role={role} />;
    return <AdminModelsView state={state} dispatch={dispatch} />;
  }

  if (route === "/admin/generations") {
    if (!checkHasPermission(role, "GENERATIONS_READ"))
      return <AdminForbiddenState permission="GENERATIONS_READ" role={role} />;
    return <AdminGenerationsView state={state} />;
  }

  if (route === "/admin/assets") {
    if (!checkHasPermission(role, "ASSETS_READ"))
      return <AdminForbiddenState permission="ASSETS_READ" role={role} />;
    return <AdminAssetsView state={state} />;
  }

  if (route === "/admin/audit-logs") {
    if (!checkHasPermission(role, "AUDIT_LOGS_READ"))
      return <AdminForbiddenState permission="AUDIT_LOGS_READ" role={role} />;
    return <AdminAuditLogsView state={state} />;
  }

  if (route === "/admin/errors") {
    if (!checkHasPermission(role, "ERRORS_READ"))
      return <AdminForbiddenState permission="ERRORS_READ" role={role} />;
    return <AdminSystemErrorsView state={state} />;
  }

  if (route === "/admin/analytics") {
    if (!checkHasPermission(role, "ANALYTICS_READ"))
      return <AdminForbiddenState permission="ANALYTICS_READ" role={role} />;
    return <AdminAnalyticsView state={state} />;
  }

  if (route === "/admin/settings") {
    if (!checkHasPermission(role, "SETTINGS_READ"))
      return <AdminForbiddenState permission="SETTINGS_READ" role={role} />;
    return <AdminSettingsView state={state} />;
  }

  return <AdminDashboardView state={state} dispatch={dispatch} />;
}

function AdminForbiddenState({ permission, role }) {
  return (
    <div className="p-8 text-center bg-[#121520] border border-red-500/30 rounded-2xl space-y-3">
      <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
      <h3 className="text-base font-bold text-white">
        وصول مرفوض (FORBIDDEN 403)
      </h3>
      <p className="text-xs text-gray-400">
        الدور الإداري الحصري{" "}
        <span className="font-mono text-amber-400">{role}</span> لا يمتلك
        الصلاحية المطلوبة{" "}
        <span className="font-mono text-red-400">{permission}</span> لدخول هذا
        المسار.
      </p>
    </div>
  );
}

function AdminDashboardView({ state, dispatch }) {
  const activeSubs = state.subscriptionsList.filter(
    (s) => s.status === "active",
  ).length;
  const totalRevenueLYD = state.paymentsList
    .filter((p) => p.status === "paid")
    .reduce((acc, curr) => acc + curr.amountLYD, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          لوحة المراقبة والإدارة العامة
        </h2>
        <p className="text-xs text-gray-400">
          مؤشرات الأداء الفعلية المستخرجة مباشرة من قواعد البيانات.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="إجمالي المستخدمين"
          value={state.usersList.length}
          subtitle="حسابات نشطة"
          icon={<Users className="w-5 h-5 text-[#FF2E4C]" />}
        />
        <MetricCard
          label="الاشتراكات النشطة"
          value={activeSubs}
          subtitle="باقات تجارية"
          icon={<Award className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          label="إجمالي الإيرادات (LYD)"
          value={`${totalRevenueLYD} د.ل`}
          subtitle="محرك Ezone Pay"
          icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          label="توليدات AI المكتملة"
          value={state.generations.length}
          subtitle="طلبات الذكاء"
          icon={<Sparkles className="w-5 h-5 text-purple-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-[#FF2E4C]" /> حالة مزودي الذكاء
            الاصطناعي
          </h3>
          <div className="space-y-2">
            {state.providersList.map((prov) => (
              <div
                key={prov.id}
                className="p-3 bg-[#0D0F17] border border-[#1F2438] rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{prov.name}</div>
                  <div className="text-[10px] text-gray-400">
                    الاستجابة: {prov.latencyMs}ms
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    prov.status === "healthy"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : prov.status === "degraded"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {prov.status === "healthy"
                    ? "جاهز (Healthy)"
                    : prov.status === "degraded"
                      ? "استجابة بطيئة"
                      : "غير مهيأ"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" /> آخر السجلات الإدارية
            (Audit)
          </h3>
          <div className="space-y-2">
            {state.auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-3 bg-[#0D0F17] border border-[#1F2438] rounded-xl text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-[#FF2E4C] ml-2">
                    {log.action}
                  </span>
                  <span className="text-gray-400">بواسطة {log.actorEmail}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString("ar-EG")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsersView({ state, dispatch, showToast }) {
  const [search, setSearch] = useState("");
  const role = state.auth.user?.adminRole || "USER";
  const canManage = checkHasPermission(role, "USERS_MANAGE");

  const filteredUsers = state.usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">إدارة مستخدمي المنصة</h2>
          <p className="text-xs text-gray-400">
            البحث، العرض، وإيقاف/تفعيل حسابات المستخدمين.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute top-2.5 right-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث بالاسم أو البريد..."
            className="bg-[#121520] border border-[#1F2438] text-white text-xs rounded-xl pr-9 pl-3 py-2 focus:outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">الدور الإداري</th>
                <th className="p-3.5">الخطة</th>
                <th className="p-3.5">رصيد النقاط</th>
                <th className="p-3.5">حالة الحساب</th>
                <th className="p-3.5">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 flex items-center gap-3">
                    <img
                      src={u.avatarUrl}
                      alt="User"
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-bold text-white">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {u.email}
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-bold font-mono text-emerald-400">
                    {u.adminRole}
                  </td>
                  <td className="p-3.5 font-bold text-amber-400">
                    {u.planId.toUpperCase()}
                  </td>
                  <td className="p-3.5 font-bold text-white">
                    {u.creditBalance} نقطة
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${u.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}
                    >
                      {u.status === "active" ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="p-3.5 flex items-center gap-2">
                    <button
                      onClick={() =>
                        dispatch({
                          type: "SET_SELECTED_USER_MODAL",
                          payload: u,
                        })
                      }
                      className="px-2.5 py-1 bg-[#1F2438] hover:bg-gray-700 text-white font-bold rounded-lg transition text-[11px]"
                    >
                      تفاصيل
                    </button>
                    {canManage && u.status === "active" && (
                      <button
                        onClick={() => {
                          dispatch({
                            type: "ADMIN_SUSPEND_USER",
                            payload: {
                              targetUserId: u.id,
                              reason: "إيقاف إداري",
                            },
                          });
                          showToast(`تم إيقاف حساب ${u.email}`, "error");
                        }}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold rounded-lg transition text-[11px]"
                      >
                        إيقاف
                      </button>
                    )}
                    {canManage && u.status === "suspended" && (
                      <button
                        onClick={() => {
                          dispatch({
                            type: "ADMIN_REACTIVATE_USER",
                            payload: { targetUserId: u.id },
                          });
                          showToast(`تم إعادة تفعيل ${u.email}`, "success");
                        }}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-lg transition text-[11px]"
                      >
                        تفعيل
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserDetailModal({ user, state, dispatch, showToast }) {
  if (!user) return null;

  const userProjects = state.projects.filter((p) => p.ownerId === user.id);
  const userGenerations = state.generations.filter((g) => g.userId === user.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-lg space-y-4 relative">
        <button
          onClick={() =>
            dispatch({ type: "SET_SELECTED_USER_MODAL", payload: null })
          }
          className="absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 border-b border-[#1F2438] pb-4">
          <img
            src={user.avatarUrl}
            alt="Avatar"
            className="w-12 h-12 rounded-xl object-cover border border-[#FF2E4C]"
          />
          <div>
            <h3 className="text-base font-extrabold text-white">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              {user.email} • ID: {user.id}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#0D0F17] border border-[#1F2438] rounded-xl">
            <span className="text-gray-400">الدور الإداري:</span>
            <div className="font-bold text-emerald-400 mt-1">
              {user.adminRole}
            </div>
          </div>
          <div className="p-3 bg-[#0D0F17] border border-[#1F2438] rounded-xl">
            <span className="text-gray-400">رصيد النقاط:</span>
            <div className="font-bold text-amber-400 mt-1">
              {user.creditBalance} نقطة
            </div>
          </div>
          <div className="p-3 bg-[#0D0F17] border border-[#1F2438] rounded-xl">
            <span className="text-gray-400">تاريخ التسجيل:</span>
            <div className="font-bold text-white mt-1">
              {new Date(user.createdAt).toLocaleDateString("ar-EG")}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white">
            المشاريع المرتبطة ({userProjects.length})
          </h4>
          {userProjects.length === 0 ? (
            <p className="text-xs text-gray-500">لا توجد مشاريع مخصصة</p>
          ) : (
            <div className="space-y-1.5">
              {userProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 bg-[#0D0F17] rounded-lg text-xs flex justify-between"
                >
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="text-gray-400">{p.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white">
            آخر التوليدات ({userGenerations.length})
          </h4>
          {userGenerations.length === 0 ? (
            <p className="text-xs text-gray-500">لا توجد توليدات مسجلة</p>
          ) : (
            <div className="space-y-1.5">
              {userGenerations.map((g) => (
                <div
                  key={g.id}
                  className="p-2.5 bg-[#0D0F17] rounded-lg text-xs flex justify-between"
                >
                  <span className="text-gray-300 truncate max-w-xs">
                    {g.prompt}
                  </span>
                  <span className="font-bold text-[#FF2E4C]">
                    {g.creditsUsed} نقاط
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminProjectsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          إدارة المشاريع التسويقية
        </h2>
        <p className="text-xs text-gray-400">
          مراقبة المشاريع المفتوحة وسياق الهويات التجارية.
        </p>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">اسم المشروع</th>
                <th className="p-3.5">المالك</th>
                <th className="p-3.5">المجال</th>
                <th className="p-3.5">الجمهور المستهدف</th>
                <th className="p-3.5">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {state.projects.map((p) => (
                <tr key={p.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 font-bold text-white">{p.name}</td>
                  <td className="p-3.5 text-gray-300">{p.ownerName}</td>
                  <td className="p-3.5 font-bold text-amber-400">
                    {p.industry}
                  </td>
                  <td className="p-3.5 text-gray-400">{p.targetAudience}</td>
                  <td className="p-3.5 text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminSubscriptionsView({ state, dispatch, showToast }) {
  const role = state.auth.user?.adminRole || "USER";
  const canManage = checkHasPermission(role, "SUBSCRIPTIONS_MANAGE");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          إدارة الاشتراكات والعقود التجارية
        </h2>
        <p className="text-xs text-gray-400">
          عرض، إلغاء، وتمديد اشتراكات المستخدمين.
        </p>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">الخطة</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">تاريخ الانتهاء</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {state.subscriptionsList.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 font-bold text-white">{sub.userName}</td>
                  <td className="p-3.5 font-bold text-amber-400">
                    {sub.planName}
                  </td>
                  <td className="p-3.5 font-bold text-white">
                    {sub.amountLYD} د.ل
                  </td>
                  <td className="p-3.5 text-gray-400">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sub.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {sub.status === "active" ? "نشط" : "ملغى"}
                    </span>
                  </td>
                  <td className="p-3.5 flex items-center gap-2">
                    {canManage && sub.status === "active" && (
                      <>
                        <button
                          onClick={() => {
                            dispatch({
                              type: "ADMIN_EXTEND_SUBSCRIPTION",
                              payload: { subId: sub.id, extraDays: 30 },
                            });
                            showToast(
                              "تم تمديد الاشتراك لـ 30 يوماً إضافية",
                              "success",
                            );
                          }}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-lg transition text-[11px]"
                        >
                          +30 يوم
                        </button>
                        <button
                          onClick={() => {
                            dispatch({
                              type: "ADMIN_CANCEL_SUBSCRIPTION",
                              payload: { subId: sub.id, reason: "إلغاء إداري" },
                            });
                            showToast("تم إلغاء الاشتراك بنجاح", "error");
                          }}
                          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold rounded-lg transition text-[11px]"
                        >
                          إلغاء
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminPaymentsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">سجل مدفوعات Ezone Pay</h2>
        <p className="text-xs text-gray-400">
          عمليات الدفع الإلكتروني المؤكدة عبر التوقيع الرقمي S2S.
        </p>
      </div>

      <div className="p-4 bg-[#121520] border border-[#1F2438] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-white">
            حالة التكامل: Ezone Pay S2S Webhook Engine READY
          </span>
        </div>
        <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
          Production: NOT ACTIVATED
        </span>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">المرجع (Order Ref)</th>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">معرف المعاملة</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {state.paymentsList.map((pay) => (
                <tr key={pay.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 font-mono text-amber-400 font-bold">
                    {pay.orderReference}
                  </td>
                  <td className="p-3.5 font-bold text-white">{pay.userName}</td>
                  <td className="p-3.5 font-bold text-white">
                    {pay.amountLYD} د.ل
                  </td>
                  <td className="p-3.5 font-mono text-gray-400">
                    {pay.providerTxId || "غ/م"}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${pay.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {pay.status === "paid" ? "مدفوع" : "فشل"}
                    </span>
                  </td>
                  <td className="p-3.5 text-gray-500">
                    {new Date(pay.createdAt).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminCreditsView({ state, dispatch }) {
  const role = state.auth.user?.adminRole || "USER";
  const canManage = checkHasPermission(role, "CREDITS_MANAGE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            سجل النقاط والتسويات الائتمانية
          </h2>
          <p className="text-xs text-gray-400">
            دفتر حسابات النقاط المستحدث للتوليد والتسويات الإدارية.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() =>
              dispatch({ type: "SET_ACTIVE_CREDIT_MODAL", payload: true })
            }
            className="bg-[#FF2E4C] hover:bg-[#E50914] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Coins className="w-4 h-4" />
            <span>تعديل/منح نقاط لمستخدم</span>
          </button>
        )}
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">معرف المعاملة</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">الكمية</th>
                <th className="p-3.5">الوصف</th>
                <th className="p-3.5">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {state.credits.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 font-mono text-gray-400">{tx.id}</td>
                  <td className="p-3.5 font-bold text-amber-400">{tx.type}</td>
                  <td
                    className={`p-3.5 font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} نقطة
                  </td>
                  <td className="p-3.5 text-gray-300">{tx.description}</td>
                  <td className="p-3.5 text-gray-500">
                    {new Date(tx.createdAt).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminCreditAdjustmentModal({ state, dispatch, showToast }) {
  const [selectedUser, setSelectedUser] = useState(
    state.usersList[0]?.id || "",
  );
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-md space-y-4 relative">
        <button
          onClick={() =>
            dispatch({ type: "SET_ACTIVE_CREDIT_MODAL", payload: false })
          }
          className="absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" /> تسوية نقاط الحساب
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-400 font-bold mb-1">
              المستخدم المستهدف:
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
            >
              {state.usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">
              الكمية (موجب للإضافة، سالب للخصم):
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">
              سبب التسوية الإدارية:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تعويض عن تعثر خدمة..."
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl"
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (!reason) return showToast("يرجى توضيح سبب التسوية", "error");
            dispatch({
              type: "ADMIN_ADJUST_CREDITS",
              payload: { targetUserId: selectedUser, amount, reason },
            });
            showToast(
              "تمت التسوية وتسجيل حدث المراجعة (Audit) بنجاح!",
              "success",
            );
          }}
          className="w-full bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs py-3 rounded-xl transition"
        >
          تأكيد التسوية وتسجيل الـ Audit Log
        </button>
      </div>
    </div>
  );
}

function AdminPlansView({ state, dispatch, showToast }) {
  const role = state.auth.user?.adminRole || "USER";
  const canManage = checkHasPermission(role, "PLANS_MANAGE");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          إدارة الخطط التجارية (Plans)
        </h2>
        <p className="text-xs text-gray-400">
          تحديث الأسعار والحصص الشهرية (مقتصر على SUPER_ADMIN).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.plansList.map((plan) => (
          <div
            key={plan.id}
            className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-3 relative"
          >
            <h3 className="font-bold text-white text-sm">{plan.name}</h3>
            <p className="text-xl font-extrabold text-[#FF2E4C]">
              {plan.priceMonthlyLYD} د.ل{" "}
              <span className="text-xs text-gray-400 font-normal">
                / شهرياً
              </span>
            </p>
            <p className="text-xs text-gray-300">
              النقاط:{" "}
              <span className="font-bold text-amber-400">
                {plan.monthlyCredits}
              </span>
            </p>
            {canManage && (
              <button
                onClick={() =>
                  dispatch({ type: "SET_ACTIVE_PLAN_MODAL", payload: plan })
                }
                className="w-full bg-[#1F2438] hover:bg-gray-700 text-white font-bold text-xs py-2 rounded-xl transition"
              >
                تعديل السعر والنقاط
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPlanEditModal({ plan, dispatch, showToast }) {
  const [price, setPrice] = useState(plan.priceMonthlyLYD);
  const [credits, setCredits] = useState(plan.monthlyCredits);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-sm space-y-4 relative">
        <button
          onClick={() =>
            dispatch({ type: "SET_ACTIVE_PLAN_MODAL", payload: null })
          }
          className="absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-extrabold text-white">
          تعديل {plan.name}
        </h3>

        <div>
          <label className="block text-gray-400 text-xs mb-1">
            السعر بالدينار (LYD):
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1">
            النقاط الشهرية:
          </label>
          <input
            type="number"
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl text-xs font-mono"
          />
        </div>

        <button
          onClick={() => {
            dispatch({
              type: "ADMIN_UPDATE_PLAN",
              payload: {
                planId: plan.id,
                newPriceLYD: price,
                newCredits: credits,
              },
            });
            showToast("تم تحديث الخطة وتسجيل التعديل في Audit Logs", "success");
          }}
          className="w-full bg-[#FF2E4C] text-white font-bold text-xs py-2.5 rounded-xl transition"
        >
          حفظ والتأكيد
        </button>
      </div>
    </div>
  );
}

function AdminPackagesView({ state, dispatch, showToast }) {
  const role = state.auth.user?.adminRole || "USER";
  const canManage = checkHasPermission(role, "PACKAGES_MANAGE");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          حزم الشراء المباشر للنقاط
        </h2>
        <p className="text-xs text-gray-400">
          تكوين أسعار باقات النقاط الإضافية (SUPER_ADMIN فقط).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.packagesList.map((pkg) => (
          <div
            key={pkg.id}
            className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-3"
          >
            <h3 className="font-bold text-white text-sm">{pkg.name}</h3>
            <p className="text-xl font-extrabold text-amber-400">
              {pkg.priceLYD} د.ل
            </p>
            <p className="text-xs text-gray-300">
              النقاط:{" "}
              <span className="font-bold text-white">{pkg.credits}</span>
            </p>
            {canManage && (
              <button
                onClick={() =>
                  dispatch({ type: "SET_ACTIVE_PACKAGE_MODAL", payload: pkg })
                }
                className="w-full bg-[#1F2438] hover:bg-gray-700 text-white font-bold text-xs py-2 rounded-xl transition"
              >
                تعديل الحزمة
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPackageEditModal({ pkg, dispatch, showToast }) {
  const [price, setPrice] = useState(pkg.priceLYD);
  const [credits, setCredits] = useState(pkg.credits);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-sm space-y-4 relative">
        <button
          onClick={() =>
            dispatch({ type: "SET_ACTIVE_PACKAGE_MODAL", payload: null })
          }
          className="absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-extrabold text-white">
          تعديل {pkg.name}
        </h3>

        <div>
          <label className="block text-gray-400 text-xs mb-1">
            السعر بالدينار (LYD):
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1">
            عدد النقاط:
          </label>
          <input
            type="number"
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl text-xs font-mono"
          />
        </div>

        <button
          onClick={() => {
            dispatch({
              type: "ADMIN_UPDATE_PACKAGE",
              payload: {
                pkgId: pkg.id,
                newPriceLYD: price,
                newCredits: credits,
              },
            });
            showToast("تم تحديث الحزمة بنجاح", "success");
          }}
          className="w-full bg-[#FF2E4C] text-white font-bold text-xs py-2.5 rounded-xl transition"
        >
          حفظ والتأكيد
        </button>
      </div>
    </div>
  );
}

function AdminProvidersView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          مزودو خدمات الذكاء الاصطناعي
        </h2>
        <p className="text-xs text-gray-400">
          مراقبة الجاهزية والزمن المستغرق للاستجابة (بدون إظهار مفاتيح API).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.providersList.map((prov) => (
          <div
            key={prov.id}
            className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">{prov.name}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prov.configured ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-500"}`}
              >
                {prov.configured ? "مهيأ" : "غير مهيأ"}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              متوسط الزمن:{" "}
              <span className="font-bold text-white font-mono">
                {prov.latencyMs}ms
              </span>
            </p>
            <div className="flex flex-wrap gap-1">
              {prov.capabilities.map((c, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-[#0D0F17] border border-[#1F2438] px-2 py-0.5 rounded text-gray-400"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminModelsView({ state, dispatch }) {
  const role = state.auth.user?.adminRole || "USER";
  const canManage = checkHasPermission(role, "MODELS_MANAGE");

  const allModels = [
    ...state.modelRegistry.chat,
    ...state.modelRegistry.image,
    ...state.modelRegistry.video,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          نماذج الذكاء الاصطناعي والتكلفة
        </h2>
        <p className="text-xs text-gray-400">
          تعديل تكلفة النقاط لكل نموذج (مقتصر على SUPER_ADMIN).
        </p>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">النموذج</th>
                <th className="p-3.5">المزود</th>
                <th className="p-3.5">تكلفة النقاط</th>
                <th className="p-3.5">الخطة الأدنى</th>
                <th className="p-3.5">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {allModels.map((mod) => (
                <tr key={mod.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 font-bold text-white">
                    {mod.displayName}{" "}
                    <span className="text-[10px] font-mono text-gray-400 block">
                      {mod.id}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-amber-400">
                    {mod.provider}
                  </td>
                  <td className="p-3.5 font-bold text-[#FF2E4C]">
                    {mod.creditCost} نقاط
                  </td>
                  <td className="p-3.5 text-gray-300">{mod.minPlan}</td>
                  <td className="p-3.5">
                    {canManage && (
                      <button
                        onClick={() =>
                          dispatch({
                            type: "SET_ACTIVE_MODEL_MODAL",
                            payload: mod,
                          })
                        }
                        className="px-2.5 py-1 bg-[#1F2438] hover:bg-gray-700 text-white font-bold rounded-lg transition text-[11px]"
                      >
                        تعديل التكلفة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminModelPriceModal({ model, dispatch, showToast }) {
  const [cost, setCost] = useState(model.creditCost);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl p-6 w-full max-w-sm space-y-4 relative">
        <button
          onClick={() =>
            dispatch({ type: "SET_ACTIVE_MODEL_MODAL", payload: null })
          }
          className="absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-extrabold text-white">
          تعديل تكلفة {model.displayName}
        </h3>

        <div>
          <label className="block text-gray-400 text-xs mb-1">
            تكلفة النقاط لكل طلب:
          </label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl text-xs font-mono"
          />
        </div>

        <button
          onClick={() => {
            dispatch({
              type: "ADMIN_UPDATE_MODEL_PRICE",
              payload: { modelId: model.id, newCreditCost: cost },
            });
            showToast(
              "تم تحديث تكلفة النموذج وتسجيل الحدث في Audit Logs",
              "success",
            );
          }}
          className="w-full bg-[#FF2E4C] text-white font-bold text-xs py-2.5 rounded-xl transition"
        >
          تأكيد التعديل
        </button>
      </div>
    </div>
  );
}

function AdminGenerationsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          توليدات الذكاء الاصطناعي
        </h2>
        <p className="text-xs text-gray-400">سجل طلبات التوليد عبر المنصة.</p>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">النموذج</th>
                <th className="p-3.5">النقاط المستهلكة</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {state.generations.map((gen) => (
                <tr key={gen.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 font-bold text-white">{gen.userName}</td>
                  <td className="p-3.5 font-bold text-amber-400">{gen.type}</td>
                  <td className="p-3.5 font-mono text-gray-300">{gen.model}</td>
                  <td className="p-3.5 font-bold text-[#FF2E4C]">
                    {gen.creditsUsed} نقاط
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      مكتمل
                    </span>
                  </td>
                  <td className="p-3.5 text-gray-500">
                    {new Date(gen.createdAt).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminAssetsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">أصول وتصاميم المنصة</h2>
        <p className="text-xs text-gray-400">
          الملفات المولدة المشفرة والمحفوظة في التخزين.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.assets.map((asset) => (
          <div
            key={asset.id}
            className="p-4 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-3"
          >
            <img
              src={asset.filePath}
              alt="Asset"
              className="w-full h-40 object-cover rounded-xl border border-[#1F2438]"
            />
            <div className="text-xs">
              <div className="font-bold text-white truncate">{asset.name}</div>
              <div className="text-[10px] text-gray-400">
                المالك: {asset.userName}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAuditLogsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          سجل المراجعة والأمان (Append-Only Audit Log)
        </h2>
        <p className="text-xs text-gray-400">
          سجل غير قابل للتعديل أو الحذف بضمانة triggers قاعدة البيانات.
        </p>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">معرف السجل</th>
                <th className="p-3.5">الفاعل (Actor)</th>
                <th className="p-3.5">الإجراء</th>
                <th className="p-3.5">الكيان</th>
                <th className="p-3.5">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {state.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5 font-mono text-gray-400">{log.id}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-white">{log.actorEmail}</div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-[#FF2E4C]">
                    {log.action}
                  </td>
                  <td className="p-3.5 text-gray-300 font-mono">
                    {log.entity}
                  </td>
                  <td className="p-3.5 text-gray-400">
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminSystemErrorsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          سجل أخطاء واستثناءات النظام
        </h2>
        <p className="text-xs text-gray-400">
          متابعة الأخطاء الفنية والسيرفرات دون عرض المفاتيح الحساسة.
        </p>
      </div>

      <div className="bg-[#121520] border border-[#1F2438] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-[#0D0F17] text-gray-400 font-bold border-b border-[#1F2438]">
              <tr>
                <th className="p-3.5">الخطورة</th>
                <th className="p-3.5">الخدمة</th>
                <th className="p-3.5">الرسالة</th>
                <th className="p-3.5">المستخدم المعني</th>
                <th className="p-3.5">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2438]">
              {state.systemErrors.map((err) => (
                <tr key={err.id} className="hover:bg-[#0D0F17]/50 transition">
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${err.severity === "WARNING" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}
                    >
                      {err.severity}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-white">{err.service}</td>
                  <td className="p-3.5 text-gray-300">{err.message}</td>
                  <td className="p-3.5 font-mono text-gray-400">
                    {err.userEmail}
                  </td>
                  <td className="p-3.5 text-gray-500">
                    {new Date(err.createdAt).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminAnalyticsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          التحليلات ومؤشرات النمو
        </h2>
        <p className="text-xs text-gray-400">
          استعلامات مجمعة للأداء المالي والاستهلاكي.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="معدل نمو المستخدمين"
          value="+18%"
          subtitle="خلال آخر 30 يوماً"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          label="نسبة تحويل الاشتراكات"
          value="24.5%"
          subtitle="من مجانية إلى Pro"
          icon={<Zap className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          label="استقرار السيرفرات"
          value="99.98%"
          subtitle="جاهزية تشغيلية"
          icon={<ShieldCheck className="w-5 h-5 text-blue-400" />}
        />
      </div>
    </div>
  );
}

function AdminSettingsView({ state }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">إعدادات المنصة</h2>
        <p className="text-xs text-gray-400">
          تكوين المتغيرات التشغيلية للمنصة.
        </p>
      </div>

      <div className="p-5 bg-[#121520] border border-[#1F2438] rounded-2xl space-y-4 max-w-xl text-xs">
        <div>
          <label className="block text-gray-400 font-bold mb-1">
            وضع الصيانة العام:
          </label>
          <span className="text-emerald-400 font-bold">
            غير مفعل (المنصة تعمل بشكل طبيعي)
          </span>
        </div>

        <div>
          <label className="block text-gray-400 font-bold mb-1">
            مفتاح Ezone Pay Webhook HMAC:
          </label>
          <input
            type="password"
            disabled
            value="*****************"
            className="w-full bg-[#0D0F17] border border-[#1F2438] text-gray-500 p-2 rounded-xl"
          />
          <p className="text-[10px] text-gray-500 mt-1">[مأمن بسيرفر البيئة]</p>
        </div>
      </div>
    </div>
  );
}

function AdminSubscriptionModal({ sub, dispatch, showToast }) {
  return null;
}
