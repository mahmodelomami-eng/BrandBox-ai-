import React, { useState, useEffect, useRef, useReducer } from 'react';
import { 
  LayoutDashboard, MessageSquare, Image as ImageIcon, Video, Layers, Palette, 
  CreditCard, Sliders, Coins, FolderOpen, Download, Bot, Database, 
  Plus, Search, X, Sparkles, ShieldCheck, RefreshCw, Send, Trash2, LogOut, Lock, 
  CheckCircle2, Server, ShieldAlert, History, Eye, FolderPlus, ArrowRight,
  Briefcase, Users, Target, Globe, MessageCircle, ChevronDown, Activity, Settings, 
  ExternalLink, Filter, Play, Clock, AlertTriangle, AlertCircle, Ban, Wallet, 
  TrendingUp, ArrowUpRight, ArrowDownLeft, Shield, FileText, Check, Zap, Award, QrCode,
  SlidersHorizontal, ChevronLeft, LockKeyhole, UserCheck, ShieldQuestion, FileSpreadsheet,
  ToggleLeft, ToggleRight, Edit3, UserX, AlertOctagon, Bell, Cpu, BarChart3, PieChart
} from 'lucide-react';

export const UNIFIED_MODEL_REGISTRY = {
  chat: [
    { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', provider: 'OpenAI', creditCost: 2, minPlan: 'free', isActive: true, capabilities: ['text', 'code', 'arabic-optimized'], environment: 'production' },
    { id: 'anthropic/claude-3.5-sonnet', displayName: 'Claude 3.5 Sonnet', provider: 'Anthropic', creditCost: 4, minPlan: 'starter', isActive: true, capabilities: ['analysis', 'coding', 'long-context'], environment: 'production' },
    { id: 'meta-llama/llama-3.3-70b-instruct', displayName: 'Llama 3.3 70B', provider: 'Meta', creditCost: 2, minPlan: 'free', isActive: true, capabilities: ['open-weights', 'fast'], environment: 'production' },
    { id: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', provider: 'Google', creditCost: 1, minPlan: 'free', isActive: true, capabilities: ['ultra-fast', 'cost-efficient'], environment: 'production' }
  ],
  image: [
    { id: 'imagen-4.0-generate-001', displayName: 'Imagen 4.0 Ultra', provider: 'Google', creditCost: 5, minPlan: 'starter', isActive: true, capabilities: ['photorealistic', '3d', 'cinematic'], environment: 'production' },
    { id: 'gemini-3.1-flash-image-preview', displayName: 'Gemini Flash Image', provider: 'Google', creditCost: 4, minPlan: 'free', isActive: true, capabilities: ['editing', 'fast'], environment: 'production' },
    { id: 'flux-1-schnell', displayName: 'Flux 1 Schnell', provider: 'Black Forest Labs', creditCost: 3, minPlan: 'free', isActive: true, capabilities: ['anime', 'minimalist'], environment: 'production' }
  ],
  video: [
    { id: 'runway-gen3-alpha', displayName: 'Runway Gen-3 Alpha', provider: 'Runway', creditCost: 15, minPlan: 'pro', isActive: false, status: 'provider_not_configured', capabilities: ['video-generation'], environment: 'staging' }
  ]
};

export const INITIAL_PLANS = [
  { id: 'free', name: 'المجانية (Free)', priceMonthlyLYD: 0, priceMonthlyUSD: 0, monthlyCredits: 50, maxProjects: 2, videoAccess: false, brandKitAccess: true, commercialUsage: false, description: 'مثالية لتجربة المنصة واستكشاف الأدوات الأساسية.', badge: 'البداية', isActive: true },
  { id: 'starter', name: 'الأساسية (Starter)', priceMonthlyLYD: 45, priceMonthlyUSD: 9, monthlyCredits: 200, maxProjects: 5, videoAccess: false, brandKitAccess: true, commercialUsage: true, description: 'للمستقلين وصناع المحتوى الناشئين.', badge: 'النمو', isActive: true },
  { id: 'pro', name: 'الاحترافية (Pro)', priceMonthlyLYD: 145, priceMonthlyUSD: 29, monthlyCredits: 1000, maxProjects: 25, videoAccess: true, brandKitAccess: true, commercialUsage: true, description: 'الخيار الأفضل للشركات الناشئة والمصممين المحترفين.', badge: 'الأكثر شعبية', isPopular: true, isActive: true },
  { id: 'business', name: 'الأعمال (Business)', priceMonthlyLYD: 395, priceMonthlyUSD: 79, monthlyCredits: 5000, maxProjects: 100, videoAccess: true, brandKitAccess: true, commercialUsage: true, description: 'للوكالات الرقمية والفرق التسويقية التنافسية.', badge: 'المرونة القصوى', isActive: true }
];

export const INITIAL_CREDIT_PACKAGES = [
  { id: 'pkg_100', name: 'باقة 100 نقطة', credits: 100, priceLYD: 25, priceUSD: 5, bonus: 0, isActive: true },
  { id: 'pkg_500', name: 'باقة 500 نقطة', credits: 500, priceLYD: 100, priceUSD: 20, bonus: 50, isActive: true },
  { id: 'pkg_1000', name: 'باقة 1000 نقطة', credits: 1000, priceLYD: 175, priceUSD: 35, bonus: 150, isBestValue: true, isActive: true },
  { id: 'pkg_5000', name: 'باقة 5000 نقطة', credits: 5000, priceLYD: 750, priceUSD: 150, bonus: 1000, isActive: true }
];

export const ROLE_PERMISSIONS_MATRIX = {
  SUPER_ADMIN: new Set([
    'USERS_READ', 'USERS_MANAGE', 'PROJECTS_READ', 'PROJECTS_MANAGE',
    'SUBSCRIPTIONS_READ', 'SUBSCRIPTIONS_MANAGE', 'PAYMENTS_READ', 'PAYMENTS_MANAGE',
    'CREDITS_READ', 'CREDITS_MANAGE', 'PLANS_READ', 'PLANS_MANAGE',
    'PACKAGES_READ', 'PACKAGES_MANAGE', 'PROVIDERS_READ', 'PROVIDERS_MANAGE',
    'MODELS_READ', 'MODELS_MANAGE', 'GENERATIONS_READ', 'GENERATIONS_MANAGE',
    'ASSETS_READ', 'ASSETS_MANAGE', 'AUDIT_LOGS_READ', 'ERRORS_READ',
    'ANALYTICS_READ', 'SETTINGS_READ', 'SETTINGS_MANAGE', 'ADMIN_MANAGE', 'SECURITY_MANAGE'
  ]),
  ADMIN: new Set([
    'USERS_READ', 'USERS_MANAGE', 'PROJECTS_READ', 'PROJECTS_MANAGE',
    'SUBSCRIPTIONS_READ', 'SUBSCRIPTIONS_MANAGE', 'PAYMENTS_READ', 'PAYMENTS_MANAGE',
    'CREDITS_READ', 'CREDITS_MANAGE', 'GENERATIONS_READ', 'GENERATIONS_MANAGE',
    'ASSETS_READ', 'ASSETS_MANAGE', 'AUDIT_LOGS_READ', 'ERRORS_READ',
    'ANALYTICS_READ', 'PLANS_READ', 'PACKAGES_READ', 'PROVIDERS_READ',
    'MODELS_READ', 'SETTINGS_READ'
  ]),
  SUPPORT: new Set([
    'USERS_READ', 'PROJECTS_READ', 'SUBSCRIPTIONS_READ', 'PAYMENTS_READ',
    'GENERATIONS_READ', 'ASSETS_READ'
  ]),
  USER: new Set([])
};

export function checkHasPermission(role, permission) {
  if (!role || role === 'USER') return false;
  const permissions = ROLE_PERMISSIONS_MATRIX[role];
  return permissions ? permissions.has(permission) : false;
}

const initialUsers = [
  { id: 'usr_supabase_981240', firstName: 'محمود', lastName: 'الحسن', email: 'mahmoud@brandbox.ai', phone: '0912345678', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', adminRole: 'SUPER_ADMIN', status: 'active', planId: 'pro', creditBalance: 340, createdAt: '2026-01-15T08:00:00Z', lastActive: 'منذ دقيقة' },
  { id: 'usr_supabase_412091', firstName: 'فاطمة', lastName: 'الورفلي', email: 'fatima@techly.ly', phone: '0928887766', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', adminRole: 'ADMIN', status: 'active', planId: 'starter', creditBalance: 120, createdAt: '2026-02-10T10:30:00Z', lastActive: 'منذ ساعة' },
  { id: 'usr_supabase_330192', firstName: 'عمر', lastName: 'الصرّاف', email: 'omar.support@brandbox.ai', phone: '0941112233', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', adminRole: 'SUPPORT', status: 'active', planId: 'free', creditBalance: 45, createdAt: '2026-03-01T14:15:00Z', lastActive: 'منذ يومين' },
  { id: 'usr_supabase_883012', firstName: 'طارق', lastName: 'البدري', email: 'tariq@designstudio.ly', phone: '0915554433', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', adminRole: 'USER', status: 'suspended', planId: 'business', creditBalance: 0, createdAt: '2026-04-20T09:00:00Z', lastActive: 'منذ أسبوع' }
];

export default function App() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#090A0F] text-gray-100 font-sans p-8">
      <h1 className="text-2xl font-extrabold text-[#FF2E4C]">Brand Box AI — Unified Platform Engine</h1>
      <p className="text-sm text-gray-400 mt-2">v1.0.0-RC1 Production Ready</p>
    </div>
  );
}
