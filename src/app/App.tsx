"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  LayoutDashboard, Users, Building2, Network, FolderKanban, CheckSquare,
  Calendar, Clock, PlaneTakeoff, DollarSign, Award, Target, BarChart3,
  FileBarChart, BookOpen, FileText, Bell, Video, Bot,
  Settings, ShieldCheck, Key, CreditCard, LogOut, User,
  Search, Plus, Filter, Grid3X3, List, MoreHorizontal, ChevronDown,
  ChevronRight, ArrowUp, ArrowDown, ArrowUpRight, Star, Zap, AlertCircle,
  CheckCircle2, XCircle, TrendingUp, TrendingDown, Send, Paperclip,
  Smile, Menu, X, Eye, Edit2, Trash2, Download, RefreshCw,
  GripVertical, Play, Phone, Mail, MapPin, Globe, Activity, SlidersHorizontal,
  Mic, Code, Layers, Sun, Moon, ChevronLeft, Tag, Info, Copy, Lock, Upload, PartyPopper, Wallet, Receipt
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const TASK_DRAG_TYPE = "TASK";

// Vignesh is locked to Calendar + Expense Log only — see Sidebar's hasAccess.
// Mirrors the server-side gate in src/lib/auth.ts (canSubmitOpsExpense).
const VIGNESH_EMAIL = "vignesh@aaruchudar.com";

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────

type ThemeMode = "dark" | "light";

interface ThemeCtxType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  light: boolean;
  c: (dark: string, light: string) => string;
}

const ThemeCtx = createContext<ThemeCtxType>({
  theme: "dark", setTheme: () => {}, light: false, c: (d) => d,
});

const useTheme = () => useContext(ThemeCtx);

// ─── APP CONTEXT ──────────────────────────────────────────────────────────────

const AppCtx = createContext<{ selectedEmployeeId: number; setSelectedEmployeeId: (id: number) => void; navigateTo: (p: Page) => void }>({
  selectedEmployeeId: 1, setSelectedEmployeeId: () => {}, navigateTo: () => {},
});
const useApp = () => useContext(AppCtx);

const DARK = {
  bg: "#0F172A", topbar: "#0B1020", sidebar: "#0B1020",
  tooltipBg: "#1E293B", tooltipBorder: "rgba(255,255,255,0.1)",
  tooltipText: "#F1F5F9", tooltipLabel: "#94A3B8",
  chartGrid: "rgba(255,255,255,0.04)", tickColor: "#64748B",
};
const LIGHT = {
  bg: "#F8FAFC", topbar: "#FFFFFF", sidebar: "#0B1020",
  tooltipBg: "#FFFFFF", tooltipBorder: "#E2E8F0",
  tooltipText: "#1E293B", tooltipLabel: "#64748B",
  chartGrid: "rgba(0,0,0,0.04)", tickColor: "#94A3B8",
};

// ─── AUTH TYPES ──────────────────────────────────────────────────────────────

type UserRole = "super-admin" | "1st-level-manager" | "2nd-level-manager" | "manager" | "team-lead" | "hr-admin" | "employee";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  avatarColor: string;
  role: UserRole;
  roleLabel: string;
  dept: string;
  title: string;
  phone: string;
  location: string;
  permissions: string[];
}

const AuthCtx = createContext<{
  authUser: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
  updateAuthUser: (u: AuthUser) => void;
}>({ authUser: null, login: () => {}, logout: () => {}, updateAuthUser: () => {} });
const useAuth = () => useContext(AuthCtx);

// ─── MODAL CONTEXT ────────────────────────────────────────────────────────────

type ModalName =
  | "add-employee" | "add-department" | "department-detail" | "create-team" | "create-project"
  | "create-task" | "task-detail" | "create-event" | "schedule-meeting" | "apply-leave"
  | "add-objective" | "add-article" | "eod-detail" | "add-expense-claim" | "add-ops-expense" | null;

const ModalCtx = createContext<{
  openModal: (n: ModalName, data?: any) => void;
  closeModal: () => void;
  activeModal: ModalName;
  modalData: any;
}>({ openModal: () => {}, closeModal: () => {}, activeModal: null, modalData: null });
const useModal = () => useContext(ModalCtx);

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Page =
  | "dashboard" | "employees" | "departments" | "teams"
  | "projects" | "tasks" | "calendar" | "attendance" | "leave"
  | "payroll" | "payslip" | "kpi" | "okr" | "analytics"
  | "reports" | "knowledge" | "settings"
  | "notifications" | "meetings" | "roles" | "audit" | "billing" | "profile"
  | "employee-profile" | "my-work" | "eod" | "payroll-expenses" | "expense-claims" | "expense-log";


// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default"|"success"|"warning"|"danger"|"info"|"purple"; className?: string }) {
  const variants = {
    default: "bg-slate-500/20 text-slate-400 border border-slate-500/20",
    success: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25",
    warning: "bg-amber-500/15 text-amber-500 border border-amber-500/25",
    danger: "bg-red-500/15 text-red-500 border border-red-500/25",
    info: "bg-indigo-500/15 text-indigo-500 border border-indigo-500/25",
    purple: "bg-violet-500/15 text-violet-500 border border-violet-500/25",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${variants[variant]} ${className}`}>{children}</span>;
}

function Avatar({ initials, color = "bg-indigo-500", size = "md" }: { initials: string; color?: string; size?: "sm"|"md"|"lg"|"xl" }) {
  const sizes = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-xs", lg: "w-11 h-11 text-sm", xl: "w-14 h-14 text-base" };
  return <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}>{initials}</div>;
}

function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const { c } = useTheme();
  return <div onClick={onClick} className={`${c("bg-slate-800/60 border-white/[0.06]","bg-white border-slate-200")} border rounded-xl ${className}`}>{children}</div>;
}

function StatCard({ label, value, change, changeLabel, icon: Icon, iconColor, trend, onClick }: { label: string; value: string; change?: string; changeLabel?: string; icon: React.ElementType; iconColor: string; trend?: "up"|"down"; onClick?: () => void }) {
  const { c } = useTheme();
  return (
    <div onClick={onClick} className={`${c("bg-slate-800/60 border-white/[0.06] hover:border-white/10","bg-white border-slate-200 hover:border-slate-300")} border rounded-xl p-5 flex flex-col gap-3 transition-colors ${onClick ? "cursor-pointer" : ""}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-semibold tracking-wide uppercase ${c("text-slate-400","text-slate-500")}`}>{label}</span>
        <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center`}><Icon size={15} className="text-white" /></div>
      </div>
      <div>
        <div className={`text-2xl font-bold ${c("text-white","text-slate-900")}`}>{value}</div>
        {change && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${trend==="up"?"text-emerald-500":"text-red-500"}`}>
            {trend==="up"?<ArrowUp size={12}/>:<ArrowDown size={12}/>}
            <span className="font-medium">{change}</span>
            {changeLabel && <span className={c("text-slate-500","text-slate-400")}>{changeLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const m: Record<string,{variant:any;label:string}> = {
    critical:{variant:"danger",label:"Critical"},high:{variant:"warning",label:"High"},medium:{variant:"info",label:"Medium"},low:{variant:"default",label:"Low"},
  };
  const p = m[priority]||m.low;
  return <Badge variant={p.variant}>{p.label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string,{variant:any;label:string}> = {
    active:{variant:"success",label:"Active"},"on-leave":{variant:"warning",label:"On Leave"},inactive:{variant:"danger",label:"Inactive"},
    "in-progress":{variant:"info",label:"In Progress"},planning:{variant:"purple",label:"Planning"},review:{variant:"warning",label:"In Review"},
    completed:{variant:"success",label:"Completed"},todo:{variant:"default",label:"To Do"},done:{variant:"success",label:"Done"},
    approved:{variant:"success",label:"Approved"},"on-track":{variant:"success",label:"On Track"},"at-risk":{variant:"warning",label:"At Risk"},
    recurring:{variant:"success",label:"Recurring"},upcoming:{variant:"info",label:"Upcoming"},
  };
  const s = m[status]||{variant:"default",label:status};
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function ProgressBar({ value, color="bg-indigo-500" }: { value: number; color?: string }) {
  const { c } = useTheme();
  return (
    <div className={`w-full h-1.5 ${c("bg-slate-700","bg-slate-200")} rounded-full overflow-hidden`}>
      <div className={`h-full ${color} rounded-full`} style={{ width:`${Math.min(value,100)}%` }}/>
    </div>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className={`text-xl font-semibold ${c("text-white","text-slate-900")}`}>{title}</h1>
        {subtitle && <p className={`text-sm mt-0.5 ${c("text-slate-400","text-slate-500")}`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

function Btn({ children, variant="primary", size="md", onClick, icon: Icon, className="", disabled=false }: { children?: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md"; onClick?: ()=>void; icon?: React.ElementType; className?: string; disabled?: boolean }) {
  const { c } = useTheme();
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white",
    secondary: c("bg-slate-700 hover:bg-slate-600 text-slate-200 border border-white/[0.08]","bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"),
    ghost: c("hover:bg-slate-700/60 text-slate-300","hover:bg-slate-100 text-slate-600"),
    danger: "bg-red-600 hover:bg-red-500 text-white",
  };
  const sizes = { sm:"px-3 py-1.5 text-xs gap-1.5", md:"px-4 py-2 text-sm gap-2" };
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}>
      {Icon && <Icon size={size==="sm"?13:15}/>}
      {children}
    </button>
  );
}

function ChartTip({ active, payload, label, light }: any) {
  if (!active||!payload?.length) return null;
  const col = light?LIGHT:DARK;
  return (
    <div style={{ background:col.tooltipBg, border:`1px solid ${col.tooltipBorder}` }} className="rounded-xl p-3 shadow-xl">
      <p style={{ color:col.tooltipLabel }} className="text-xs mb-2">{label}</p>
      {payload.map((p:any,i:number) => <p key={i} className="text-sm font-semibold" style={{ color:p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

const navGroups = [
  { label:"Overview", items:[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"my-work",label:"My Work",icon:User}] },
  { label:"Organization", items:[{id:"employees",label:"Employees",icon:Users},{id:"departments",label:"Departments",icon:Building2},{id:"teams",label:"Teams",icon:Network}] },
  { label:"Work", items:[{id:"projects",label:"Projects",icon:FolderKanban},{id:"tasks",label:"Tasks",icon:CheckSquare},{id:"calendar",label:"Calendar",icon:Calendar},{id:"meetings",label:"Meetings",icon:Video}] },
  { label:"HR", items:[{id:"attendance",label:"Attendance",icon:Clock},{id:"leave",label:"Leave",icon:PlaneTakeoff},{id:"payroll",label:"Payroll",icon:DollarSign},{id:"payslip",label:"Payslip",icon:Receipt},{id:"payroll-expenses",label:"Expenses",icon:BarChart3},{id:"expense-claims",label:"Expense Claims",icon:Receipt},{id:"expense-log",label:"Expense Log",icon:Wallet}] },
  { label:"Analytics", items:[{id:"kpi",label:"KPI",icon:Target},{id:"okr",label:"OKR",icon:Zap},{id:"analytics",label:"Analytics",icon:BarChart3},{id:"reports",label:"Reports",icon:FileBarChart}] },
  { label:"Workspace", items:[{id:"knowledge",label:"Knowledge Base",icon:BookOpen},{id:"notifications",label:"Notifications",icon:Bell},{id:"eod",label:"EOD Report",icon:FileText}] },
  { label:"Admin", items:[{id:"settings",label:"Settings",icon:Settings},{id:"roles",label:"Roles & Permissions",icon:ShieldCheck},{id:"audit",label:"Audit Logs",icon:Activity},{id:"billing",label:"Billing",icon:CreditCard}] },
];

function Sidebar({ activePage, onNavigate, collapsed, onToggle }: { activePage: Page; onNavigate:(p:Page)=>void; collapsed:boolean; onToggle:()=>void }) {
  const { authUser, logout } = useAuth();
  const perms = authUser?.permissions || ["*"];
  // Vignesh is locked to Calendar + Expense Log only, regardless of whatever
  // his role would otherwise grant. "expense-log" itself is scoped to him
  // specifically (or super_admin) rather than living in the permissions
  // system — see canSubmitOpsExpense in src/lib/auth.ts, the real
  // server-side enforcement of both of these rules.
  const isVignesh = authUser?.email === VIGNESH_EMAIL;
  const hasAccess = (id: string) => {
    if (isVignesh) return id === "calendar" || id === "expense-log";
    if (id === "expense-log") return authUser?.role === "super-admin";
    // Every employee can see their own Payslip page regardless of role permissions.
    if (id === "payslip") return true;
    return perms.includes("*") || perms.includes(id);
  };
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const load = () => fetch("/api/notifications").then(r => r.json()).then(d => setUnreadCount((d.notifications ?? []).filter((n:any)=>!n.read).length)).catch(()=>{});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [activePage]);
  return (
    <aside className={`flex flex-col h-full flex-shrink-0 transition-all duration-300 ${collapsed?"w-16":"w-60"}`}
      style={{ background:DARK.sidebar, borderRight:"1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0"><Layers size={16} className="text-white"/></div>
        {!collapsed && <span className="text-base font-bold text-white tracking-tight">RIAURA</span>}
        <button onClick={onToggle} className={`text-slate-500 hover:text-slate-300 transition-colors ${collapsed?"mx-auto":"ml-auto"}`}><Menu size={16}/></button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(item => hasAccess(item.id));
          if (!visibleItems.length) return null;
          return (
            <div key={group.label}>
              {!collapsed && <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 mb-1">{group.label}</p>}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const Icon = item.icon; const isActive = activePage===item.id;
                  return (
                    <button key={item.id} onClick={()=>onNavigate(item.id as Page)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors group relative ${isActive?"bg-indigo-600/20 text-indigo-400":"text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"} ${collapsed?"justify-center":""}`}>
                      <Icon size={16} className={`flex-shrink-0 ${isActive?"text-indigo-400":"text-slate-500 group-hover:text-slate-300"}`}/>
                      {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
                      {!collapsed && item.id==="notifications" && unreadCount>0 && <span className="text-[10px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5 font-semibold">{unreadCount}</span>}
                      {isActive && !collapsed && <div className="w-1 h-1 rounded-full bg-indigo-400 absolute right-2.5"/>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-white/[0.06]">
        {!collapsed && authUser && (
          <div className="px-2 pb-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${roleConfig[authUser.role].bg} ${roleConfig[authUser.role].color}`}>{authUser.roleLabel}</span>
            </div>
          </div>
        )}
        <button onClick={logout} title="Sign out" className={`w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors ${collapsed?"justify-center":""}`}>
          <div className={`w-7 h-7 rounded-full ${authUser?.avatarColor||"bg-indigo-600"} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>{authUser?.avatar||"?"}</div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">{authUser?.name||""}</div>
                <div className="text-[10px] text-slate-500 truncate">{authUser?.title||"Admin"}</div>
              </div>
              <LogOut size={14} className="text-slate-600 hover:text-red-400 flex-shrink-0"/>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

function GlobalSearch({ onNavigate }: { onNavigate:(p:Page)=>void }) {
  const { c } = useTheme();
  const { setSelectedEmployeeId } = useApp();
  const { openModal } = useModal();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{people:any[];projects:any[];tasks:any[]}>({ people: [], projects: [], tasks: [] });
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults({ people: [], projects: [], tasks: [] }); return; }
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()).then(setResults).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const goToPerson = (id: number) => { setSelectedEmployeeId(id); onNavigate("employee-profile"); setOpen(false); };
  const goToProject = () => { onNavigate("projects"); setOpen(false); };
  const goToTask = (id: number) => { onNavigate("tasks"); openModal("task-detail", { taskId: id }); setOpen(false); };

  const q = query.trim();
  const hasResults = results.people.length || results.projects.length || results.tasks.length;

  return (
    <div className="flex-1 max-w-sm mx-auto" ref={wrapRef}>
      <div className="relative">
        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${c("text-slate-500","text-slate-400")}`}/>
        <input ref={inputRef} value={query} onChange={e=>{ setQuery(e.target.value); setOpen(true); }} onFocus={()=>setOpen(true)}
          className={`w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none transition-colors ${c("bg-slate-800/60 border-white/[0.08] text-slate-300 placeholder-slate-600 focus:border-indigo-500/50","bg-slate-100 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-400")}`}
          placeholder="Search people, projects, tasks..."/>
        {!query && <kbd className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border ${c("text-slate-600 bg-slate-800 border-white/[0.06]","text-slate-400 bg-white border-slate-200")}`}>⌘K</kbd>}
        {open && q.length >= 2 && (
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl max-h-96 overflow-y-auto z-50 ${c("bg-slate-800 border-white/[0.08]","bg-white border-slate-200")}`}>
            {!hasResults && <p className={`text-xs p-4 ${c("text-slate-500","text-slate-400")}`}>No results for "{q}"</p>}
            {results.people.length > 0 && (
              <div className="p-2">
                <p className={`text-[10px] uppercase tracking-wide px-2 py-1 ${c("text-slate-500","text-slate-400")}`}>People</p>
                {results.people.map((p:any)=>(
                  <button key={p.id} onClick={()=>goToPerson(p.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${c("hover:bg-slate-700/60","hover:bg-slate-50")}`}>
                    <Avatar initials={p.avatar} color={p.avatarColor} size="sm"/>
                    <div className="min-w-0"><p className={`text-sm truncate ${c("text-slate-200","text-slate-800")}`}>{p.name}</p><p className={`text-[11px] truncate ${c("text-slate-500","text-slate-400")}`}>{p.title}</p></div>
                  </button>
                ))}
              </div>
            )}
            {results.projects.length > 0 && (
              <div className={`p-2 border-t ${c("border-white/[0.06]","border-slate-100")}`}>
                <p className={`text-[10px] uppercase tracking-wide px-2 py-1 ${c("text-slate-500","text-slate-400")}`}>Projects</p>
                {results.projects.map((p:any)=>(
                  <button key={p.id} onClick={goToProject} className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left ${c("hover:bg-slate-700/60","hover:bg-slate-50")}`}>
                    <span className={`text-sm truncate ${c("text-slate-200","text-slate-800")}`}>{p.name}</span>
                    <StatusBadge status={p.status}/>
                  </button>
                ))}
              </div>
            )}
            {results.tasks.length > 0 && (
              <div className={`p-2 border-t ${c("border-white/[0.06]","border-slate-100")}`}>
                <p className={`text-[10px] uppercase tracking-wide px-2 py-1 ${c("text-slate-500","text-slate-400")}`}>Tasks</p>
                {results.tasks.map((t:any)=>(
                  <button key={t.id} onClick={()=>goToTask(t.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${c("hover:bg-slate-700/60","hover:bg-slate-50")}`}>
                    <PriorityBadge priority={t.priority}/>
                    <span className={`text-sm truncate ${c("text-slate-200","text-slate-800")}`}>{t.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar({ activePage, onNavigate, onToggleTheme }: { activePage: Page; onNavigate:(p:Page)=>void; onToggleTheme:()=>void }) {
  const { c, light } = useTheme();
  const { authUser, logout } = useAuth();
  const label = navGroups.flatMap(g=>g.items).find(i=>i.id===activePage)?.label||"Dashboard";
  return (
    <header className="h-14 flex items-center gap-4 px-6 flex-shrink-0"
      style={{ background:light?LIGHT.topbar:DARK.topbar, borderBottom:light?"1px solid #E2E8F0":"1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 text-sm">
        <span className={c("text-slate-500","text-slate-400")}>RIAURA</span>
        <ChevronRight size={14} className={c("text-slate-700","text-slate-300")}/>
        <span className={`font-medium ${c("text-slate-200","text-slate-800")}`}>{label}</span>
      </div>
      <GlobalSearch onNavigate={onNavigate}/>
      <div className="flex items-center gap-2 ml-auto">
        <Btn variant="secondary" size="sm" icon={Plus}>New</Btn>
        {/* Theme Toggle */}
        <button onClick={onToggleTheme}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${c("text-slate-400 hover:text-slate-200 hover:bg-slate-700/60","text-slate-500 hover:text-slate-700 hover:bg-slate-100")}`}
          title={light?"Switch to Dark":"Switch to Light"}>
          {light?<Moon size={16}/>:<Sun size={16}/>}
        </button>
        <button onClick={()=>onNavigate("notifications")} className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${c("text-slate-400 hover:text-slate-200 hover:bg-slate-700/60","text-slate-500 hover:text-slate-700 hover:bg-slate-100")}`}>
          <Bell size={16}/><span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border-2" style={{ borderColor:light?LIGHT.topbar:DARK.topbar }}/>
        </button>
        <button onClick={()=>onNavigate("profile")} className={`w-8 h-8 rounded-full ${authUser?.avatarColor||"bg-indigo-600"} flex items-center justify-center text-xs font-bold text-white`}>{authUser?.avatar||"SJ"}</button>
        {authUser && (
          <button onClick={logout} title="Sign out"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${c("text-slate-400 hover:text-red-400 hover:bg-red-500/10","text-slate-500 hover:text-red-500 hover:bg-red-50")}`}>
            <LogOut size={15}/>
          </button>
        )}
      </div>
    </header>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { c, light } = useTheme();
  const { authUser } = useAuth();
  const { setSelectedEmployeeId, navigateTo } = useApp();
  const isAdmin = authUser?.role === "super-admin";
  const col = light?LIGHT:DARK;
  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const firstName = authUser?.name.split(" ")[0] || "there";
  const [stats, setStats] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const [showPresence, setShowPresence] = useState(false);
  const [presenceList, setPresenceList] = useState<any[] | null>(null);
  useEffect(() => { fetch("/api/dashboard/stats").then(r => r.json()).then(setStats); }, []);
  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => setMyTasks((d.tasks ?? []).filter((t: any) => t.assignee === authUser?.name)));
  }, [authUser]);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const openPresence = () => {
    if (!isAdmin) return;
    setShowPresence(true);
    if (!presenceList) {
      fetch("/api/attendance").then(r => r.json()).then(d => {
        const rows = (d.todayAll ?? []).slice().sort((a: any, b: any) => Number(b.status !== "absent" && b.status !== "not-punched-in") - Number(a.status !== "absent" && a.status !== "not-punched-in"));
        setPresenceList(rows);
      });
    }
  };
  const openEmployeeFromPresence = (id: number) => {
    setShowPresence(false);
    setSelectedEmployeeId(id);
    navigateTo("employee-profile");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${c("text-white","text-slate-900")}`}>{greeting}, {firstName}! 👋</h1>
          <p className={`text-sm mt-1 ${c("text-slate-400","text-slate-500")}`}>Here's what's happening across your organization today.</p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${c("text-slate-200","text-slate-700")}`}>{now.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric",year:"numeric",timeZone:"Asia/Kolkata"})}</div>
          <div className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"})} IST</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Employees" value={stats ? String(stats.totalEmployees) : "…"} icon={Users} iconColor="bg-indigo-600/40" trend="up" onClick={isAdmin ? openPresence : undefined}/>
        <StatCard label="Present Today" value={stats ? String(stats.presentToday) : "…"} change={stats ? `${stats.presentPct}%` : undefined} changeLabel=" attendance" icon={CheckCircle2} iconColor="bg-emerald-600/40" trend="up" onClick={isAdmin ? openPresence : undefined}/>
        <StatCard label="Active Projects" value={stats ? String(stats.activeProjects) : "…"} icon={FolderKanban} iconColor="bg-violet-600/40" trend="up"/>
        <StatCard label="Task Completion" value={stats ? `${stats.taskCompletionPct}%` : "…"} icon={TrendingUp} iconColor="bg-amber-600/40" trend="up"/>
        <StatCard label="Overdue Tasks" value={stats ? String(stats.overdueTasks) : "…"} icon={AlertCircle} iconColor="bg-red-600/40" trend={stats?.overdueTasks > 0 ? "down" : "up"}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Task Status</h3>
            <Badge variant="info">{stats?.totalTasks ?? 0} Total</Badge>
          </div>
          {!stats?.totalTasks ? <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No tasks created yet.</p> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stats.taskStatusBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {stats.taskStatusBreakdown.map((entry:any,i:number)=><Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip content={(p:any)=><ChartTip {...p} light={light}/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {stats.taskStatusBreakdown.map((d:any)=>(
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background:d.color }}/><span className={c("text-slate-400","text-slate-500")}>{d.name}</span></div>
                    <span className={`font-semibold ${c("text-slate-200","text-slate-700")}`}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>My Tasks</h3>
            <Badge variant="default">{myTasks.filter((t:any)=>t.status!=="done").length} open</Badge>
          </div>
          {myTasks.length===0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No tasks assigned to you yet.</p>}
          <div className="space-y-2.5">
            {myTasks.slice(0,5).map((t:any)=>(
              <div key={t.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${c("hover:bg-slate-700/30","hover:bg-slate-50")} transition-colors cursor-pointer`}>
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${t.priority==="critical"?"bg-red-500":t.priority==="high"?"bg-amber-500":"bg-indigo-500"}`}/>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${c("text-slate-200","text-slate-700")}`}>{t.title}</p>
                  <p className={`text-[10px] mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{t.project}</p>
                </div>
                <span className={`text-[10px] flex-shrink-0 ${c("text-slate-600","text-slate-400")}`}>{t.due.split(",")[0]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Task Status by Department</h3>
            <p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>Real-time breakdown of all tasks</p>
          </div>
        </div>
        {!stats?.taskStatusByDept?.length ? <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No tasks assigned to any department yet.</p> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.taskStatusByDept} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={col.chartGrid}/>
              <XAxis dataKey="dept" tick={{ fill:col.tickColor, fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:col.tickColor, fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip content={(p:any)=><ChartTip {...p} light={light}/>}/>
              <Legend wrapperStyle={{ fontSize:11, color:col.tickColor }}/>
              <Bar key="dash-todo" dataKey="todo" name="To Do" fill="#64748B" radius={[4,4,0,0]}/>
              <Bar key="dash-inprogress" dataKey="in-progress" name="In Progress" fill="#4F46E5" radius={[4,4,0,0]}/>
              <Bar key="dash-review" dataKey="review" name="In Review" fill="#F59E0B" radius={[4,4,0,0]}/>
              <Bar key="dash-done" dataKey="done" name="Done" fill="#22C55E" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {showPresence && (
        <ModalOverlay
          title="Employee Attendance Today"
          subtitle={presenceList ? `${presenceList.filter((e:any)=>e.status!=="absent"&&e.status!=="not-punched-in").length} of ${presenceList.length} present` : undefined}
          onClose={() => setShowPresence(false)}
          size="md"
        >
          {!presenceList ? (
            <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Loading…</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {presenceList.map((e: any) => (
                <div key={e.id} onClick={() => openEmployeeFromPresence(e.id)} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${c("hover:bg-slate-800/60","hover:bg-slate-50")}`}>
                  <Avatar initials={e.avatar} color={e.avatarColor} size="sm"/>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${c("text-slate-200","text-slate-800")}`}>{e.name}</p>
                    <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{e.dept}</p>
                  </div>
                  {e.status==="present" && <Badge variant="success">Present</Badge>}
                  {e.status==="late" && <Badge variant="warning">Late</Badge>}
                  {e.status==="absent" && <Badge variant="danger">Absent</Badge>}
                  {e.status==="not-punched-in" && <Badge variant="default">Not In</Badge>}
                </div>
              ))}
            </div>
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────

function EmployeesPage() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const { setSelectedEmployeeId, navigateTo } = useApp();
  const [view, setView] = useState<"grid"|"table">("grid");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (activeModal === "add-employee") return; // refetch after it closes, not while open
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []));
  }, [activeModal]);

  const depts = ["All",...Array.from(new Set(employees.map((e: any)=>e.dept)))];
  const filtered = employees.filter((e: any)=>(deptFilter==="All"||e.dept===deptFilter)&&(e.name.toLowerCase().includes(search.toLowerCase())||e.role.toLowerCase().includes(search.toLowerCase())));
  const openProfile = (emp: any) => { setSelectedEmployeeId(emp.id); navigateTo("employee-profile"); };

  return (
    <div>
      <PageHeader title="Employee Directory" subtitle={`${filtered.length} employees`}
        actions={<><Btn variant="secondary" size="sm" icon={Download} onClick={()=>window.location.href="/api/reports/export?type=headcount"}>Export</Btn><Btn size="sm" icon={Plus} onClick={()=>openModal("add-employee")}>Add Employee</Btn></>}/>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${c("text-slate-500","text-slate-400")}`}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or role..."
            className={`w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none ${c("bg-slate-800/60 border-white/[0.08] text-slate-300 placeholder-slate-600 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-400")}`}/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {depts.map(d=><button key={d} onClick={()=>setDeptFilter(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${deptFilter===d?"bg-indigo-600 text-white":c("bg-slate-800/60 border border-white/[0.08] text-slate-400 hover:text-slate-200","bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50")}`}>{d}</button>)}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={()=>setView("grid")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${view==="grid"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><Grid3X3 size={15}/></button>
          <button onClick={()=>setView("table")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${view==="table"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><List size={15}/></button>
        </div>
      </div>

      {view==="grid"?(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp=>(
            <Card key={emp.id} className="p-4 cursor-pointer transition-all hover:-translate-y-0.5" onClick={()=>openProfile(emp)}>
              <div className="flex items-start gap-3 mb-3">
                <Avatar initials={emp.avatar} color={emp.avatarColor} size="lg"/>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${c("text-white","text-slate-900")}`}>{emp.name}</p>
                  <p className={`text-xs truncate mt-0.5 ${c("text-slate-400","text-slate-500")}`}>{emp.role}</p>
                </div>
                <StatusBadge status={emp.status}/>
              </div>
              <div className={`space-y-1.5 text-xs ${c("text-slate-500","text-slate-400")}`}>
                <div className="flex items-center gap-2"><Building2 size={12}/>{emp.dept}</div>
                <div className="flex items-center gap-2"><Mail size={12}/><span className="truncate">{emp.email}</span></div>
                <div className="flex items-center gap-2"><MapPin size={12}/>{emp.location}</div>
              </div>
              <div className={`mt-3 pt-3 border-t ${c("border-white/[0.06]","border-slate-100")} flex items-center justify-between`}>
                <span className={`text-[10px] ${c("text-slate-600","text-slate-400")}`}>Attendance</span>
                <span className={`text-xs font-semibold ${emp.attendance>=95?"text-emerald-500":emp.attendance>=85?"text-amber-500":"text-red-500"}`}>{emp.attendance}%</span>
              </div>
            </Card>
          ))}
        </div>
      ):(
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>
                {["Employee","Department","Role","Location","Status","Attendance","Joined","Actions"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(emp=>(
                  <tr key={emp.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")} transition-colors cursor-pointer`} onClick={()=>openProfile(emp)}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar initials={emp.avatar} color={emp.avatarColor} size="sm"/><div><p className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{emp.name}</p><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{emp.email}</p></div></div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{emp.dept}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{emp.role}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{emp.location}</td>
                    <td className="px-4 py-3"><StatusBadge status={emp.status}/></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={emp.attendance} color={emp.attendance>=95?"bg-emerald-500":emp.attendance>=85?"bg-amber-500":"bg-red-500"}/><span className={`text-xs w-10 ${c("text-slate-400","text-slate-500")}`}>{emp.attendance}%</span></div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-500","text-slate-400")}`}>{emp.joined}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-500 hover:text-slate-300 hover:bg-slate-700","text-slate-400 hover:text-slate-600 hover:bg-slate-100")}`}><Eye size={13}/></button>
                      <button className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-500 hover:text-slate-300 hover:bg-slate-700","text-slate-400 hover:text-slate-600 hover:bg-slate-100")}`}><Edit2 size={13}/></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────

function DepartmentsPage() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (activeModal === "add-department" || activeModal === "department-detail") return;
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? []));
  }, [activeModal]);

  return (
    <div>
      <PageHeader title="Departments" subtitle="Manage organization structures and budgets" actions={<Btn size="sm" icon={Plus} onClick={()=>openModal("add-department")}>New Department</Btn>}/>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {departments.map((dept: any)=>(
          <Card key={dept.id} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5" onClick={()=>openModal("department-detail",{dept})}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${dept.color} flex items-center justify-center`}><Building2 size={18} className="text-white"/></div>
              <div><h3 className={`font-semibold text-sm ${c("text-white","text-slate-900")}`}>{dept.name}</h3><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{dept.employees} employees</p></div>
            </div>
            <div className="space-y-2 text-xs">
              {[["Head",dept.head],["Projects",`${dept.projects} active`],["Budget",`₹${(dept.budget/1000000).toFixed(1)}M`]].map(([label,val])=>(
                <div key={label as string} className="flex justify-between"><span className={c("text-slate-500","text-slate-400")}>{label}</span><span className={`font-medium ${c("text-slate-300","text-slate-600")}`}>{val}</span></div>
              ))}
              <div className="mt-2">
                <div className="flex justify-between mb-1"><span className={c("text-slate-500","text-slate-400")}>Utilization</span><span className={`font-semibold ${dept.utilization>=85?"text-emerald-500":dept.utilization>=70?"text-amber-500":"text-red-500"}`}>{dept.utilization}%</span></div>
                <ProgressBar value={dept.utilization} color={dept.utilization>=85?"bg-emerald-500":dept.utilization>=70?"bg-amber-500":"bg-red-500"}/>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TEAMS ────────────────────────────────────────────────────────────────────

function TeamsPage() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [view, setView] = useState<"teams"|"org">("teams");

  useEffect(() => {
    if (activeModal === "create-team") return;
    fetch("/api/teams").then(r => r.json()).then(d => setTeamsData(d.teams ?? []));
  }, [activeModal]);

  return (
    <div>
      <PageHeader title="Teams" subtitle={view==="teams" ? `${teamsData.length} active teams` : "Reporting structure across the organization"}
        actions={<>
          <div className="flex gap-1">
            <button onClick={()=>setView("teams")} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${view==="teams"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}>Teams</button>
            <button onClick={()=>setView("org")} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${view==="org"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}>Org Chart</button>
          </div>
          {view==="teams" && <Btn size="sm" icon={Plus} onClick={()=>openModal("create-team")}>Create Team</Btn>}
        </>}/>
      {view==="teams" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamsData.map((team: any)=>(
            <Card key={team.id} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-4"><div><h3 className={`font-semibold text-sm ${c("text-white","text-slate-900")}`}>{team.name}</h3><p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{team.dept}</p></div><Badge variant="info">{team.projects} projects</Badge></div>
              <div className="flex items-center gap-2 mb-4"><Avatar initials={team.leadAvatar} color={team.leadColor} size="sm"/><div><p className={`text-xs font-medium ${c("text-slate-300","text-slate-700")}`}>{team.lead}</p><p className={`text-[10px] ${c("text-slate-600","text-slate-400")}`}>Team Lead</p></div></div>
              <div className="flex items-center gap-1 mb-4">
                {team.members.slice(0,4).map((m: any,i: number)=><div key={i} className={`w-7 h-7 rounded-full ${m.c} flex items-center justify-center text-[10px] font-bold text-white border-2 ${c("border-slate-800","border-white")} -ml-1 first:ml-0`}>{m.i}</div>)}
                {team.size>5 && <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 -ml-1 ${c("bg-slate-700 text-slate-400 border-slate-800","bg-slate-100 text-slate-500 border-white")}`}>+{team.size-5}</div>}
                <span className={`ml-2 text-xs ${c("text-slate-500","text-slate-400")}`}>{team.size} members</span>
              </div>
              <div><div className="flex justify-between text-xs mb-1"><span className={c("text-slate-500","text-slate-400")}>Velocity</span><span className={`font-semibold ${team.velocity>=85?"text-emerald-500":"text-amber-500"}`}>{team.velocity}%</span></div><ProgressBar value={team.velocity} color={team.velocity>=85?"bg-emerald-500":"bg-amber-500"}/></div>
            </Card>
          ))}
        </div>
      ) : <OrgChartView/>}
    </div>
  );
}

function OrgChartView() {
  const { c } = useTheme();
  const { activeModal } = useModal();
  const [roots, setRoots] = useState<any[]>([]);
  const [version, setVersion] = useState(0);
  const employees = useEmployeeDirectory();

  useEffect(() => {
    if (activeModal === "add-employee") return;
    fetch("/api/org-chart").then(r => r.json()).then(d => setRoots(d.roots ?? []));
  }, [activeModal, version]);

  return (
    <Card className="p-5">
      {roots.length===0
        ? <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>No employees yet.</p>
        : <div className="space-y-0.5">{roots.map((n:any)=><OrgNode key={n.id} node={n} employees={employees} onChange={()=>setVersion(v=>v+1)}/>)}</div>}
    </Card>
  );
}

function OrgNode({ node, employees, onChange }: { node: any; employees: any[]; onChange: () => void }) {
  const { c } = useTheme();
  const { openModal } = useModal();
  const [expanded, setExpanded] = useState(true);
  const [changingManager, setChangingManager] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changeManager = async (managerName: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/employees/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manager: managerName === "__none__" ? "" : managerName }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not change manager."); return; }
      setChangingManager(false);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 py-1.5 group">
        {node.reports.length > 0
          ? <button onClick={()=>setExpanded(e=>!e)} className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${c("text-slate-500","text-slate-400")}`}>{expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>
          : <span className="w-5 flex-shrink-0"/>}
        <Avatar initials={node.avatar} color={node.avatarColor} size="sm"/>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${c("text-slate-200","text-slate-800")}`}>{node.name}</p>
          <p className={`text-[11px] truncate ${c("text-slate-500","text-slate-400")}`}>{node.title}{node.dept ? ` · ${node.dept}` : ""}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button title="Add direct report" onClick={()=>openModal("add-employee",{defaultManager: node.name})} className={`w-6 h-6 rounded flex items-center justify-center ${c("text-slate-500 hover:text-indigo-400 hover:bg-slate-700/60","text-slate-400 hover:text-indigo-500 hover:bg-slate-100")}`}><Plus size={13}/></button>
          <button title="Change manager" onClick={()=>setChangingManager(v=>!v)} className={`w-6 h-6 rounded flex items-center justify-center ${c("text-slate-500 hover:text-indigo-400 hover:bg-slate-700/60","text-slate-400 hover:text-indigo-500 hover:bg-slate-100")}`}><Edit2 size={12}/></button>
        </div>
      </div>
      {changingManager && (
        <div className="flex items-center gap-2 pb-2 pl-7">
          <FSelect value="" onChange={changeManager} className="max-w-[220px]">
            <option value="" disabled>Move under...</option>
            <option value="__none__">None (Top-level)</option>
            {employees.filter((e:any)=>e.id!==node.id).map((e:any)=><option key={e.id} value={e.name}>{e.name}</option>)}
          </FSelect>
          {busy && <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Saving...</span>}
        </div>
      )}
      {error && <p className="text-xs text-red-400 pl-7 pb-1">{error}</p>}
      {expanded && node.reports.length > 0 && (
        <div className={`ml-2.5 pl-4 border-l ${c("border-white/10","border-slate-200")}`}>
          {node.reports.map((r:any)=><OrgNode key={r.id} node={r} employees={employees} onChange={onChange}/>)}
        </div>
      )}
    </div>
  );
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

function ProjectsPage() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const [projects, setProjects] = useState<any[]>([]);
  const statuses = ["planning","in-progress","review","completed"];

  useEffect(() => {
    if (activeModal === "create-project") return;
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? []));
  }, [activeModal]);

  return (
    <div>
      <PageHeader title="Projects" subtitle={`${projects.length} total projects`}
        actions={<><div className="flex gap-1"><button onClick={()=>setView("kanban")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${view==="kanban"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><GripVertical size={15}/></button><button onClick={()=>setView("list")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${view==="list"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><List size={15}/></button></div><Btn size="sm" icon={Plus} onClick={()=>openModal("create-project")}>New Project</Btn></>}/>
      {view==="kanban"?(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statuses.map(status=>{
            const sp=projects.filter(p=>p.status===status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><StatusBadge status={status}/><span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{sp.length}</span></div><button className={`w-6 h-6 rounded flex items-center justify-center ${c("text-slate-600 hover:bg-slate-700","text-slate-400 hover:bg-slate-100")}`}><Plus size={13}/></button></div>
                {sp.map(p=>(
                  <Card key={p.id} className="p-4 cursor-pointer transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-2"><h4 className={`text-sm font-medium leading-snug ${c("text-white","text-slate-900")}`}>{p.name}</h4><PriorityBadge priority={p.priority}/></div>
                    <p className={`text-xs mb-3 flex items-center gap-1 ${c("text-slate-500","text-slate-400")}`}><Users size={11}/>{p.team} members · {p.tasks} tasks</p>
                    <ProgressBar value={p.progress}/>
                    <div className="flex items-center justify-between mt-2"><span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{p.progress}% done</span><span className={`text-[10px] ${c("text-slate-600","text-slate-400")}`}>{p.deadline}</span></div>
                    <div className={`mt-3 pt-3 border-t ${c("border-white/[0.06]","border-slate-100")} flex items-center justify-between text-xs ${c("text-slate-500","text-slate-400")}`}><span>₹{(p.spent/1000).toFixed(0)}K spent</span><span>₹{(p.budget/1000).toFixed(0)}K budget</span></div>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      ):(
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Project","Status","Priority","Progress","Team","Budget","Deadline"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
              <tbody>
                {projects.map(p=>(
                  <tr key={p.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")} cursor-pointer`}>
                    <td className="px-4 py-3"><p className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{p.name}</p><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{p.manager}</p></td>
                    <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                    <td className="px-4 py-3"><PriorityBadge priority={p.priority}/></td>
                    <td className="px-4 py-3 w-36"><div className="flex items-center gap-2"><ProgressBar value={p.progress}/><span className={`text-xs w-8 ${c("text-slate-400","text-slate-500")}`}>{p.progress}%</span></div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{p.team}</td>
                    <td className="px-4 py-3"><p className={`text-sm ${c("text-slate-300","text-slate-700")}`}>₹{(p.budget/1000).toFixed(0)}K</p><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>₹{(p.spent/1000).toFixed(0)}K spent</p></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{p.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── TASKS ────────────────────────────────────────────────────────────────────

const TASK_ADMIN_UI_ROLES = ["super-admin", "manager", "1st-level-manager", "2nd-level-manager", "team-lead"];
function canDragTask(task: any, authUser: AuthUser | null) {
  return authUser?.id === task.assigneeId || authUser?.id === task.assignedById || TASK_ADMIN_UI_ROLES.includes(authUser?.role ?? "");
}

function DraggableTaskCard({ task, canDrag, onClick, children }: { task: any; canDrag: boolean; onClick: () => void; children: React.ReactNode }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: TASK_DRAG_TYPE,
    item: { id: task.id },
    canDrag,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [task.id, canDrag]);
  return <div ref={dragRef as any} onClick={onClick} style={{ opacity: isDragging ? 0.4 : 1 }} className={canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}>{children}</div>;
}

function TaskDropColumn({ status, onDropTask, children }: { status: string; onDropTask: (taskId: number, status: string) => void; children: React.ReactNode }) {
  const onDropTaskRef = useRef(onDropTask);
  onDropTaskRef.current = onDropTask;
  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept: TASK_DRAG_TYPE,
    drop: (item: { id: number }) => onDropTaskRef.current(item.id, status),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }), [status]);
  return <div ref={dropRef as any} className={`space-y-3 rounded-xl transition-colors flex-1 min-h-[140px] ${isOver && canDrop ? "bg-indigo-500/10 ring-2 ring-indigo-500/40" : ""}`}>{children}</div>;
}

function TasksPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { openModal, activeModal } = useModal();
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const [tasks, setTasks] = useState<any[]>([]);
  const [dropError, setDropError] = useState("");
  const columns = [{id:"todo",label:"To Do",border:c("border-slate-600","border-slate-300")},{id:"in-progress",label:"In Progress",border:"border-indigo-500"},{id:"review",label:"In Review",border:"border-amber-500"},{id:"done",label:"Done",border:"border-emerald-500"}];

  const load = () => fetch("/api/tasks").then(r => r.json()).then(d => setTasks(d.tasks ?? []));
  useEffect(() => {
    if (activeModal === "create-task" || activeModal === "task-detail") return;
    load();
  }, [activeModal]);

  const openTask = (id: number) => openModal("task-detail", { taskId: id });

  const dropTask = async (taskId: number, status: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === status) return;
    setDropError("");
    const prev = tasks;
    setTasks(p => p.map(t => t.id === taskId ? { ...t, status } : t));
    const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) {
      setTasks(prev);
      const d = await res.json().catch(() => ({}));
      setDropError(d.error || "Could not update task status.");
    }
  };

  return (
    <div>
      <PageHeader title="Tasks" subtitle={`${tasks.length} total tasks`}
        actions={<><div className="flex gap-1"><button onClick={()=>setView("kanban")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${view==="kanban"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><GripVertical size={15}/></button><button onClick={()=>setView("list")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${view==="list"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><List size={15}/></button></div><Btn size="sm" icon={Plus} onClick={()=>openModal("create-task")}>New Task</Btn></>}/>
      {dropError && <p className="text-xs text-red-400 mb-3">{dropError}</p>}
      {view==="kanban"?(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map(col=>{
            const colTasks=tasks.filter(t=>t.status===col.id);
            return (
              <div key={col.id} className="flex flex-col">
                <div className="flex items-center gap-2 px-1 mb-3"><div className={`w-3 h-3 rounded-sm border-2 ${col.border}`}/><span className={`text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{col.label}</span><span className={`text-xs px-1.5 py-0.5 rounded ${c("text-slate-600 bg-slate-800","text-slate-500 bg-slate-100")}`}>{colTasks.length}</span></div>
                <TaskDropColumn status={col.id} onDropTask={dropTask}>
                  {colTasks.map(task=>(
                    <DraggableTaskCard key={task.id} task={task} canDrag={canDragTask(task, authUser)} onClick={()=>openTask(task.id)}>
                      <Card className="p-3.5 transition-all hover:-translate-y-0.5">
                        <div className="flex items-start justify-between gap-2 mb-2"><p className={`text-xs font-medium leading-relaxed ${c("text-slate-200","text-slate-800")}`}>{task.title}</p><PriorityBadge priority={task.priority}/></div>
                        <p className={`text-[10px] mb-3 ${c("text-slate-500","text-slate-400")}`}>{task.project}</p>
                        <div className="flex items-center gap-1 mb-3 flex-wrap">{task.tags.map((tag:string)=><span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${c("bg-slate-700 text-slate-400","bg-slate-100 text-slate-500")}`}>{tag}</span>)}</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5"><div className={`w-5 h-5 rounded-full ${task.assigneeColor} flex items-center justify-center text-[8px] font-bold text-white`}>{task.assigneeAvatar}</div><span className={`text-[10px] ${c("text-slate-500","text-slate-400")}`}>{task.assignee.split(" ")[0]}</span></div>
                          <span className={`text-[10px] ${c("text-slate-600","text-slate-400")}`}>{task.due}</span>
                        </div>
                        {task.assignedBy && <p className={`text-[9px] mt-2 pt-2 border-t ${c("border-white/[0.06] text-slate-600","border-slate-100 text-slate-400")}`}>Assigned by {task.assignedBy}</p>}
                      </Card>
                    </DraggableTaskCard>
                  ))}
                </TaskDropColumn>
              </div>
            );
          })}
        </div>
      ):(
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Task","Project","Assignee","Assigned By","Priority","Status","Due Date"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
              <tbody>
                {tasks.map(t=>(
                  <tr key={t.id} onClick={()=>openTask(t.id)} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")} cursor-pointer`}>
                    <td className="px-4 py-3"><p className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{t.title}</p><div className="flex gap-1 mt-1">{t.tags.map((tag:string)=><span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${c("bg-slate-700 text-slate-400","bg-slate-100 text-slate-500")}`}>{tag}</span>)}</div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{t.project}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full ${t.assigneeColor} flex items-center justify-center text-[9px] font-bold text-white`}>{t.assigneeAvatar}</div><span className={`text-xs ${c("text-slate-400","text-slate-500")}`}>{t.assignee}</span></div></td>
                    <td className={`px-4 py-3 text-xs ${c("text-slate-400","text-slate-500")}`}>{t.assignedBy || "—"}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority}/></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status}/></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{t.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────

const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];

function CalendarPage() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth()+1 });
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (activeModal === "create-event") return;
    fetch(`/api/calendar?year=${cursor.year}&month=${cursor.month}`).then(r => r.json()).then(setData);
  }, [cursor, activeModal]);

  if (!data) return null;
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth()+1;
  const shiftMonth = (delta: number) => setCursor(({ year, month }) => {
    const d = new Date(year, month-1+delta, 1);
    return { year: d.getFullYear(), month: d.getMonth()+1 };
  });
  const nextHoliday = data.upcoming.find((e:any)=>e.type==="holiday");
  const awayLabel = (n:number) => n===0?"Today!":n===1?"Tomorrow":`In ${n} days`;
  // Header row is Mon-first; getDay() is Sun-first (0-6). Convert so Monday -> 0
  // leading blanks, ..., Sunday -> 6. A fixed single blank cell here previously
  // misaligned every month whose 1st wasn't a Tuesday.
  const firstDow = new Date(data.year, data.month-1, 1).getDay();
  const leadingBlanks = (firstDow + 6) % 7;

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Manage your schedule and events" actions={<Btn size="sm" icon={Plus} onClick={()=>openModal("create-event")}>New Event</Btn>}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5"><h3 className={`font-semibold ${c("text-white","text-slate-900")}`}>{MONTH_NAMES[cursor.month-1]} {cursor.year}</h3><div className="flex gap-1"><button onClick={()=>shiftMonth(-1)} className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-400 hover:bg-slate-700","text-slate-500 hover:bg-slate-100")}`}><ChevronLeft size={15}/></button><button onClick={()=>shiftMonth(1)} className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-400 hover:bg-slate-700","text-slate-500 hover:bg-slate-100")}`}><ChevronRight size={15}/></button></div></div>
          <div className="grid grid-cols-7 mb-2">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} className={`text-center text-xs font-medium py-1 ${c("text-slate-500","text-slate-400")}`}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length:leadingBlanks},(_,i)=><div key={`blank-${i}`}/>)}
            {Array.from({length:data.daysInMonth},(_,i)=>{
              const day=i+1,dayEvents=data.events.filter((e:any)=>e.day===day),isToday=isCurrentMonth&&day===now.getDate();
              const holiday = dayEvents.find((e:any)=>e.type==="holiday");
              return (
                <div key={day} title={holiday?`${holiday.title}${holiday.description?" — "+holiday.description:""}`:undefined} className={`min-h-[60px] rounded-lg p-1 cursor-pointer ${isToday?"bg-indigo-600/20 border border-indigo-500/40":holiday?c("bg-rose-500/10 hover:bg-rose-500/15","bg-rose-50 hover:bg-rose-100"):c("hover:bg-slate-700/30","hover:bg-slate-50")}`}>
                  {holiday ? (
                    <span className="relative inline-flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"/>
                      <span className="relative inline-flex rounded-full h-5 w-5 items-center justify-center bg-rose-500 text-white text-[10px] font-bold">{day}</span>
                    </span>
                  ) : (
                    <span className={`text-xs font-medium ${isToday?"text-indigo-400":c("text-slate-400","text-slate-500")}`}>{day}</span>
                  )}
                  {holiday && <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] font-semibold truncate bg-rose-500/20 text-rose-500 flex items-center gap-0.5"><PartyPopper size={9}/>{holiday.title}</div>}
                  {dayEvents.filter((e:any)=>e.type!=="holiday").map((ev:any,ei:number)=><div key={ei} className={`mt-0.5 px-1 py-0.5 rounded text-[9px] font-medium truncate ${ev.type==="meeting"?"bg-indigo-500/25 text-indigo-500":ev.type==="deadline"?"bg-red-500/25 text-red-500":"bg-emerald-500/25 text-emerald-600"}`}>{ev.title}</div>)}
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className={`font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Upcoming Events</h3>
          {nextHoliday && (
            <div className="mb-4 p-4 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/15 to-amber-500/10 relative overflow-hidden">
              <div className="absolute -top-2 -right-2 opacity-20"><PartyPopper size={56} className="text-rose-400"/></div>
              <div className="flex items-center gap-2 mb-1 relative"><PartyPopper size={15} className="text-rose-500 animate-bounce"/><span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Next Holiday</span></div>
              <p className={`text-sm font-bold relative ${c("text-white","text-slate-900")}`}>{nextHoliday.title}</p>
              {nextHoliday.description && <p className={`text-xs mt-0.5 relative ${c("text-slate-400","text-slate-500")}`}>{nextHoliday.description}</p>}
              <p className="text-xs font-semibold text-rose-500 mt-1.5 relative">{awayLabel(nextHoliday.daysAway)} · {MONTH_NAMES[nextHoliday.month-1].slice(0,3)} {nextHoliday.day}</p>
            </div>
          )}
          <div className="space-y-3">
            {data.upcoming.length===0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No upcoming events.</p>}
            {data.upcoming.map((ev:any,i:number)=>(
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${ev.type==="holiday"?c("bg-rose-500/10 hover:bg-rose-500/15","bg-rose-50 hover:bg-rose-100"):c("bg-slate-700/20 hover:bg-slate-700/30","bg-slate-50 hover:bg-slate-100")}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ev.type==="holiday"?"bg-rose-500/15":ev.type==="meeting"?"bg-indigo-500/15":ev.type==="deadline"?"bg-red-500/15":"bg-emerald-500/15"}`}>{ev.type==="holiday"?<PartyPopper size={14} className="text-rose-500"/>:ev.type==="meeting"?<Video size={14} className="text-indigo-500"/>:ev.type==="deadline"?<AlertCircle size={14} className="text-red-500"/>:<Calendar size={14} className="text-emerald-500"/>}</div>
                <div>
                  <p className={`text-xs font-medium ${c("text-slate-200","text-slate-700")}`}>{ev.title}</p>
                  <p className={`text-[10px] mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{MONTH_NAMES[ev.month-1].slice(0,3)} {ev.day}{ev.type==="holiday"?` · ${awayLabel(ev.daysAway)}`:""}</p>
                  {ev.type==="holiday" && ev.description && <p className={`text-[10px] mt-0.5 italic ${c("text-slate-500","text-slate-400")}`}>{ev.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

function AttendancePage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { setSelectedEmployeeId, navigateTo } = useApp();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [punchError, setPunchError] = useState("");
  const isAdmin = authUser?.role === "super-admin";
  const openProfile = (id: number) => { setSelectedEmployeeId(id); navigateTo("employee-profile"); };

  const now0 = new Date();
  const [calCursor, setCalCursor] = useState({ year: now0.getFullYear(), month: now0.getMonth()+1 });
  const [calEmployeeId, setCalEmployeeId] = useState<number | "">("");
  const [calData, setCalData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(now0.getDate());

  const load = () => fetch("/api/attendance").then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams({ year: String(calCursor.year), month: String(calCursor.month) });
    if (calEmployeeId) params.set("employeeId", String(calEmployeeId));
    fetch(`/api/attendance?${params}`).then(r => r.json()).then(d => setCalData(d.calendar));
  }, [calCursor, calEmployeeId]);

  const shiftCalMonth = (delta: number) => { setSelectedDay(null); setCalCursor(({year, month}) => { const d = new Date(year, month-1+delta, 1); return { year: d.getFullYear(), month: d.getMonth()+1 }; }); };

  const punch = async (action: "in" | "out") => {
    setBusy(true);
    setPunchError("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setPunchError(d.error || "Could not update attendance."); return; }
      await load();
    } catch {
      setPunchError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return null;
  const punched = data.today.punchedIn;
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const fmtHours = (h: number) => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Track work hours and attendance patterns"/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Today's Attendance</h3>
          <div className="flex flex-col items-center gap-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${punched?"border-emerald-500 bg-emerald-500/10":c("border-slate-600 bg-slate-800","border-slate-300 bg-slate-100")}`}>
              <div className="text-center"><Clock size={24} className={`${punched?"text-emerald-500":c("text-slate-500","text-slate-400")} mx-auto mb-1`}/><p className={`text-xs font-semibold ${c("text-slate-300","text-slate-600")}`}>{punched?"Punched In":"Not In"}</p></div>
            </div>
            {punched && data.today.punchInTime && <p className="text-sm text-emerald-500 font-medium">In since {fmtTime(data.today.punchInTime)}</p>}
            {!punched && data.today.punchOutTime && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Punched out at {fmtTime(data.today.punchOutTime)} today</p>}
            <button disabled={busy || (!punched && !!data.today.punchOutTime)} onClick={()=>punch(punched?"out":"in")} className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 ${punched?"bg-red-600 hover:bg-red-500 text-white":"bg-emerald-600 hover:bg-emerald-500 text-white"}`}>{punched?"Punch Out":data.today.punchOutTime?"Done for today":"Punch In"}</button>
            {punchError && <p className="text-xs text-red-400 text-center">{punchError}</p>}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            {[["Today's Hours",fmtHours(data.today.hoursToday)],["Expected Hours","8h 00m"]].map(([l,v])=><div key={l} className="flex justify-between"><span className={c("text-slate-500","text-slate-400")}>{l}</span><span className={`font-semibold ${c("text-slate-300","text-slate-700")}`}>{v}</span></div>)}
          </div>
        </Card>
        <div className="space-y-4">
          {[{label:"This Month",value:`${data.monthly.presentDays}/${data.monthly.totalRecorded}`,sublabel:"working days",color:"text-emerald-500"},{label:"Avg Hours/Day",value:`${data.monthly.avgHours}h`,sublabel:"vs 8h target",color:"text-indigo-500"},{label:"Late Arrivals",value:String(data.monthly.lateArrivals),sublabel:"this month",color:"text-amber-500"}].map(s=>(
            <Card key={s.label} className="p-4"><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{s.label}</p><p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p><p className={`text-xs mt-0.5 ${c("text-slate-600","text-slate-400")}`}>{s.sublabel}</p></Card>
          ))}
        </div>
        <Card className="p-5">
          <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Monthly Heatmap</h3>
          <div className="grid grid-cols-7 gap-1">
            {data.heatmap.map((d: any,i: number)=><div key={i} className={`w-full aspect-square rounded-sm cursor-pointer hover:opacity-70 ${!d.present?"bg-red-500/40":d.late?"bg-amber-500/60":"bg-emerald-500/60"}`} title={`Day ${d.day}`}/>)}
          </div>
          <div className={`flex items-center gap-3 mt-3 text-[10px] ${c("text-slate-500","text-slate-400")}`}>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60"/>Present</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500/60"/>Late</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/40"/>Absent</div>
          </div>
        </Card>
      </div>
      <Card className="mb-6">
        <div className={`p-4 border-b flex items-center justify-between flex-wrap gap-3 ${c("border-white/[0.06]","border-slate-200")}`}>
          <div>
            <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Attendance Calendar</h3>
            <p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>View punch in / punch out times for previous days</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <select value={calEmployeeId} onChange={e=>{setCalEmployeeId(e.target.value?Number(e.target.value):"");setSelectedDay(null);}} className={`text-xs rounded-lg px-2 py-1.5 border ${c("bg-slate-800 border-slate-600 text-slate-200","bg-white border-slate-300 text-slate-700")}`}>
                <option value="">Myself</option>
                {data.team?.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <button onClick={()=>shiftCalMonth(-1)} className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-400 hover:bg-slate-700","text-slate-500 hover:bg-slate-100")}`}><ChevronLeft size={15}/></button>
            <span className={`text-sm font-medium w-32 text-center ${c("text-slate-200","text-slate-700")}`}>{MONTH_NAMES[calCursor.month-1]} {calCursor.year}</span>
            <button onClick={()=>shiftCalMonth(1)} className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-400 hover:bg-slate-700","text-slate-500 hover:bg-slate-100")}`}><ChevronRight size={15}/></button>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            {!calData ? <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Loading…</p> : (
              <>
                <div className="grid grid-cols-7 mb-2">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} className={`text-center text-xs font-medium py-1 ${c("text-slate-500","text-slate-400")}`}>{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length:calData.firstWeekday}).map((_,i)=><div key={`e${i}`}/>)}
                  {calData.days.map((d:any)=>{
                    const isToday = calData.todayDay===d.day;
                    const isSelected = selectedDay===d.day;
                    const bg = d.status==="late" ? c("bg-amber-500/25 hover:bg-amber-500/35","bg-amber-100 hover:bg-amber-200")
                      : d.status==="present" ? c("bg-emerald-500/20 hover:bg-emerald-500/30","bg-emerald-100 hover:bg-emerald-200")
                      : d.status==="absent" ? c("bg-red-500/20 hover:bg-red-500/30","bg-red-100 hover:bg-red-200")
                      : c("hover:bg-slate-700/30","hover:bg-slate-50");
                    return (
                      <button key={d.day} onClick={()=>setSelectedDay(d.day)} className={`min-h-[52px] rounded-lg p-1.5 text-left transition-colors ${bg} ${isSelected?"ring-2 ring-indigo-500":""} ${isToday?"ring-1 ring-indigo-400":""}`}>
                        <span className={`text-xs font-medium ${c("text-slate-300","text-slate-600")}`}>{d.day}</span>
                        {d.punchIn && <div className={`text-[9px] mt-1 ${c("text-slate-400","text-slate-500")}`}>{fmtTime(d.punchIn)}</div>}
                      </button>
                    );
                  })}
                </div>
                <div className={`flex items-center gap-3 mt-3 text-[10px] ${c("text-slate-500","text-slate-400")}`}>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60"/>Present</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500/60"/>Late</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/40"/>Absent</div>
                </div>
              </>
            )}
          </div>
          <div>
            <h4 className={`text-xs font-semibold mb-3 ${c("text-slate-300","text-slate-600")}`}>Day Details</h4>
            {(() => {
              const d = calData?.days.find((x:any)=>x.day===selectedDay);
              if (!selectedDay || !d) return <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Click a day to view punch in/out details.</p>;
              return (
                <div className="space-y-2 text-xs">
                  <p className={`text-sm font-semibold mb-2 ${c("text-white","text-slate-900")}`}>{MONTH_NAMES[calCursor.month-1]} {d.day}, {calCursor.year}</p>
                  <div className="flex justify-between"><span className={c("text-slate-500","text-slate-400")}>Punch In</span><span className={`font-medium ${c("text-slate-200","text-slate-700")}`}>{d.punchIn?fmtTime(d.punchIn):"—"}</span></div>
                  <div className="flex justify-between"><span className={c("text-slate-500","text-slate-400")}>Punch Out</span><span className={`font-medium ${c("text-slate-200","text-slate-700")}`}>{d.punchOut?fmtTime(d.punchOut):"—"}</span></div>
                  <div className="flex justify-between"><span className={c("text-slate-500","text-slate-400")}>Hours Worked</span><span className={`font-medium ${c("text-slate-200","text-slate-700")}`}>{d.hoursWorked!=null?fmtHours(d.hoursWorked):"—"}</span></div>
                  <div className="flex justify-between items-center"><span className={c("text-slate-500","text-slate-400")}>Status</span>{d.status==="present"?<Badge variant="success">Present</Badge>:d.status==="late"?<Badge variant="warning">Late</Badge>:d.status==="absent"?<Badge variant="danger">Absent</Badge>:<Badge variant="default">No Record</Badge>}</div>
                </div>
              );
            })()}
          </div>
        </div>
      </Card>
      {isAdmin && (
        <Card className="mb-6">
          <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Today — All Employees</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Employee","Dept","Punch In","Punch Out","Status"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
              <tbody>
                {data.todayAll.map((e: any)=>(
                  <tr key={e.id} onClick={()=>openProfile(e.id)} className={`border-b cursor-pointer ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar initials={e.avatar} color={e.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{e.name}</span></div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{e.dept}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{e.punchInTime?fmtTime(e.punchInTime):"—"}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{e.punchOutTime?fmtTime(e.punchOutTime):"—"}</td>
                    <td className="px-4 py-3">{e.punchedIn?<Badge variant="success">Punched In</Badge>:e.punchOutTime?<Badge variant="default">Done</Badge>:<Badge variant="warning">Not In</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {isAdmin && (
        <Card>
          <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")} flex items-center justify-between`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Team Attendance (last 30 days)</h3><Btn variant="secondary" size="sm" icon={Download} onClick={()=>window.location.href="/api/reports/export?type=attendance"}>Export</Btn></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Employee","Dept","Rate"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
              <tbody>
                {data.team.map((e: any)=>(
                  <tr key={e.id} onClick={()=>openProfile(e.id)} className={`border-b cursor-pointer ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar initials={e.avatar} color={e.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{e.name}</span></div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{e.dept}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={e.attendance} color={e.attendance>=95?"bg-emerald-500":"bg-amber-500"}/><span className={`text-xs w-10 ${c("text-slate-400","text-slate-500")}`}>{e.attendance}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── LEAVE ────────────────────────────────────────────────────────────────────

function LeavePage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { openModal, activeModal } = useModal();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const canApprove = authUser?.role === "super-admin";

  const loadPending = () => {
    if (!canApprove) return;
    fetch("/api/leave?scope=pending").then(r => r.json()).then(d => setPending(d.pending ?? []));
  };

  useEffect(() => {
    if (activeModal === "apply-leave") return;
    fetch("/api/leave").then(r => r.json()).then(d => { setLeaveTypes(d.balances ?? []); setHistory(d.history ?? []); });
    loadPending();
  }, [activeModal]);

  const review = async (id: number, status: "approved" | "rejected") => {
    setReviewingId(id);
    try {
      await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadPending();
    } finally {
      setReviewingId(null);
    }
  };

  const inp=`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${c("bg-slate-800 border-white/[0.08] text-slate-300 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-700 focus:border-indigo-400")}`;
  return (
    <div>
      <PageHeader title="Leave Management" subtitle="Track balances, apply, and manage approvals" actions={<Btn size="sm" icon={Plus} onClick={()=>openModal("apply-leave")}>Apply Leave</Btn>}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {leaveTypes.map(l=>(
          <Card key={l.type} className="p-4">
            <div className="flex items-center gap-2 mb-3"><div className={`w-2.5 h-2.5 rounded-full ${l.color}`}/><span className={`text-xs font-medium ${c("text-slate-300","text-slate-700")}`}>{l.type}</span></div>
            <div className={`text-2xl font-bold mb-1 ${c("text-white","text-slate-900")}`}>{l.remaining}<span className={`text-base font-normal ${c("text-slate-500","text-slate-400")}`}>/{l.total}</span></div>
            <p className={`text-xs mb-2 ${c("text-slate-500","text-slate-400")}`}>days remaining</p>
            <ProgressBar value={(l.used/l.total)*100} color={l.color}/>
          </Card>
        ))}
      </div>
      {canApprove && (
        <Card className="mb-6">
          <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Pending Approvals</h3></div>
          {pending.length===0 && <p className={`p-4 text-sm ${c("text-slate-500","text-slate-400")}`}>No leave requests waiting on approval.</p>}
          {pending.length>0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Employee","Dates","Type","Days","Reason",""].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
                <tbody>{pending.map(r=>(
                  <tr key={r.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar initials={r.avatar} color={r.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{r.employee}</span></div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{r.dates}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{r.type}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{r.days}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{r.reason}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Btn size="sm" variant="primary" disabled={reviewingId===r.id} onClick={()=>review(r.id,"approved")}>Approve</Btn>
                        <Btn size="sm" variant="secondary" disabled={reviewingId===r.id} onClick={()=>review(r.id,"rejected")}>Reject</Btn>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      <Card>
        <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Leave History</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Dates","Type","Days","Reason","Status"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
            <tbody>{history.map((l,i)=>(
              <tr key={i} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{l.dates}</td>
                <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{l.type}</td>
                <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{l.days}</td>
                <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{l.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── EXPENSE CLAIMS ───────────────────────────────────────────────────────────

function ExpenseClaimsPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { openModal, activeModal } = useModal();
  const [history, setHistory] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const canApprove = authUser?.role === "super-admin" || authUser?.role === "hr-admin";

  const loadPending = () => {
    if (!canApprove) return;
    fetch("/api/expense-claims?scope=pending").then(r => r.json()).then(d => setPending(d.pending ?? []));
  };

  useEffect(() => {
    if (activeModal === "add-expense-claim") return;
    fetch("/api/expense-claims").then(r => r.json()).then(d => setHistory(d.history ?? []));
    loadPending();
  }, [activeModal]);

  const review = async (id: number, status: "approved" | "rejected") => {
    setReviewingId(id);
    try {
      await fetch(`/api/expense-claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadPending();
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Expense Claims" subtitle="Submit reimbursement requests and track approvals" actions={<Btn size="sm" icon={Plus} onClick={()=>openModal("add-expense-claim")}>Add Expense</Btn>}/>
      {canApprove && (
        <Card className="mb-6">
          <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Pending Approvals</h3></div>
          {pending.length===0 && <p className={`p-4 text-sm ${c("text-slate-500","text-slate-400")}`}>No expense claims waiting on approval.</p>}
          {pending.length>0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Employee","Date","Category","Amount","Description",""].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
                <tbody>{pending.map(r=>(
                  <tr key={r.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar initials={r.avatar} color={r.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{r.employee}</span></div></td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{r.date}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{r.category}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>₹{r.amount.toLocaleString("en-IN")}</td>
                    <td className={`px-4 py-3 text-sm max-w-xs truncate ${c("text-slate-400","text-slate-500")}`}>{r.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Btn size="sm" variant="primary" disabled={reviewingId===r.id} onClick={()=>review(r.id,"approved")}>Approve</Btn>
                        <Btn size="sm" variant="secondary" disabled={reviewingId===r.id} onClick={()=>review(r.id,"rejected")}>Reject</Btn>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      <Card>
        <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>My Expense Claims</h3></div>
        {history.length===0 && <p className={`p-4 text-sm ${c("text-slate-500","text-slate-400")}`}>You haven't submitted any expense claims yet.</p>}
        {history.length>0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Date","Category","Amount","Description","Status"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
              <tbody>{history.map((e:any)=>(
                <tr key={e.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                  <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{e.date}</td>
                  <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{e.category}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>₹{e.amount.toLocaleString("en-IN")}</td>
                  <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{e.description}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AddExpenseClaimModal({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ category: "Travel", date: "", amount: "", description: "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!(f.category && f.date && f.amount && f.description)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not submit expense claim."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Expense Claim Submitted" onClose={onClose}>
      <SuccessBanner message={`Your ₹${f.amount} ${f.category} expense claim has been submitted and is pending approval.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Add Expense Claim" subtitle="Submit a reimbursement request for approval" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel label="Category" required/>
          <FSelect value={f.category} onChange={v => set("category",v)}>
            {["Travel","Meals","Office Supplies","Software","Other"].map(t => <option key={t}>{t}</option>)}
          </FSelect>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Date" required/><FInput value={f.date} onChange={v => set("date",v)} type="date"/></div>
          <div><FieldLabel label="Amount (₹)" required/><FInput value={f.amount} onChange={v => set("amount",v)} type="number" placeholder="0.00"/></div>
        </div>
        <div><FieldLabel label="Description" required/><FTextarea value={f.description} onChange={v => set("description",v)} placeholder="What was this expense for?"/></div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" onClick={handleSubmit}>{submitting ? "Submitting..." : "Submit Claim"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── OPS EXPENSE LOG ──────────────────────────────────────────────────────────
// Deliberately minimal, no-workflow payment log: Vignesh (or whoever
// canSubmitOpsExpense allows) logs a payment; only super_admin sees the full
// list, CSV export, and spend charts. See src/lib/auth.ts for the access gate.

function monthBuckets(entries: any[], n = 6) {
  const buckets: Record<string, number> = {};
  const order: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    buckets[key] = 0;
    order.push(key);
  }
  for (const e of entries) {
    const key = new Date(e.rawDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (key in buckets) buckets[key] += e.amount;
  }
  return order.map(label => ({ label, amount: buckets[label] }));
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + ((day === 0 ? -6 : 1) - day));
  x.setHours(0, 0, 0, 0);
  return x;
}

function weekBuckets(entries: any[], n = 8) {
  const thisWeek = startOfWeek(new Date());
  const buckets: Record<string, number> = {};
  const order: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets[key] = 0;
    order.push(key);
  }
  for (const e of entries) {
    const key = startOfWeek(new Date(e.rawDate)).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in buckets) buckets[key] += e.amount;
  }
  return order.map(label => ({ label, amount: buckets[label] }));
}

function ExpenseLogPage() {
  const { c, light } = useTheme();
  const col = light ? LIGHT : DARK;
  const { authUser } = useAuth();
  const { openModal, activeModal } = useModal();
  const [entries, setEntries] = useState<any[]>([]);
  const isSubmitter = authUser?.email === VIGNESH_EMAIL;
  const isSuperAdmin = authUser?.role === "super-admin";

  useEffect(() => {
    if (activeModal === "add-ops-expense") return;
    if (isSubmitter || isSuperAdmin) fetch("/api/ops-expenses").then(r => r.json()).then(d => setEntries(d.entries ?? []));
  }, [activeModal, isSubmitter, isSuperAdmin]);

  if (!isSubmitter && !isSuperAdmin) return null;

  const monthData = monthBuckets(entries);
  const weekData = weekBuckets(entries);

  const deleteEntry = async (id: number) => {
    if (!window.confirm("Delete this expense entry? This cannot be undone.")) return;
    const res = await fetch(`/api/ops-expenses/${id}`, { method: "DELETE" });
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Log" subtitle={isSuperAdmin ? "All operations payments logged" : "Log a payment you made on the company's behalf"}
        actions={
          <>
            {isSubmitter && <Btn size="sm" icon={Plus} onClick={()=>openModal("add-ops-expense")}>Log Expense</Btn>}
            {isSuperAdmin && <Btn variant="secondary" size="sm" icon={Download} onClick={()=>window.location.href="/api/reports/export?type=ops-expenses"}>Export CSV</Btn>}
          </>
        }
      />

      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Spend by Month</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={col.chartGrid}/>
                <XAxis dataKey="label" tick={{ fill: col.tickColor, fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: col.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`}/>
                <Tooltip content={(p: any) => <ChartTip {...p} light={light}/>}/>
                <Bar dataKey="amount" name="Amount" fill="#4F46E5" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Spend by Week</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke={col.chartGrid}/>
                <XAxis dataKey="label" tick={{ fill: col.tickColor, fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: col.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`}/>
                <Tooltip content={(p: any) => <ChartTip {...p} light={light}/>}/>
                <Bar dataKey="amount" name="Amount" fill="#22C55E" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      <Card>
        <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}>
          <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{isSuperAdmin ? "All Entries" : "My Submissions"}</h3>
        </div>
        {entries.length===0 && <p className={`p-4 text-sm ${c("text-slate-500","text-slate-400")}`}>No expenses logged yet.</p>}
        {entries.length>0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>
                {[...(isSuperAdmin?["Submitted By"]:[]),"Date","Payee","Reason","Description","Mode","Amount","Screenshot",...(isSuperAdmin?["Actions"]:[])].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}
              </tr></thead>
              <tbody>{entries.map((e:any)=>(
                <tr key={e.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                  {isSuperAdmin && <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{e.submittedBy}</td>}
                  <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{e.date}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{e.payeeName}</td>
                  <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{e.reason}</td>
                  <td className={`px-4 py-3 text-sm max-w-xs truncate ${c("text-slate-400","text-slate-500")}`}>{e.description}</td>
                  <td className="px-4 py-3"><Badge variant="info">{e.paymentMode}</Badge></td>
                  <td className={`px-4 py-3 text-sm font-semibold ${c("text-white","text-slate-900")}`}>₹{e.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">{e.screenshotUrl ? <a href={e.screenshotUrl} target="_blank" rel="noreferrer" className="text-indigo-400 text-xs hover:underline">View</a> : <span className={`text-xs ${c("text-slate-600","text-slate-400")}`}>—</span>}</td>
                  {isSuperAdmin && <td className="px-4 py-3"><button onClick={()=>deleteEntry(e.id)} className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-500 hover:text-red-400 hover:bg-slate-700","text-slate-400 hover:text-red-500 hover:bg-slate-200")}`}><Trash2 size={13}/></button></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AddOpsExpenseModal({ onClose }: { onClose: () => void }) {
  const { authUser } = useAuth();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ payeeName: "", reason: "", description: "", paymentMode: "cash", amount: "", date: new Date().toISOString().slice(0,10) });
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const handleFileSelected = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setSubmitError("");
    if (file.size > 5 * 1024 * 1024) { setSubmitError(`"${file.name}" is over the 5MB limit.`); return; }
    setUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/uploadToCloudinary");
      const result = await uploadToCloudinary(file, "/api/ops-expenses/upload");
      setScreenshotUrl(result.url);
      setScreenshotName(file.name);
    } catch {
      setSubmitError("Could not upload the screenshot. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!(f.payeeName && f.reason && f.paymentMode && f.amount && f.date)) return;
    if (f.paymentMode === "online" && !screenshotUrl) { setSubmitError("Please attach a payment screenshot for online payments."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/ops-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, screenshotUrl: f.paymentMode === "online" ? screenshotUrl : null }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not submit this expense."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Expense Logged" onClose={onClose}>
      <SuccessBanner message={`Your ₹${f.amount} payment to ${f.payeeName} has been logged.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Log an Expense" subtitle="Record a payment made on the company's behalf" onClose={onClose}>
      <div className="space-y-4">
        <div><FieldLabel label="Paid To" required/><FInput value={f.payeeName} onChange={v => set("payeeName",v)} placeholder="Vendor or person paid"/></div>
        <div><FieldLabel label="Reason for Payment" required/><FInput value={f.reason} onChange={v => set("reason",v)} placeholder="e.g. Office supplies, courier"/></div>
        <div><FieldLabel label="Description"/><FTextarea value={f.description} onChange={v => set("description",v)} placeholder="Any additional detail"/></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Mode of Payment" required/>
            <FSelect value={f.paymentMode} onChange={v => { set("paymentMode",v); if (v !== "online") { setScreenshotUrl(""); setScreenshotName(""); } }}>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="cheque">Cheque</option>
            </FSelect>
          </div>
          <div><FieldLabel label="Amount (₹)" required/><FInput value={f.amount} onChange={v => set("amount",v)} type="number" placeholder="0"/></div>
        </div>
        <div><FieldLabel label="Date" required/><FInput value={f.date} onChange={v => set("date",v)} type="date"/></div>
        {f.paymentMode === "online" && (
          <div>
            <FieldLabel label="Payment Screenshot" required/>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelected(e.target.files)}/>
            {screenshotUrl ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400">{screenshotName || "Screenshot attached"}</span>
                <button type="button" onClick={() => { setScreenshotUrl(""); setScreenshotName(""); }} className="text-slate-500 hover:text-red-400"><X size={12}/></button>
              </div>
            ) : (
              <Btn size="sm" variant="secondary" icon={Upload} onClick={() => fileInputRef.current?.click()}>{uploading ? "Uploading..." : "Attach Screenshot"}</Btn>
            )}
          </div>
        )}
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" disabled={uploading} onClick={handleSubmit}>{submitting ? "Submitting..." : "Log Expense"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── PAYROLL ──────────────────────────────────────────────────────────────────

function PayrollPage() {
  const { c } = useTheme();
  const [data, setData] = useState<any>(null);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [pdfs, setPdfs] = useState<Record<number, { url: string; name: string }>>({});
  const [grantingId, setGrantingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  const load = () => fetch("/api/payroll").then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const pickFile = (employeeId: number) => {
    uploadTargetId.current = employeeId;
    fileInputRef.current?.click();
  };

  const onFileSelected = async (files: FileList | null) => {
    const file = files?.[0];
    const employeeId = uploadTargetId.current;
    if (!file || !employeeId) return;
    setUploadingId(employeeId);
    setError("");
    try {
      const { uploadToCloudinary } = await import("@/lib/uploadToCloudinary");
      const result = await uploadToCloudinary(file, "/api/payroll/upload", { employeeId: String(employeeId) });
      setPdfs(p => ({ ...p, [employeeId]: result }));
    } catch (err: any) {
      setError(err.message || "Could not upload payslip PDF.");
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const grant = async (employeeId: number) => {
    const amount = Number(amounts[employeeId]);
    if (!amount || amount <= 0) { setError("Enter a valid amount before granting."); return; }
    setGrantingId(employeeId);
    setError("");
    try {
      const existing = data.employees.find((e: any) => e.employeeId === employeeId);
      const attachment = pdfs[employeeId];
      const attachmentUrl = attachment?.url ?? existing?.attachmentUrl ?? undefined;
      const attachmentName = attachment?.name ?? existing?.attachmentName ?? undefined;
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, amount, attachmentUrl, attachmentName }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not grant payroll."); return; }
      setEditingId(null);
      setPdfs(p => { const n = { ...p }; delete n[employeeId]; return n; });
      await load();
    } finally {
      setGrantingId(null);
    }
  };

  const startEdit = (e: any) => {
    setError("");
    setEditingId(e.employeeId);
    setAmounts(a => ({ ...a, [e.employeeId]: String(e.amount) }));
  };

  const cancelEdit = (employeeId: number) => {
    setEditingId(null);
    setAmounts(a => { const n = { ...a }; delete n[employeeId]; return n; });
    setPdfs(p => { const n = { ...p }; delete n[employeeId]; return n; });
  };

  const remove = async (e: any) => {
    if (!e.id) return;
    if (!window.confirm(`Delete the ${data.month} payroll record for ${e.name}? This cannot be undone.`)) return;
    setDeletingId(e.employeeId);
    setError("");
    try {
      const res = await fetch(`/api/payroll/${e.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Could not delete payroll record."); return; }
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  if (!data) return null;

  return (
    <div>
      <PageHeader title="Payroll" subtitle={`Grant salary payouts for ${data.month}`}/>
      <input ref={fileInputRef} type="file" hidden accept="application/pdf" onChange={e => onFileSelected(e.target.files)}/>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Paid" value={String(data.paidCount)} icon={CheckCircle2} iconColor="bg-emerald-600/40" trend="up"/>
        <StatCard label="Pending" value={String(data.totalCount - data.paidCount)} icon={Clock} iconColor="bg-amber-600/40" trend="up"/>
      </div>
      <Card>
        <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Employees — {data.month}</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Employee","Amount","Payslip PDF","Status",""].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
            <tbody>
              {data.employees.map((e:any)=>{
                const isEditing = editingId === e.employeeId;
                const isLocked = e.status === "paid" && !isEditing;
                return (
                <tr key={e.employeeId} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar initials={e.avatar} color={e.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{e.name}</span></div></td>
                  <td className="px-4 py-3">
                    {isLocked
                      ? <span className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>₹{e.amount.toLocaleString("en-IN")}</span>
                      : <FInput value={amounts[e.employeeId] ?? ""} onChange={v=>setAmounts(a=>({...a,[e.employeeId]:v}))} type="number" placeholder="Enter amount" className="max-w-[160px]"/>}
                  </td>
                  <td className="px-4 py-3">
                    {isLocked
                      ? (e.attachmentUrl
                          ? <a href={e.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-500 hover:underline"><Paperclip size={12}/>{e.attachmentName || "View PDF"}</a>
                          : <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No PDF</span>)
                      : (pdfs[e.employeeId]
                          ? <span className="flex items-center gap-1 text-xs text-emerald-500"><Paperclip size={12}/>{pdfs[e.employeeId].name}</span>
                          : (isEditing && e.attachmentUrl
                              ? <div className="flex items-center gap-2">
                                  <a href={e.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-500 hover:underline"><Paperclip size={12}/>{e.attachmentName || "View PDF"}</a>
                                  <Btn variant="secondary" size="sm" icon={Upload} onClick={()=>pickFile(e.employeeId)} disabled={uploadingId===e.employeeId}>{uploadingId===e.employeeId?"Uploading...":"Replace"}</Btn>
                                </div>
                              : <Btn variant="secondary" size="sm" icon={Upload} onClick={()=>pickFile(e.employeeId)} disabled={uploadingId===e.employeeId}>{uploadingId===e.employeeId?"Uploading...":"Attach PDF"}</Btn>))}
                  </td>
                  <td className="px-4 py-3">{e.status==="paid" ? <Badge variant="success">Paid</Badge> : <Badge variant="warning">Pending</Badge>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {e.status!=="paid" && <Btn size="sm" onClick={()=>grant(e.employeeId)} disabled={grantingId===e.employeeId}>{grantingId===e.employeeId?"Granting...":"Grant"}</Btn>}
                      {isLocked && <>
                        <Btn variant="secondary" size="sm" icon={Edit2} onClick={()=>startEdit(e)}>Edit</Btn>
                        <Btn variant="danger" size="sm" icon={Trash2} onClick={()=>remove(e)} disabled={deletingId===e.employeeId}>{deletingId===e.employeeId?"Deleting...":"Delete"}</Btn>
                      </>}
                      {e.status==="paid" && isEditing && <>
                        <Btn size="sm" onClick={()=>grant(e.employeeId)} disabled={grantingId===e.employeeId}>{grantingId===e.employeeId?"Saving...":"Save"}</Btn>
                        <Btn variant="secondary" size="sm" onClick={()=>cancelEdit(e.employeeId)}>Cancel</Btn>
                      </>}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PayslipPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const [payslips, setPayslips] = useState<any[] | null>(null);

  useEffect(() => {
    if (!authUser) return;
    fetch(`/api/payroll?employeeId=${authUser.id}`).then(r => r.json()).then(d => setPayslips(d.payslips ?? []));
  }, [authUser]);

  if (!payslips) return null;

  return (
    <div>
      <PageHeader title="Payslip" subtitle="Your payroll history — visible only to you"/>
      <Card>
        <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Payslip History</h3></div>
        {payslips.length === 0 && <p className={`p-4 text-xs ${c("text-slate-500","text-slate-400")}`}>No payslips have been issued yet.</p>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Month","Amount","Status","Payslip"].map(h => <th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
            <tbody>
              {payslips.map((p: any) => (
                <tr key={p.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")}`}>
                  <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{p.month}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${c("text-white","text-slate-900")}`}>₹{p.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">{p.status === "paid" ? <Badge variant="success">Paid</Badge> : <Badge variant="warning">Pending</Badge>}</td>
                  <td className="px-4 py-3">
                    {p.attachmentUrl
                      ? <a href={p.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-500 hover:underline"><Download size={12}/>{p.attachmentName || "Download"}</a>
                      : <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

function KPIPage() {
  const { c } = useTheme();
  const [kpis, setKpis] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = () => fetch("/api/kpi").then(r => r.json()).then(d => setKpis(d.kpis ?? []));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="KPI Dashboard" subtitle="Key performance indicators across all departments" actions={<Btn size="sm" icon={Plus} onClick={()=>setAdding(true)}>Add KPI</Btn>}/>
      {kpis.length===0 && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>No KPIs have been defined yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpis.map(kpi=>(
          <Card key={kpi.id} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5" onClick={()=>setEditing(kpi)}>
            <div className="flex items-start justify-between mb-3"><div><h4 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{kpi.name}</h4><p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{kpi.dept}</p></div><div className={`flex items-center text-xs font-medium ${kpi.trend==="up"?"text-emerald-500":"text-red-500"}`}>{kpi.trend==="up"?<ArrowUp size={12}/>:<ArrowDown size={12}/>}</div></div>
            <div className="flex items-end gap-2 mb-3"><span className={`text-2xl font-bold ${c("text-white","text-slate-900")}`}>{kpi.current}{kpi.unit}</span><span className={`text-sm mb-0.5 ${c("text-slate-500","text-slate-400")}`}>/ {kpi.target}{kpi.unit}</span></div>
            <ProgressBar value={kpi.pct} color={kpi.pct>=85?"bg-emerald-500":kpi.pct>=70?"bg-amber-500":"bg-red-500"}/>
            <p className={`text-xs mt-1 font-medium ${kpi.pct>=85?"text-emerald-500":kpi.pct>=70?"text-amber-500":"text-red-500"}`}>{kpi.pct}% of target</p>
          </Card>
        ))}
      </div>
      {adding && <AddKPIModal onClose={()=>setAdding(false)} onSaved={()=>{ setAdding(false); load(); }}/>}
      {editing && <EditKPIModal kpi={editing} onClose={()=>setEditing(null)} onSaved={()=>{ setEditing(null); load(); }}/>}
    </div>
  );
}

function AddKPIModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const departments = useDepartmentDirectory();
  const [f, setF] = useState({ name: "", dept: "", current: "", target: "", unit: "", trend: "up", period: "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!f.name.trim() || !f.current.trim() || !f.target.trim()) { setError("Name, current, and target are required."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/kpi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not create KPI."); return; }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay title="Add KPI" subtitle="Define a metric to track against a target" onClose={onClose}>
      <div className="space-y-4">
        <div><FieldLabel label="KPI Name" required/><FInput value={f.name} onChange={v=>set("name",v)} placeholder="e.g. Client Retention Rate"/></div>
        <div><FieldLabel label="Department"/><FSelect value={f.dept} onChange={v=>set("dept",v)}><option value="">Company-wide</option>{departments.map((d:any)=><option key={d.id}>{d.name}</option>)}</FSelect></div>
        <div className="grid grid-cols-3 gap-4">
          <div><FieldLabel label="Current Value" required/><FInput value={f.current} onChange={v=>set("current",v)} placeholder="e.g. 82"/></div>
          <div><FieldLabel label="Target Value" required/><FInput value={f.target} onChange={v=>set("target",v)} placeholder="e.g. 90"/></div>
          <div><FieldLabel label="Unit"/><FInput value={f.unit} onChange={v=>set("unit",v)} placeholder="%, days, ₹..."/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Trend Direction"/><FSelect value={f.trend} onChange={v=>set("trend",v)}><option value="up">Higher is better</option><option value="down">Lower is better</option></FSelect></div>
          <div><FieldLabel label="Period"/><FInput value={f.period} onChange={v=>set("period",v)} placeholder="e.g. Q3 2026"/></div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-2"><Btn variant="primary" onClick={save} disabled={busy}>{busy?"Creating...":"Create KPI"}</Btn><Btn variant="secondary" onClick={onClose}>Cancel</Btn></div>
      </div>
    </ModalOverlay>
  );
}

function EditKPIModal({ kpi, onClose, onSaved }: { kpi: any; onClose: () => void; onSaved: () => void }) {
  const [current, setCurrent] = useState(String(kpi.current));
  const [target, setTarget] = useState(String(kpi.target));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/kpi/${kpi.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, target }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not save changes."); return; }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the "${kpi.name}" KPI? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/kpi/${kpi.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not delete KPI."); return; }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay title={kpi.name} subtitle={kpi.dept || "Company-wide"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label={`Current Value (${kpi.unit||"—"})`} required/><FInput value={current} onChange={setCurrent} placeholder="e.g. 85"/></div>
          <div><FieldLabel label={`Target Value (${kpi.unit||"—"})`} required/><FInput value={target} onChange={setTarget} placeholder="e.g. 90"/></div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Btn variant="primary" onClick={save} disabled={busy}>{busy?"Saving...":"Save"}</Btn>
          <Btn variant="danger" size="sm" icon={Trash2} onClick={remove} disabled={busy}>Delete KPI</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── OKR ──────────────────────────────────────────────────────────────────────

function OKRPage() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const [data, setData] = useState<any>(null);
  const [quarter, setQuarter] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal === "add-objective") return;
    fetch("/api/okr").then(r => r.json()).then(d => { setData(d); setQuarter(q => q ?? d.quarter); });
  }, [activeModal]);

  if (!data) return null;
  const objectives = data.objectives.filter((o:any) => !quarter || o.quarter.startsWith(quarter));

  return (
    <div>
      <PageHeader title="OKR Tracker" subtitle={`Objectives and Key Results — ${data.quarter} ${new Date().getFullYear()}`}
        actions={<><div className="flex gap-1">{["Q1","Q2","Q3","Q4"].map(q=><button key={q} onClick={()=>setQuarter(q)} className={`px-3 py-1.5 text-xs rounded-lg ${quarter===q?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}>{q}</button>)}</div><Btn size="sm" icon={Plus} onClick={()=>openModal("add-objective")}>Add Objective</Btn></>}/>
      {objectives.length===0 && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>No objectives for this quarter yet.</p>}
      <div className="space-y-4">
        {objectives.map((obj:any)=>(
          <Card key={obj.id} className="overflow-hidden">
            <div className={`p-5 border-b ${c("border-white/[0.06]","border-slate-200")}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5"><Target size={15} className="text-indigo-500"/></div><div><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{obj.title}</h3><p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{obj.owner} · {obj.quarter}</p></div></div>
                <span className={`text-xl font-bold flex-shrink-0 ${c("text-white","text-slate-900")}`}>{obj.progress}%</span>
              </div>
              <ProgressBar value={obj.progress} color={obj.progress>=70?"bg-emerald-500":obj.progress>=50?"bg-indigo-500":"bg-amber-500"}/>
            </div>
            <div className={`divide-y ${c("divide-white/[0.04]","divide-slate-100")}`}>
              {obj.krs.map((kr:any,i:number)=>(
                <div key={i} className={`flex items-center gap-4 px-5 py-3 ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                  <div className={`w-4 h-4 rounded border flex-shrink-0 ${c("border-slate-600","border-slate-300")}`}/>
                  <p className={`flex-1 text-sm ${c("text-slate-300","text-slate-700")}`}>{kr.title}</p>
                  <StatusBadge status={kr.status}/>
                  <div className="w-32 flex items-center gap-2"><ProgressBar value={kr.progress} color={kr.status==="on-track"?"bg-emerald-500":"bg-amber-500"}/><span className={`text-xs w-8 ${c("text-slate-400","text-slate-500")}`}>{kr.progress}%</span></div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const { c, light } = useTheme();
  const col=light?LIGHT:DARK;
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/analytics").then(r => r.json()).then(setData); }, []);
  if (!data) return null;
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Deep insights across your entire organization"/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Employees" value={String(data.totalEmployees)} icon={Users} iconColor="bg-indigo-600/40" trend="up"/>
        <StatCard label="Active Employees" value={String(data.activeEmployees)} icon={CheckCircle2} iconColor="bg-emerald-600/40" trend="up"/>
        <StatCard label="Task Completion Rate" value={`${data.taskCompletionPct}%`} icon={TrendingUp} iconColor="bg-violet-600/40" trend="up"/>
        <StatCard label="Overdue Tasks" value={String(data.overdueTasks)} icon={AlertCircle} iconColor="bg-amber-600/40" trend={data.overdueTasks>0?"down":"up"}/>
      </div>
      <Card className="p-5">
        <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Department Workforce Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.departmentWorkforce}>
            <CartesianGrid strokeDasharray="3 3" stroke={col.chartGrid}/><XAxis dataKey="name" tick={{ fill:col.tickColor, fontSize:10 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill:col.tickColor, fontSize:11 }} axisLine={false} tickLine={false}/>
            <Tooltip content={(p:any)=><ChartTip {...p} light={light}/>}/>
            <Bar key="ana-emps" dataKey="employees" name="Employees" fill="#4F46E5" radius={[4,4,0,0]}/><Bar key="ana-projs" dataKey="projects" name="Active Projects" fill="#22C55E" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── KNOWLEDGE BASE ───────────────────────────────────────────────────────────

const KNOWLEDGE_CATEGORY_ICONS: Record<string, React.ElementType> = {
  Engineering: Code, "HR Policies": FileText, Product: Target, Onboarding: CheckSquare, Finance: DollarSign, Security: ShieldCheck,
};

function KnowledgePage() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [articles, setArticles] = useState<any[]>([]);
  const categories=["All","Engineering","HR Policies","Product","Onboarding","Finance","Security"];

  useEffect(() => {
    if (activeModal === "add-article") return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (cat !== "All") params.set("category", cat);
    fetch(`/api/knowledge?${params}`).then(r => r.json()).then(d => setArticles(d.articles ?? []));
  }, [search, cat, activeModal]);

  return (
    <div>
      <PageHeader title="Knowledge Base" subtitle="Documentation, SOPs, and company resources" actions={<Btn size="sm" icon={Plus} onClick={()=>openModal("add-article")}>New Article</Btn>}/>
      <div className="relative mb-4"><Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${c("text-slate-500","text-slate-400")}`}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search articles..." className={`w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none ${c("bg-slate-800/60 border-white/[0.08] text-slate-300 placeholder-slate-600 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-400")}`}/></div>
      <div className="flex gap-2 mb-5 flex-wrap">{categories.map(ca=><button key={ca} onClick={()=>setCat(ca)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cat===ca?"bg-indigo-600 text-white":c("bg-slate-800/60 border border-white/[0.08] text-slate-400 hover:text-slate-200","bg-white border border-slate-200 text-slate-500 hover:text-slate-700")}`}>{ca}</button>)}</div>
      {articles.length===0 && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>No articles found.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {articles.map(a=>{
          const Icon = KNOWLEDGE_CATEGORY_ICONS[a.category] ?? FileText;
          return (
          <Card key={a.id} className="p-4 cursor-pointer transition-all hover:-translate-y-0.5 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c("bg-slate-700/50","bg-slate-100")}`}><Icon size={16} className={c("text-slate-400","text-slate-500")}/></div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium transition-colors ${c("text-white hover:text-indigo-300","text-slate-800 hover:text-indigo-600")}`}>{a.title}</h4>
              <div className={`flex items-center gap-3 mt-1.5 text-xs ${c("text-slate-500","text-slate-400")} flex-wrap`}>
                <Badge variant="default">{a.category}</Badge><span>{a.author}</span><span>Updated {a.updated}</span><span className="flex items-center gap-0.5"><Eye size={11}/>{a.views}</span>
              </div>
            </div>
          </Card>
        );})}
      </div>
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────

// ─── REMAINING PAGES ──────────────────────────────────────────────────────────

function MeetingsPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { openModal, activeModal } = useModal();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const ac=["bg-indigo-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-cyan-500","bg-rose-500"];

  const load = () => fetch("/api/meetings").then(r => r.json()).then(d => setMeetings(d.meetings ?? []));
  useEffect(() => {
    if (activeModal === "schedule-meeting") return;
    load();
  }, [activeModal]);

  const cancelMeeting = async (id: number) => {
    setCancellingId(id);
    try {
      await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Meetings" subtitle="Upcoming meetings and sessions" actions={<Btn size="sm" icon={Plus} onClick={()=>openModal("schedule-meeting")}>Schedule Meeting</Btn>}/>
      {meetings.length===0 && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>No meetings scheduled yet.</p>}
      <div className="space-y-3">{meetings.map((m,mi)=>{
        const canManage = authUser?.id === m.createdById || authUser?.role === "super-admin";
        return (
        <Card key={mi} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0"><Video size={16} className="text-indigo-500"/></div>
              <div><h4 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{m.title}</h4><div className={`flex items-center gap-3 mt-1 text-xs ${c("text-slate-500","text-slate-400")}`}><span>{m.date}</span><span>{m.time}</span></div>
              <div className="flex items-center gap-1 mt-2">{m.attendees.slice(0,5).map((a,i)=><div key={i} className={`w-6 h-6 rounded-full ${ac[i%ac.length]} flex items-center justify-center text-[9px] font-bold text-white border-2 ${c("border-slate-800","border-white")} -ml-1 first:ml-0`}>{a}</div>)}</div></div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={m.status}/>
              <Btn variant="secondary" size="sm" disabled={!m.gmeetLink} onClick={()=>window.open(m.gmeetLink, "_blank", "noopener,noreferrer")}>Join</Btn>
              {canManage && <Btn variant="danger" size="sm" disabled={cancellingId===m.id} onClick={()=>cancelMeeting(m.id)}>Cancel</Btn>}
            </div>
          </div>
        </Card>
        );
      })}</div>
    </div>
  );
}

const NOTIF_ICONS: Record<string, React.ElementType> = {
  task: CheckSquare, leave: PlaneTakeoff, project: FolderKanban, payroll: DollarSign, meeting: Video, performance: Award, attendance: Clock,
};
const NOTIF_COLORS: Record<string, string> = {
  task: "bg-indigo-500/15 text-indigo-500", leave: "bg-emerald-500/15 text-emerald-500", project: "bg-amber-500/15 text-amber-500",
  payroll: "bg-violet-500/15 text-violet-500", meeting: "bg-cyan-500/15 text-cyan-500", performance: "bg-rose-500/15 text-rose-500",
  attendance: "bg-amber-500/15 text-amber-500",
};

function NotificationsPage() {
  const { c } = useTheme();
  const [notifs, setNotifs] = useState<any[]>([]);

  const load = () => fetch("/api/notifications").then(r => r.json()).then(d => setNotifs(d.notifications ?? []));
  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
    load();
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${notifs.filter(n=>!n.read).length} unread`} actions={<Btn variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Btn>}/>
      {notifs.length===0 && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>You're all caught up.</p>}
      <div className="space-y-2 max-w-2xl">{notifs.map((n)=>{
        const Icon = NOTIF_ICONS[n.icon] ?? CheckSquare;
        return (
        <Card key={n.id} className={`p-4 cursor-pointer ${!n.read?c("border-indigo-500/20","border-indigo-300/40"):""}`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl ${NOTIF_COLORS[n.icon] ?? "bg-indigo-500/15 text-indigo-500"} flex items-center justify-center flex-shrink-0`}><Icon size={16}/></div>
            <div className="flex-1"><div className="flex items-start justify-between gap-2"><p className={`text-sm font-medium ${n.read?c("text-slate-400","text-slate-500"):c("text-white","text-slate-900")}`}>{n.title}</p><span className={`text-[10px] flex-shrink-0 ${c("text-slate-600","text-slate-400")}`}>{n.time}</span></div><p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-500")}`}>{n.body}</p></div>
            {!n.read&&<div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-2"/>}
          </div>
        </Card>
      );})}</div>
    </div>
  );
}

function RolesPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const isSuperAdmin = authUser?.role === "super-admin";

  const load = () => fetch("/api/roles").then(r => r.json()).then(d => { setData(d); setSelected(s => s ?? d.roles[1]?.role); });
  useEffect(() => { load(); }, []);

  const toggle = async (permission: string, enabled: boolean) => {
    if (!selected || !isSuperAdmin) return;
    await fetch("/api/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selected, permission, enabled }),
    });
    load();
  };

  if (!data) return null;
  const selectedRole = data.roles.find((r:any) => r.role === selected);
  const roleColors: Record<string,string> = { super_admin: "bg-red-500", first_level_manager: "bg-violet-500", second_level_manager: "bg-violet-500", manager: "bg-indigo-500", team_lead: "bg-amber-500", hr_admin: "bg-pink-500", employee: "bg-emerald-500" };

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Define access control"/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">{data.roles.map((role:any)=>(
          <Card key={role.role} onClick={()=>setSelected(role.role)} className={`p-4 cursor-pointer hover:-translate-y-0.5 transition-all ${selected===role.role?c("border-indigo-500/40","border-indigo-300"):""}`}>
            <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg ${roleColors[role.role]}/20 flex items-center justify-center`}><ShieldCheck size={15} className={roleColors[role.role].replace("bg-","text-")}/></div><div><p className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{role.label}</p><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{role.users} users · {role.isWildcard ? "all" : role.permissions.length} permissions</p></div></div>
          </Card>
        ))}</div>
        <Card className="p-5 lg:col-span-2">
          <h3 className={`text-sm font-semibold mb-1 ${c("text-white","text-slate-900")}`}>Permissions — {selectedRole?.label}</h3>
          <p className={`text-xs mb-4 ${c("text-slate-500","text-slate-400")}`}>{isSuperAdmin ? "Click a page to grant or revoke access for this role." : "Only Super Admin can edit permissions."}{selectedRole?.isWildcard && " This role has full access to everything."}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {data.pages.map((page:string) => {
              const enabled = selectedRole?.isWildcard || selectedRole?.permissions.includes(page);
              return (
                <button key={page} disabled={!isSuperAdmin || selectedRole?.isWildcard} onClick={()=>toggle(page, !enabled)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${enabled?"bg-emerald-500/10 border-emerald-500/30 text-emerald-500":c("border-white/[0.08] text-slate-400","border-slate-200 text-slate-500")} ${isSuperAdmin && !selectedRole?.isWildcard ? "cursor-pointer hover:opacity-80" : "cursor-default opacity-80"}`}>
                  {enabled?<CheckCircle2 size={13}/>:<XCircle size={13}/>}{page}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AuditPage() {
  const { c } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { fetch("/api/audit").then(r => r.json()).then(d => setLogs(d.logs ?? [])); }, []);
  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Track all system actions and security events" actions={<Btn variant="secondary" size="sm" icon={Download} onClick={()=>window.location.href="/api/reports/export?type=audit"}>Export Logs</Btn>}/>
      <Card>
        {logs.length===0 && <p className={`p-4 text-sm ${c("text-slate-500","text-slate-400")}`}>No audit activity recorded yet.</p>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["User","Action","Resource","IP Address","Severity","Time"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
            <tbody>{logs.map((log,i)=>(
              <tr key={i} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{log.user}</td>
                <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{log.action}</td>
                <td className="px-4 py-3"><Badge variant="default">{log.resource}</Badge></td>
                <td className={`px-4 py-3 text-xs font-mono ${c("text-slate-500","text-slate-400")}`}>{log.ip}</td>
                <td className="px-4 py-3"><Badge variant={log.severity==="danger"?"danger":log.severity==="warning"?"warning":"success"}>{log.severity}</Badge></td>
                <td className={`px-4 py-3 text-xs ${c("text-slate-500","text-slate-400")}`}>{log.time}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BillingPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const isAdmin = authUser?.role === "super-admin" || authUser?.role === "hr-admin";

  const load = () => fetch("/api/billing").then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const setStatus = async (id: number, status: string) => {
    await fetch("/api/billing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  };

  if (!data) return null;
  const current = data.invoices[0];

  return (
    <div>
      <PageHeader title="Billing & Plans" subtitle="Manage subscription and payment information"/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className={`p-5 ${c("border-indigo-500/30","border-indigo-300")}`}>
          <div className="flex items-center justify-between mb-3"><Badge variant="info">Current Plan</Badge><Badge variant="success">Active</Badge></div>
          <h3 className={`text-lg font-bold mb-1 ${c("text-white","text-slate-900")}`}>{data.plan}</h3>
          <p className={`text-sm mb-4 ${c("text-slate-400","text-slate-500")}`}>Full access to all RIAURA features</p>
          <div className={`text-3xl font-bold ${c("text-white","text-slate-900")}`}>₹{data.pricePerMonth.toLocaleString("en-IN")}<span className={`text-base font-normal ${c("text-slate-500","text-slate-400")}`}>/month</span></div>
          <p className={`text-xs mt-1 mb-4 ${c("text-slate-500","text-slate-400")}`}>{data.seats.toLocaleString()} seats</p>
          <div className="space-y-1.5 text-xs">{["Unlimited employees","All HR modules","Priority support","99.99% SLA"].map(f=><div key={f} className={`flex items-center gap-2 ${c("text-slate-400","text-slate-500")}`}><CheckCircle2 size={12} className="text-emerald-500"/>{f}</div>)}</div>
        </Card>
        <Card className="p-4">
          <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Current Invoice</p>
          <p className={`text-base font-semibold mt-0.5 ${c("text-white","text-slate-900")}`}>₹{(current?.amount ?? 0).toLocaleString("en-IN")}.00</p>
          <p className={`text-xs mt-0.5 ${c("text-slate-600","text-slate-400")}`}>{current?.period}</p>
          <div className="mt-2">{current && <StatusBadge status={current.status}/>}</div>
          {isAdmin && current && current.status !== "paid" && <Btn size="sm" className="mt-3" onClick={()=>setStatus(current.id,"paid")}>Mark as Paid</Btn>}
        </Card>
        <Card className="p-5">
          <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Seat Usage</h3>
          <div className="flex justify-between text-xs mb-1"><span className={c("text-slate-400","text-slate-500")}>Active Seats</span><span className={c("text-slate-300","text-slate-700")}>{data.activeSeats.toLocaleString()} / {data.seats.toLocaleString()}</span></div>
          <ProgressBar value={(data.activeSeats/data.seats)*100} color={(data.activeSeats/data.seats)>0.85?"bg-amber-500":"bg-indigo-500"}/>
        </Card>
      </div>
      <Card>
        <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Invoice History</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Period","Amount","Issued","Status",""].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
            <tbody>{data.invoices.map((inv:any)=>(
              <tr key={inv.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")}`}>
                <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{inv.period}</td>
                <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>₹{inv.amount.toLocaleString("en-IN")}.00</td>
                <td className={`px-4 py-3 text-xs ${c("text-slate-500","text-slate-400")}`}>{inv.issuedAt}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status}/></td>
                <td className="px-4 py-3">{isAdmin && inv.status !== "paid" && <button onClick={()=>setStatus(inv.id,"paid")} className="text-xs text-indigo-500">Mark Paid</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SettingsPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const [tab, setTab] = useState("organization");
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState<{ name: string; rawKey: string } | null>(null);
  const isAdmin = authUser?.role === "super-admin" || authUser?.role === "hr-admin";
  const tabs=[{id:"organization",label:"Organization",icon:Building2},{id:"notifications",label:"Notifications",icon:Bell},{id:"security",label:"Security",icon:Lock},{id:"api",label:"API Keys",icon:Key}];
  const inp=`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${c("bg-slate-800/60 border-white/[0.08] text-slate-300 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-700 focus:border-indigo-400")}`;

  const loadSettings = () => fetch("/api/settings").then(r => r.json()).then(d => { setSettings(d.settings); setForm(d.settings); });
  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { if (tab==="security") fetch("/api/sessions").then(r => r.json()).then(d => setSessions(d.sessions ?? [])); }, [tab]);
  useEffect(() => { if (tab==="api" && isAdmin) fetch("/api/api-keys").then(r => r.json()).then(d => setApiKeys(d.keys ?? [])); }, [tab]);

  const save = async (fields: string[]) => {
    const patch = Object.fromEntries(fields.map(f => [f, form[f]]));
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    loadSettings();
  };
  const toggle = async (field: string) => {
    const value = !form[field];
    setForm((p:any) => ({ ...p, [field]: value }));
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
  };
  const revokeSession = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    fetch("/api/sessions").then(r => r.json()).then(d => setSessions(d.sessions ?? []));
  };
  const generateKey = async () => {
    const res = await fetch("/api/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New API Key" }) });
    const data = await res.json();
    if (res.ok) { setNewKey({ name: data.key.name, rawKey: data.key.rawKey }); fetch("/api/api-keys").then(r => r.json()).then(d => setApiKeys(d.keys ?? [])); }
  };
  const revokeKey = async (id: number) => {
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    fetch("/api/api-keys").then(r => r.json()).then(d => setApiKeys(d.keys ?? []));
  };

  if (!settings || !form) return null;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage organization and account preferences"/>
      <div className="flex gap-1 mb-6 flex-wrap">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t.id?"bg-indigo-600 text-white":c("text-slate-400 hover:text-slate-200 hover:bg-slate-800/60","text-slate-500 hover:text-slate-700 hover:bg-slate-100")}`}><t.icon size={15}/>{t.label}</button>)}</div>

      {tab==="organization"&&<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5"><h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Organization Details</h3><div className="space-y-3">
          {[["companyName","Company Name"],["domain","Domain"],["industry","Industry"],["companySize","Company Size"],["headquarters","Headquarters"]].map(([key,l])=><div key={key}><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>{l}</label><input disabled={!isAdmin} value={form[key]} onChange={e=>setForm((p:any)=>({...p,[key]:e.target.value}))} className={inp}/></div>)}
          {isAdmin && <Btn variant="primary" size="sm" icon={RefreshCw} className="mt-2" onClick={()=>save(["companyName","domain","industry","companySize","headquarters"])}>Save Changes</Btn>}
        </div></Card>
        <Card className="p-5"><h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Localization</h3><div className="space-y-3">
          {[["fiscalYearStart","Fiscal Year Start",["January","April","July"]],["currency","Currency",["INR","USD","EUR","GBP"]],["timezone","Timezone",["America/New_York","America/Los_Angeles","Asia/Kolkata"]],["dateFormat","Date Format",["MM/DD/YYYY","DD/MM/YYYY"]]].map(([key,l,opts])=><div key={key as string}><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>{l as string}</label><select disabled={!isAdmin} value={form[key as string]} onChange={e=>setForm((p:any)=>({...p,[key as string]:e.target.value}))} className={inp}>{(opts as string[]).map(o=><option key={o}>{o}</option>)}</select></div>)}
          {isAdmin && <Btn variant="primary" size="sm" icon={RefreshCw} className="mt-2" onClick={()=>save(["fiscalYearStart","currency","timezone","dateFormat"])}>Save Changes</Btn>}
        </div></Card>
      </div>}

      {tab==="notifications"&&<Card className="p-5 max-w-2xl"><h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Notification Preferences</h3><div className="space-y-4">{[["notifyTaskAssignments","Task Assignments","When a task is assigned to you"],["notifyProjectUpdates","Project Updates","Status changes and milestone completions"],["notifyLeaveApprovals","Leave Approvals","When leave is approved or rejected"],["notifyPayrollProcessed","Payroll Processed","Monthly payroll notifications"]].map(([key,l,d])=>(
        <div key={key} className={`flex items-center justify-between py-2 border-b ${c("border-white/[0.04]","border-slate-100")} last:border-0`}><div><p className={`text-sm ${c("text-slate-200","text-slate-700")}`}>{l}</p><p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{d}</p></div><div onClick={()=>isAdmin&&toggle(key)} className={`w-10 h-5 rounded-full relative ${isAdmin?"cursor-pointer":""} ${form[key]?"bg-indigo-600":c("bg-slate-700","bg-slate-300")}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${form[key]?"left-5":"left-0.5"}`}/></div>
        </div>
      ))}</div></Card>}

      {tab==="security"&&<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        <Card className="p-5"><h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Authentication</h3><div className="space-y-3">
          <div className={`flex items-center justify-between p-3 rounded-lg ${c("bg-slate-700/20","bg-slate-50")}`}><span className={`text-sm ${c("text-slate-300","text-slate-700")}`}>Two-Factor Authentication</span><div onClick={()=>isAdmin&&toggle("twoFactorEnabled")} className={`w-9 h-5 rounded-full relative ${isAdmin?"cursor-pointer":""} ${form.twoFactorEnabled?"bg-emerald-500":c("bg-slate-700","bg-slate-300")}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 ${form.twoFactorEnabled?"left-4":"left-0.5"}`}/></div></div>
          <div className={`flex items-center justify-between p-3 rounded-lg ${c("bg-slate-700/20","bg-slate-50")}`}><span className={`text-sm ${c("text-slate-300","text-slate-700")}`}>SSO / SAML</span><div onClick={()=>isAdmin&&toggle("ssoEnabled")} className={`w-9 h-5 rounded-full relative ${isAdmin?"cursor-pointer":""} ${form.ssoEnabled?"bg-emerald-500":c("bg-slate-700","bg-slate-300")}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 ${form.ssoEnabled?"left-4":"left-0.5"}`}/></div></div>
          <div className={`flex items-center justify-between p-3 rounded-lg ${c("bg-slate-700/20","bg-slate-50")}`}><span className={`text-sm ${c("text-slate-300","text-slate-700")}`}>Password Policy</span><span className="text-xs font-medium text-amber-500">{form.passwordPolicy}</span></div>
          <div className={`flex items-center justify-between p-3 rounded-lg ${c("bg-slate-700/20","bg-slate-50")}`}><span className={`text-sm ${c("text-slate-300","text-slate-700")}`}>Session Timeout</span><span className={`text-xs font-medium ${c("text-slate-400","text-slate-500")}`}>{form.sessionTimeoutHours} hours</span></div>
        </div></Card>
        <Card className="p-5"><h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Active Sessions</h3><div className="space-y-3">
          {sessions.length===0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No active sessions.</p>}
          {sessions.map(s=><div key={s.id} className={`flex items-center justify-between p-3 rounded-lg ${c("bg-slate-700/20","bg-slate-50")}`}><div><p className={`text-sm ${c("text-slate-200","text-slate-700")}`}>{s.device}</p><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{s.ip} · {s.last}</p></div>{s.current?<Badge variant="success">Current</Badge>:<button onClick={()=>revokeSession(s.id)} className="text-xs text-red-500">Revoke</button>}</div>)}
        </div></Card>
      </div>}

      {tab==="api"&&<Card className="p-5 max-w-2xl">
        <div className="flex items-center justify-between mb-4"><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>API Keys</h3>{isAdmin && <Btn size="sm" icon={Plus} onClick={generateKey}>Generate Key</Btn>}</div>
        {newKey && <div className={`p-3 mb-3 rounded-xl border ${c("bg-emerald-500/10 border-emerald-500/25","bg-emerald-50 border-emerald-200")}`}><p className="text-xs font-medium text-emerald-500 mb-1">Copy this key now — it won't be shown again:</p><code className="text-xs font-mono break-all">{newKey.rawKey}</code></div>}
        {!isAdmin && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>Only HR Admin or Super Admin can manage API keys.</p>}
        <div className="space-y-3">{apiKeys.map(k=>(
          <div key={k.id} className={`p-4 rounded-xl border ${c("bg-slate-700/20 border-white/[0.06]","bg-slate-50 border-slate-200")}`}>
            <div className="flex items-start justify-between mb-2"><div><p className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{k.name}</p><code className="text-xs text-indigo-500 font-mono mt-0.5 block">{k.key}</code></div><button onClick={()=>revokeKey(k.id)} className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-500 hover:text-red-400 hover:bg-slate-700","text-slate-400 hover:text-red-500 hover:bg-slate-200")}`}><Trash2 size={13}/></button></div>
            <div className={`flex items-center gap-4 text-[11px] ${c("text-slate-600","text-slate-400")} flex-wrap`}><span>Created {k.created}</span><span>Last used {k.lastUsed}</span><Badge variant="default">{k.permissions}</Badge></div>
          </div>
        ))}</div>
      </Card>}
    </div>
  );
}

function ProfilePage() {
  const { c } = useTheme();
  const { authUser, updateAuthUser } = useAuth();
  const u: AuthUser = authUser || { id: 0, name: "Guest", email: "", avatar: "?", avatarColor: "bg-slate-500", role: "employee", roleLabel: "Employee", dept: "", title: "", phone: "", location: "", permissions: [] };
  const nameParts = u.name.split(" ");
  const [firstName, setFirstName] = useState(nameParts[0]||"");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ")||"");
  const [phone, setPhone] = useState(u.phone);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const inp=`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${c("bg-slate-800/60 border-white/[0.08] text-slate-300 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-700 focus:border-indigo-400")}`;
  const cfg = roleConfig[u.role];

  const save = async () => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone }),
    });
    const data = await res.json();
    if (res.ok && data.user) updateAuthUser(data.user);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const changePassword = async () => {
    setPwError("");
    setPwSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) { setPwError("All fields are required."); return; }
    if (newPassword.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("New passwords do not match."); return; }
    setPwSubmitting(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || "Could not change password."); return; }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPwSuccess(true);
      setTimeout(()=>setPwSuccess(false), 3000);
    } catch {
      setPwError("Could not reach the server. Please try again.");
    } finally {
      setPwSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage personal information"/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-full ${u.avatarColor} flex items-center justify-center text-2xl font-bold text-white mb-4`}>{u.avatar}</div>
          <h2 className={`text-lg font-bold ${c("text-white","text-slate-900")}`}>{u.name}</h2>
          <p className={`text-sm mt-0.5 ${c("text-slate-400","text-slate-500")}`}>{u.title}</p>
          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{u.roleLabel}</span>
            <Badge variant="success">Active</Badge>
          </div>
          <div className={`w-full mt-6 space-y-2 text-xs text-left ${c("text-slate-500","text-slate-400")}`}>
            <div className="flex items-center gap-2"><Mail size={12}/>{u.email}</div>
            <div className="flex items-center gap-2"><Building2 size={12}/>{u.dept}</div>
            {u.location && <div className="flex items-center gap-2"><MapPin size={12}/>{u.location}</div>}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Personal Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>First Name</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} className={inp}/></div>
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>Last Name</label><input value={lastName} onChange={e=>setLastName(e.target.value)} className={inp}/></div>
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>Email</label><input disabled value={u.email} className={inp}/></div>
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} className={inp}/></div>
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>Job Title</label><input disabled value={u.title} className={inp}/></div>
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>Department</label><input disabled value={u.dept} className={inp}/></div>
          </div>
          <p className={`text-xs mt-2 ${c("text-slate-500","text-slate-400")}`}>Job title and department are managed by HR.</p>
          <div className="flex items-center gap-3 mt-4">
            <Btn variant="primary" size="sm" icon={RefreshCw} onClick={save}>Save Changes</Btn>
            {saved && <span className="text-xs text-emerald-500">Saved</span>}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-3">
          <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Change Password</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>Current Password</label><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className={inp}/></div>
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>New Password</label><input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={inp}/></div>
            <div><label className={`text-[11px] block mb-1 ${c("text-slate-500","text-slate-400")}`}>Confirm New Password</label><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={inp}/></div>
          </div>
          <p className={`text-xs mt-2 ${c("text-slate-500","text-slate-400")}`}>At least 8 characters. You'll stay signed in here; other devices will be signed out.</p>
          {pwError && <p className="text-xs text-red-400 mt-2">{pwError}</p>}
          <div className="flex items-center gap-3 mt-4">
            <Btn variant="primary" size="sm" icon={Lock} onClick={changePassword} disabled={pwSubmitting}>{pwSubmitting ? "Changing..." : "Change Password"}</Btn>
            {pwSuccess && <span className="text-xs text-emerald-500">Password changed</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { c } = useTheme();
  const reports=[
    {name:"Headcount Report",desc:"Employee names, departments, titles, status, and join dates",type:"HR",key:"headcount",icon:Users,color:"bg-indigo-500/15 text-indigo-500"},
    {name:"Payroll Summary",desc:"Granted payroll amounts by employee and month",type:"Finance",key:"payroll",icon:DollarSign,color:"bg-emerald-500/15 text-emerald-500"},
    {name:"Expenses Report",desc:"Monthly operating expenses by category, vs budget",type:"Finance",key:"expenses",icon:Wallet,color:"bg-rose-500/15 text-rose-500"},
    {name:"Project Delivery Report",desc:"Project status, budget vs spend, and task completion",type:"Projects",key:"projects",icon:FolderKanban,color:"bg-violet-500/15 text-violet-500"},
    {name:"Attendance Report",desc:"30-day attendance rate per employee",type:"HR",key:"attendance",icon:Clock,color:"bg-amber-500/15 text-amber-500"},
    {name:"Department KPI Report",desc:"KPI achievement vs targets across all departments",type:"Analytics",key:"kpi",icon:Target,color:"bg-cyan-500/15 text-cyan-500"},
    {name:"OKR Summary",desc:"Objectives, key results, owners, and progress by quarter",type:"Analytics",key:"okr",icon:Zap,color:"bg-indigo-500/15 text-indigo-500"},
  ];
  const download = (key: string) => { window.location.href = `/api/reports/export?type=${key}`; };
  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and download organization reports"/>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{reports.map(r=>(
        <Card key={r.name} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5" onClick={()=>download(r.key)}>
          <div className="flex items-start gap-3 mb-4"><div className={`w-10 h-10 rounded-xl ${r.color} flex items-center justify-center flex-shrink-0`}><r.icon size={18}/></div><div><h4 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{r.name}</h4><p className={`text-xs mt-0.5 leading-relaxed ${c("text-slate-500","text-slate-400")}`}>{r.desc}</p></div></div>
          <div className="flex items-center justify-between"><Badge variant="default">{r.type}</Badge><span className="text-xs text-indigo-500 flex items-center gap-1"><Download size={11}/>Download CSV</span></div>
        </Card>
      ))}</div>
    </div>
  );
}

// ─── EMPLOYEE PROFILE PAGE ───────────────────────────────────────────────────

const ROLE_LEVEL_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "team-lead", label: "Team Lead" },
  { value: "manager", label: "Manager" },
  { value: "2nd-level-manager", label: "2nd Level Manager" },
  { value: "1st-level-manager", label: "1st Level Manager" },
  { value: "hr-admin", label: "HR Admin" },
  { value: "super-admin", label: "Super Admin" },
];

function EmployeeProfilePage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { selectedEmployeeId, navigateTo } = useApp();
  const [emp, setEmp] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const [tasks, setTasks] = useState<any[]>([]);
  const [empProjects, setEmpProjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [leave, setLeave] = useState<any>(null);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [editingRole, setEditingRole] = useState(false);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState("");

  const canViewSensitive = authUser?.id === selectedEmployeeId || authUser?.role === "super-admin";
  const canEditRole = authUser?.role === "super-admin";

  const changeRoleLevel = async (roleLevel: string) => {
    setRoleBusy(true);
    setRoleError("");
    try {
      const res = await fetch(`/api/employees/${selectedEmployeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleLevel }),
      });
      const d = await res.json();
      if (!res.ok) { setRoleError(d.error || "Could not change role level."); return; }
      setEmp((prev: any) => prev && { ...prev, roleLevel });
      setEditingRole(false);
    } finally {
      setRoleBusy(false);
    }
  };
  const canViewEmpTasks = authUser?.id === selectedEmployeeId || TASK_ADMIN_UI_ROLES.includes(authUser?.role ?? "");

  useEffect(() => {
    fetch(`/api/employees/${selectedEmployeeId}`).then(r => r.json()).then(d => setEmp(d.employee)).catch(() => {});
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (!emp) return;
    if (canViewEmpTasks) fetch(`/api/tasks?assignee=${encodeURIComponent(emp.name)}`).then(r => r.json()).then(d => setTasks(d.tasks ?? []));
    fetch(`/api/projects?memberName=${encodeURIComponent(emp.name)}`).then(r => r.json()).then(d => setEmpProjects(d.projects ?? []));
    fetch("/api/performance").then(r => r.json()).then(setPerformance);
    if (canViewSensitive) {
      fetch(`/api/attendance?employeeId=${selectedEmployeeId}`).then(r => r.json()).then(setAttendance).catch(() => {});
      fetch(`/api/leave?employeeId=${selectedEmployeeId}`).then(r => r.json()).then(setLeave).catch(() => {});
      fetch(`/api/payroll?employeeId=${selectedEmployeeId}`).then(r => r.json()).then(d => setPayroll(d.payslips ?? [])).catch(() => {});
    }
  }, [emp, canViewSensitive, canViewEmpTasks]);

  if (!emp) return null;

  const myReview = performance?.reviews?.find((r: any) => r.name === emp.name);
  const tabs = canViewSensitive ? ["Overview", "Attendance", "Leave", "Payroll", "Performance"] : ["Overview", "Performance"];
  const tbtn = (id: string) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${tab === id ? "bg-indigo-600 text-white" : c("text-slate-400 hover:bg-slate-800/60 hover:text-slate-200","text-slate-500 hover:bg-slate-100 hover:text-slate-700")}`;

  return (
    <div className="space-y-5">
      <button onClick={() => navigateTo("employees")} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${c("text-slate-400 hover:text-indigo-400","text-slate-500 hover:text-indigo-600")}`}>
        <ChevronLeft size={16}/> Back to Employees
      </button>

      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex items-start gap-5 flex-1">
            <div className={`w-20 h-20 rounded-2xl ${emp.avatarColor} flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 ring-4 ${c("ring-slate-700","ring-slate-200")}`}>
              {emp.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className={`text-xl font-bold ${c("text-white","text-slate-900")}`}>{emp.name}</h1>
                <StatusBadge status={emp.status}/>
              </div>
              <p className={`text-sm mb-2 ${c("text-slate-400","text-slate-500")}`}>{emp.role}</p>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="info">{emp.dept}</Badge>
                {editingRole ? (
                  <div className="flex items-center gap-1.5">
                    <select defaultValue={emp.roleLevel} disabled={roleBusy}
                      onChange={e => changeRoleLevel(e.target.value)}
                      className={`text-xs rounded-lg px-2 py-1 border focus:outline-none ${c("bg-slate-800/60 border-white/[0.08] text-slate-300","bg-white border-slate-200 text-slate-700")}`}>
                      {ROLE_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => setEditingRole(false)} className={`text-xs ${c("text-slate-500 hover:text-slate-300","text-slate-400 hover:text-slate-600")}`}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <Badge variant="default">{ROLE_LEVEL_OPTIONS.find(o => o.value === emp.roleLevel)?.label ?? emp.roleLevel}</Badge>
                    {canEditRole && (
                      <button title="Change role level" onClick={() => setEditingRole(true)} className={`w-6 h-6 rounded flex items-center justify-center ${c("text-slate-500 hover:text-indigo-400 hover:bg-slate-700/60","text-slate-400 hover:text-indigo-500 hover:bg-slate-100")}`}>
                        <Edit2 size={12}/>
                      </button>
                    )}
                  </>
                )}
              </div>
              {roleError && <p className="text-xs text-red-500 mb-2">{roleError}</p>}
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs ${c("text-slate-500","text-slate-400")}`}>
                {emp.location && <span className="flex items-center gap-1.5"><MapPin size={11}/>{emp.location}</span>}
                <span className="flex items-center gap-1.5"><Mail size={11}/><span className="truncate">{emp.email}</span></span>
                {emp.phone && <span className="flex items-center gap-1.5"><Phone size={11}/>{emp.phone}</span>}
                <span className="flex items-center gap-1.5"><Calendar size={11}/>Joined {emp.joined}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t ${c("border-white/[0.06]","border-slate-100")}`}>
          {[
            { label: "Attendance", value: `${emp.attendance}%`, sub: "last 30 days", color: emp.attendance >= 95 ? "text-emerald-500" : "text-amber-500" },
            ...(canViewEmpTasks ? [{ label: "Open Tasks", value: String(tasks.filter((t: any) => t.status !== "done").length), sub: `${tasks.length} total`, color: "text-violet-500" }] : []),
            { label: "Projects", value: String(empProjects.length), sub: "assigned", color: "text-indigo-500" },
            ...(canViewSensitive ? [{ label: "Salary", value: `₹${(emp.salary/1000).toFixed(0)}K`, sub: "annual CTC", color: "text-emerald-500" }] : []),
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className={`text-[10px] font-semibold ${c("text-slate-300","text-slate-600")}`}>{s.label}</p>
              <p className={`text-[10px] ${c("text-slate-600","text-slate-400")}`}>{s.sub}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-1 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t.toLowerCase())} className={tbtn(t.toLowerCase())}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5">
              <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Current Projects</h3>
              {empProjects.length === 0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Not currently assigned to any project.</p>}
              <div className="space-y-4">
                {empProjects.map((p: any) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${c("text-slate-200","text-slate-700")}`}>{p.name}</span>
                      <StatusBadge status={p.status}/>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><ProgressBar value={p.progress} color="bg-indigo-500"/></div>
                      <span className={`text-xs w-8 ${c("text-slate-500","text-slate-400")}`}>{p.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          {canViewEmpTasks && (
            <div className="space-y-5">
              <Card className="p-5">
                <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Open Tasks</h3>
                {tasks.filter((t: any) => t.status !== "done").length === 0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No open tasks.</p>}
                <div className="space-y-2.5">
                  {tasks.filter((t: any) => t.status !== "done").slice(0, 6).map((t: any) => (
                    <div key={t.id} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${t.priority === "critical" ? "bg-red-500" : t.priority === "high" ? "bg-amber-500" : "bg-indigo-500"}`}/>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${c("text-slate-300","text-slate-700")}`}>{t.title}</p>
                        <p className={`text-[10px] mt-0.5 ${c("text-slate-600","text-slate-400")}`}>{t.project} · Due {t.due}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {tab === "attendance" && attendance && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-5">
              <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>This Month</h3>
              <div className="space-y-3">
                {[
                  { label: "Days Present", value: attendance.monthly.presentDays, color: "text-emerald-500" },
                  { label: "Late Arrivals", value: attendance.monthly.lateArrivals, color: "text-amber-500" },
                  { label: "Avg Hours/Day", value: `${attendance.monthly.avgHours}h`, color: c("text-slate-200","text-slate-700") },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <span className={`text-sm ${c("text-slate-400","text-slate-500")}`}>{s.label}</span>
                    <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5 md:col-span-2">
              <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Monthly Heatmap</h3>
              <div className="grid grid-cols-10 gap-1">
                {attendance.heatmap.map((d: any, i: number) => <div key={i} className={`w-full aspect-square rounded-sm ${!d.present ? "bg-red-500/40" : d.late ? "bg-amber-500/60" : "bg-emerald-500/60"}`} title={`Day ${d.day}`}/>)}
              </div>
            </Card>
          </div>
          <Card>
            <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Attendance Log</h3></div>
            {attendance.log.length === 0 && <p className={`p-4 text-xs ${c("text-slate-500","text-slate-400")}`}>No attendance recorded yet.</p>}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Date","In","Out","Hours","Status"].map(h => <th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
                <tbody>{attendance.log.map((a: any, i: number) => (
                  <tr key={i} className={`border-b ${c("border-white/[0.04]","border-slate-100")}`}>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{a.date}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{a.in}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{a.out}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{a.hours}</td>
                    <td className="px-4 py-3"><Badge variant={a.status === "present" ? "success" : a.status === "late" ? "warning" : "danger"}>{a.status}</Badge></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "leave" && leave && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {leave.balances.map((l: any) => (
              <Card key={l.type} className="p-4">
                <div className="flex items-center gap-2 mb-3"><div className={`w-2.5 h-2.5 rounded-full ${l.color}`}/><span className={`text-xs font-medium ${c("text-slate-300","text-slate-700")}`}>{l.type}</span></div>
                <div className={`text-2xl font-bold mb-1 ${c("text-white","text-slate-900")}`}>{l.remaining}<span className={`text-base font-normal ${c("text-slate-500","text-slate-400")}`}>/{l.total}</span></div>
                <ProgressBar value={(l.used / l.total) * 100} color={l.color}/>
              </Card>
            ))}
          </div>
          <Card>
            <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Leave History</h3></div>
            {leave.history.length === 0 && <p className={`p-4 text-xs ${c("text-slate-500","text-slate-400")}`}>No leave requests yet.</p>}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Dates","Type","Days","Reason","Status"].map(h => <th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
                <tbody>{leave.history.map((l: any, i: number) => (
                  <tr key={i} className={`border-b ${c("border-white/[0.04]","border-slate-100")}`}>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-300","text-slate-700")}`}>{l.dates}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{l.type}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{l.days}</td>
                    <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{l.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status}/></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "payroll" && (
        <Card>
          <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Payslip History</h3></div>
          {payroll.length === 0 && <p className={`p-4 text-xs ${c("text-slate-500","text-slate-400")}`}>No payslips generated yet.</p>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Month","Amount","Status"].map(h => <th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
              <tbody>{payroll.map((p: any) => (
                <tr key={p.id} className={`border-b ${c("border-white/[0.04]","border-slate-100")}`}>
                  <td className={`px-4 py-3 text-sm font-medium ${c("text-slate-300","text-slate-700")}`}>{p.month}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${c("text-white","text-slate-900")}`}>₹{p.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3"><Badge variant="success">{p.status}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "performance" && (
        <Card>
          <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Performance Review</h3></div>
          <div className="p-5">
            {!myReview && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>No performance review on record for the current cycle.</p>}
            {myReview && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} size={16} className={myReview.score && s <= Math.round(myReview.score) ? "text-amber-500 fill-amber-500" : c("text-slate-600","text-slate-300")}/>)}
                </div>
                <span className={`text-lg font-bold ${c("text-white","text-slate-900")}`}>{myReview.score != null ? myReview.score.toFixed(1) : "—"} / 5</span>
                <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{myReview.period} · Reviewer: {myReview.reviewer}</span>
                <StatusBadge status={myReview.status}/>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── MY WORK PAGE ────────────────────────────────────────────────────────────

function MyWorkPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { openModal, activeModal } = useModal();
  const [tab, setTab] = useState("today");
  const [taskView, setTaskView] = useState<"kanban"|"list">("kanban");
  const [tasks, setTasks] = useState<any[]>([]);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [dropError, setDropError] = useState("");

  const loadTasks = () => { if (authUser) fetch(`/api/tasks?assignee=${encodeURIComponent(authUser.name)}`).then(r => r.json()).then(d => setTasks(d.tasks ?? [])); };
  useEffect(() => {
    if (activeModal === "create-task" || activeModal === "task-detail") return;
    loadTasks();
  }, [authUser, activeModal]);

  const openTask = (id: number) => openModal("task-detail", { taskId: id });
  const dropTask = async (taskId: number, status: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === status) return;
    setDropError("");
    const prev = tasks;
    setTasks(p => p.map(t => t.id === taskId ? { ...t, status } : t));
    const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) {
      setTasks(prev);
      const d = await res.json().catch(() => ({}));
      setDropError(d.error || "Could not update task status.");
    }
  };
  useEffect(() => { if (authUser) fetch(`/api/projects?memberName=${encodeURIComponent(authUser.name)}`).then(r => r.json()).then(d => setMyProjects(d.projects ?? [])); }, [authUser]);
  useEffect(() => { fetch("/api/attendance").then(r => r.json()).then(setAttendance).catch(() => {}); }, []);
  useEffect(() => {
    if (activeModal === "add-objective") return;
    if (authUser) fetch("/api/okr").then(r => r.json()).then(d => setObjectives((d.objectives ?? []).filter((o: any) => o.owner === authUser.name)));
  }, [authUser, activeModal]);
  useEffect(() => {
    const now = new Date();
    fetch(`/api/calendar?year=${now.getFullYear()}&month=${now.getMonth()+1}`).then(r => r.json()).then(d => setTodayEvents((d.events ?? []).filter((e: any) => e.day === now.getDate())));
  }, []);

  const tabs = [
    { id: "today", label: "Today" },
    { id: "tasks", label: "My Tasks" },
    { id: "projects", label: "Projects" },
    { id: "goals", label: "Goals" },
    { id: "schedule", label: "Schedule" },
  ];

  const taskCols = [
    { id: "todo", label: "To Do", border: c("border-slate-600","border-slate-300") },
    { id: "in-progress", label: "In Progress", border: "border-indigo-500" },
    { id: "review", label: "Review", border: "border-amber-500" },
    { id: "done", label: "Done", border: "border-emerald-500" },
  ];

  const openTasks = tasks.filter(t => t.status !== "done");

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-6 ${c("bg-gradient-to-r from-indigo-600/20 to-slate-800/60 border-indigo-500/20","bg-gradient-to-r from-indigo-50 to-slate-50 border-indigo-200")}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${authUser?.avatarColor || "bg-indigo-600"} flex items-center justify-center text-xl font-bold text-white shadow-lg`}>{authUser?.avatar}</div>
          <div>
            <h1 className={`text-2xl font-bold ${c("text-white","text-slate-900")}`}>My Work</h1>
            <p className={`text-sm mt-0.5 ${c("text-slate-400","text-slate-500")}`}>{authUser?.name} · {authUser?.title}</p>
            {attendance && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className={`w-2 h-2 rounded-full ${attendance.today.punchedIn ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
                <span className={`text-xs font-medium ${attendance.today.punchedIn ? c("text-emerald-400","text-emerald-600") : c("text-slate-500","text-slate-400")}`}>{attendance.today.punchedIn ? "Punched In" : "Not Punched In"}</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
          {[
            { label: "Open Tasks", value: String(openTasks.length), sub: `${tasks.length} total`, color: "text-amber-500", icon: AlertCircle },
            { label: "Projects", value: String(myProjects.length), sub: "assigned", color: "text-violet-500", icon: FolderKanban },
            { label: "Attendance", value: attendance ? `${attendance.monthly.presentDays}/${attendance.monthly.totalRecorded}` : "—", sub: "this month", color: "text-emerald-500", icon: Clock },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 ${c("bg-slate-800/50","bg-white/70")} border ${c("border-white/[0.06]","border-slate-200/80")}`}>
              <div className="flex items-center justify-between mb-1"><span className={`text-[10px] font-semibold uppercase tracking-wider ${c("text-slate-500","text-slate-400")}`}>{s.label}</span><s.icon size={13} className={s.color} /></div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className={`text-[10px] mt-0.5 ${c("text-slate-600","text-slate-400")}`}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-indigo-600 text-white" : c("text-slate-400 hover:text-slate-200 hover:bg-slate-800/60","text-slate-500 hover:text-slate-700 hover:bg-slate-100")}`}>{t.label}</button>)}
      </div>

      {tab === "today" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Today's Schedule</h3>
            {todayEvents.length === 0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No events scheduled today.</p>}
            <div className="space-y-2">
              {todayEvents.map((ev: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${c("bg-slate-700/20","bg-slate-50")}`}>
                  <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${ev.type === "meeting" ? "bg-indigo-500" : ev.type === "deadline" ? "bg-red-500" : "bg-emerald-500"}`}/>
                  <p className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{ev.title}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Priority Tasks</h3>
            {openTasks.length === 0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No open tasks — nice work!</p>}
            <div className="space-y-2">
              {openTasks.slice(0, 5).map((task: any) => (
                <div key={task.id} onClick={()=>openTask(task.id)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${c("border-white/[0.06] bg-slate-800/40 hover:bg-slate-800/60","border-slate-200 bg-slate-50/60 hover:bg-slate-100")}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${c("text-slate-200","text-slate-800")}`}>{task.title}</p>
                    <span className={`text-[10px] ${c("text-slate-500","text-slate-400")}`}>{task.project} · Due {task.due}</span>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "tasks" && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <button onClick={() => setTaskView("kanban")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${taskView === "kanban" ? "bg-indigo-600 text-white" : c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><GripVertical size={15} /></button>
                <button onClick={() => setTaskView("list")} className={`w-8 h-8 rounded-lg flex items-center justify-center ${taskView === "list" ? "bg-indigo-600 text-white" : c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}><List size={15} /></button>
              </div>
              <span className={`text-sm ${c("text-slate-400","text-slate-500")}`}>{tasks.length} tasks total · {tasks.filter(t => t.status === "done").length} completed</span>
            </div>
            <Btn size="sm" icon={Plus} onClick={() => openModal("create-task")}>New Task</Btn>
          </div>
          {dropError && <p className="text-xs text-red-400 mb-3">{dropError}</p>}
          {taskView === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {taskCols.map(col => {
                const colTasks = tasks.filter(t => t.status === col.id);
                return (
                  <div key={col.id} className="flex flex-col">
                    <div className="flex items-center gap-2 px-1 mb-3">
                      <div className={`w-3 h-3 rounded-sm border-2 ${col.border}`} />
                      <span className={`text-sm font-semibold ${c("text-slate-300","text-slate-700")}`}>{col.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${c("text-slate-600 bg-slate-800","text-slate-500 bg-slate-100")}`}>{colTasks.length}</span>
                    </div>
                    <TaskDropColumn status={col.id} onDropTask={dropTask}>
                      {colTasks.map(task => (
                        <DraggableTaskCard key={task.id} task={task} canDrag={canDragTask(task, authUser)} onClick={()=>openTask(task.id)}>
                          <Card className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className={`text-xs font-semibold leading-snug ${c("text-slate-200","text-slate-800")}`}>{task.title}</p>
                              <PriorityBadge priority={task.priority} />
                            </div>
                            <p className={`text-[10px] mb-3 ${c("text-slate-500","text-slate-400")}`}>{task.project}</p>
                            <div className="flex items-center gap-1 mb-3 flex-wrap">{task.tags.map((tag: string) => <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${c("bg-slate-700 text-slate-400","bg-slate-100 text-slate-500")}`}>{tag}</span>)}</div>
                            <div className={`flex items-center justify-between pt-2.5 border-t ${c("border-white/[0.06]","border-slate-100")} text-[10px] ${c("text-slate-500","text-slate-400")}`}>
                              <span>Due {task.due}</span>
                            </div>
                            {task.assignedBy && <p className={`text-[9px] mt-2 ${c("text-slate-600","text-slate-400")}`}>Assigned by {task.assignedBy}</p>}
                          </Card>
                        </DraggableTaskCard>
                      ))}
                    </TaskDropColumn>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Task","Project","Priority","Status","Due"].map(h => <th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id} onClick={()=>openTask(task.id)} className={`border-b cursor-pointer ${c("border-white/[0.04] hover:bg-slate-700/20","border-slate-100 hover:bg-slate-50")}`}>
                        <td className={`px-4 py-3 text-sm ${c("text-slate-200","text-slate-800")}`}>{task.title}</td>
                        <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{task.project}</td>
                        <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                        <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                        <td className={`px-4 py-3 text-sm ${c("text-slate-400","text-slate-500")}`}>{task.due}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "projects" && (
        <div>
          {myProjects.length === 0 && <p className={`text-sm ${c("text-slate-400","text-slate-500")}`}>You're not assigned to any projects yet.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myProjects.map((p: any) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{p.name}</h3>
                    <p className={`text-xs mt-0.5 ${c("text-slate-500","text-slate-400")}`}>{p.manager} · {p.team} team members</p>
                  </div>
                  <div className="flex items-center gap-2"><PriorityBadge priority={p.priority} /><StatusBadge status={p.status} /></div>
                </div>
                <ProgressBar value={p.progress} color={p.progress >= 80 ? "bg-emerald-500" : p.progress >= 50 ? "bg-indigo-500" : "bg-amber-500"} />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{p.progress}% complete</span>
                  <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Due {p.deadline}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm ${c("text-slate-400","text-slate-500")}`}>Objectives you own</p>
            <Btn size="sm" icon={Plus} onClick={() => openModal("add-objective")}>Add Objective</Btn>
          </div>
          {objectives.length === 0 && <p className={`text-sm ${c("text-slate-500","text-slate-400")}`}>No objectives assigned to you yet.</p>}
          <div className="space-y-3">
            {objectives.map((goal: any) => (
              <Card key={goal.id} className="p-5">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h4 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>{goal.title}</h4>
                  <Badge variant="default">{goal.quarter}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs"><ProgressBar value={goal.progress} color="bg-indigo-500" /></div>
                  <span className="text-sm font-bold text-indigo-500">{goal.progress}%</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {goal.krs.map((kr: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <StatusBadge status={kr.status}/>
                      <span className={c("text-slate-400","text-slate-500")}>{kr.title}</span>
                      <span className={`ml-auto ${c("text-slate-500","text-slate-400")}`}>{kr.progress}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <Card className="p-5">
          <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Today's Events</h3>
          {todayEvents.length === 0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Nothing on your calendar today.</p>}
          <div className="space-y-2">
            {todayEvents.map((ev: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${c("bg-slate-700/20","bg-slate-50")}`}>
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${ev.type === "meeting" ? "bg-indigo-500" : ev.type === "deadline" ? "bg-red-500" : "bg-emerald-500"}`} />
                <p className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{ev.title}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────

const roleConfig: Record<UserRole, { icon: React.ElementType; color: string; bg: string; desc: string }> = {
  "super-admin":        { icon: ShieldCheck, color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30",    desc: "Full system access · All modules" },
  "1st-level-manager":  { icon: Award,       color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30", desc: "Director-level · Cross-dept view" },
  "2nd-level-manager":  { icon: Users,       color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/30", desc: "Senior Manager · Team analytics" },
  "manager":            { icon: Target,       color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30", desc: "Team Manager · Project access" },
  "team-lead":          { icon: Network,      color: "text-cyan-400",   bg: "bg-cyan-500/15 border-cyan-500/30",   desc: "Team Lead · Tasks & sprints" },
  "hr-admin":           { icon: FileText,     color: "text-pink-400",   bg: "bg-pink-500/15 border-pink-500/30",   desc: "HR Admin · People & payroll" },
  "employee":           { icon: User,         color: "text-emerald-400",bg: "bg-emerald-500/15 border-emerald-500/30", desc: "Employee · My work & tasks" },
};

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid credentials."); return; }
      login(data.user);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#060D1F", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><Layers size={16} className="text-white"/></div>
          <span className="text-base font-bold text-white">RIAURA Work OS</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1 text-center">Sign in to your workspace</h2>
          <p className="text-slate-400 text-sm mb-7">Enter your credentials below</p>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Work Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className="w-full bg-slate-800/60 border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  placeholder="you@riaura.com" autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className="w-full bg-slate-800/60 border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  placeholder="••••••••" autoComplete="current-password" />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <Eye size={15} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setRemember(v => !v)}
                  className={`w-9 h-5 rounded-full relative transition-colors ${remember ? "bg-indigo-600" : "bg-slate-700"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${remember ? "left-4" : "left-0.5"}`} />
                </div>
                <span className="text-xs text-slate-400">Remember me</span>
              </label>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button onClick={handleLogin} disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : (
                <>Sign In<ChevronRight size={16} /></>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-700 mt-5">
            RIAURA Work OS · Enterprise Edition · v3.0.0
          </p>
      </div>
    </div>
  );
}

// ─── SHARED FORM HELPERS ─────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { c } = useTheme();
  return <label className={`text-xs font-semibold block mb-1.5 ${c("text-slate-400","text-slate-600")}`}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>;
}

function FInput({ value, onChange, placeholder, type = "text", className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  const { c } = useTheme();
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${c("bg-slate-800/60 border-white/[0.08] text-slate-200 placeholder-slate-600 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400")} ${className}`} />;
}

function FSelect({ value, onChange, children, className = "" }: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  const { c, light } = useTheme();
  return <select value={value} onChange={e => onChange(e.target.value)}
    style={{ colorScheme: light ? "light" : "dark" }}
    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${c("bg-slate-800 border-white/[0.08] text-slate-200 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-800 focus:border-indigo-400")} ${className}`}>
    {children}
  </select>;
}

function FTextarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const { c } = useTheme();
  return <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none transition-colors ${c("bg-slate-800/60 border-white/[0.08] text-slate-200 placeholder-slate-600 focus:border-indigo-500/50","bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400")}`} />;
}

function ModalOverlay({ title, subtitle, onClose, children, size = "md" }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  const { c } = useTheme();
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className={`w-full ${sizes[size]} my-8 ${c("bg-slate-900 border-white/[0.08]","bg-white border-slate-200")} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-start justify-between px-6 py-5 border-b ${c("border-white/[0.06]","border-slate-200")}`}>
          <div>
            <h2 className={`text-base font-bold ${c("text-white","text-slate-900")}`}>{title}</h2>
            {subtitle && <p className={`text-xs mt-0.5 ${c("text-slate-400","text-slate-500")}`}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${c("text-slate-500 hover:text-slate-300 hover:bg-slate-800","text-slate-400 hover:text-slate-600 hover:bg-slate-100")}`}><X size={18}/></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 mb-4"><CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0"/><p className="text-sm text-emerald-400">{message}</p></div>;
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

// Shared real-data lookups for the create/edit modals below (dropdowns for
// manager, team lead, assignee, owner, department, etc.).
function useEmployeeDirectory() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { fetch("/api/employees").then(r => r.json()).then(d => setList(d.employees ?? [])); }, []);
  return list;
}
function useDepartmentDirectory() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { fetch("/api/departments").then(r => r.json()).then(d => setList(d.departments ?? [])); }, []);
  return list;
}

function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const { modalData } = useModal();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const departments = useDepartmentDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({
    firstName: "", lastName: "", email: "", phone: "", dob: "", gender: "Male", nationality: "American",
    dept: "", jobTitle: "", roleLevel: "employee", empType: "Full-time", workLoc: "Hybrid",
    manager: modalData?.defaultManager ?? "", startDate: "", probationEnd: "",
    salary: "", payFreq: "Monthly", currency: "INR", annualLeave: "24", sickLeave: "12",
  });
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  const stepLabels = ["Personal Info", "Employment", "Compensation"];
  const deptList = departments.map((d: any) => d.name);
  const managerList = employees.map((e: any) => e.name);

  const handleCreate = async () => {
    if (!(f.firstName && f.email && f.jobTitle)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not create employee."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Add Employee" onClose={onClose}>
      <SuccessBanner message={`${f.firstName} ${f.lastName} has been added successfully and an onboarding email has been sent to ${f.email}.`} />
      <div className={`rounded-xl p-4 ${c("bg-slate-800/50","bg-slate-50")} space-y-2 text-sm`}>
        <div className="flex justify-between"><span className={c("text-slate-400","text-slate-500")}>Name</span><span className={c("text-white","text-slate-900")} >{f.firstName} {f.lastName}</span></div>
        <div className="flex justify-between"><span className={c("text-slate-400","text-slate-500")}>Department</span><span className={c("text-white","text-slate-900")}>{f.dept}</span></div>
        <div className="flex justify-between"><span className={c("text-slate-400","text-slate-500")}>Role</span><span className={c("text-white","text-slate-900")}>{f.jobTitle}</span></div>
        <div className="flex justify-between"><span className={c("text-slate-400","text-slate-500")}>Start Date</span><span className={c("text-white","text-slate-900")}>{f.startDate}</span></div>
      </div>
      <div className="flex gap-2 mt-4"><Btn variant="primary" onClick={onClose}>Done</Btn><Btn variant="secondary" onClick={() => { setDone(false); setStep(1); setF(p => ({...p, firstName:"", lastName:"", email:""})); }}>Add Another</Btn></div>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Add New Employee" subtitle={`Step ${step} of 3 — ${stepLabels[step-1]}`} onClose={onClose} size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {stepLabels.map((sl, i) => (
          <div key={sl} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > i+1 ? "bg-emerald-500 text-white" : step === i+1 ? "bg-indigo-600 text-white" : c("bg-slate-700 text-slate-500","bg-slate-200 text-slate-400")}`}>
              {step > i+1 ? <CheckCircle2 size={14}/> : i+1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === i+1 ? c("text-white","text-slate-800") : c("text-slate-500","text-slate-400")}`}>{sl}</span>
            {i < stepLabels.length-1 && <div className={`flex-1 h-px ${step > i+1 ? "bg-emerald-500" : c("bg-slate-700","bg-slate-200")}`}/>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="First Name" required/><FInput value={f.firstName} onChange={v => set("firstName",v)} placeholder="e.g. Sarah"/></div>
            <div><FieldLabel label="Last Name" required/><FInput value={f.lastName} onChange={v => set("lastName",v)} placeholder="e.g. Chen"/></div>
          </div>
          <div><FieldLabel label="Work Email" required/><FInput value={f.email} onChange={v => set("email",v)} placeholder="name@riaura.com" type="email"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Phone Number"/><FInput value={f.phone} onChange={v => set("phone",v)} placeholder="+1 (555) 000-0000"/></div>
            <div><FieldLabel label="Date of Birth"/><FInput value={f.dob} onChange={v => set("dob",v)} type="date"/></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Gender"/><FSelect value={f.gender} onChange={v => set("gender",v)}><option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option></FSelect></div>
            <div><FieldLabel label="Nationality"/><FInput value={f.nationality} onChange={v => set("nationality",v)} placeholder="e.g. American"/></div>
          </div>
          <div className={`flex items-center gap-3 p-4 rounded-xl border border-dashed ${c("border-slate-600 hover:border-indigo-500/50","border-slate-300 hover:border-indigo-400")} cursor-pointer transition-colors`}>
            <Upload size={20} className={c("text-slate-500","text-slate-400")}/>
            <div><p className={`text-sm font-medium ${c("text-slate-300","text-slate-600")}`}>Upload Profile Photo</p><p className={`text-xs ${c("text-slate-600","text-slate-400")}`}>PNG, JPG up to 5MB</p></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Department" required/><FSelect value={f.dept} onChange={v => set("dept",v)}><option value="">Select department...</option>{deptList.map((d: string) => <option key={d}>{d}</option>)}</FSelect></div>
            <div><FieldLabel label="Job Title" required/><FInput value={f.jobTitle} onChange={v => set("jobTitle",v)} placeholder="e.g. Senior Engineer"/></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Role Level" required/><FSelect value={f.roleLevel} onChange={v => set("roleLevel",v)}><option value="employee">Employee</option><option value="team-lead">Team Lead</option><option value="manager">Manager</option><option value="2nd-level-manager">2nd Level Manager</option><option value="1st-level-manager">1st Level Manager</option></FSelect></div>
            <div><FieldLabel label="Employment Type"/><FSelect value={f.empType} onChange={v => set("empType",v)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option></FSelect></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Work Location"/><FSelect value={f.workLoc} onChange={v => set("workLoc",v)}><option>On-site</option><option>Remote</option><option>Hybrid</option></FSelect></div>
            <div><FieldLabel label="Reporting Manager"/><FSelect value={f.manager} onChange={v => set("manager",v)}><option value="">None</option>{managerList.map((m: string) => <option key={m}>{m}</option>)}</FSelect></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Start Date" required/><FInput value={f.startDate} onChange={v => set("startDate",v)} type="date"/></div>
            <div><FieldLabel label="Probation End Date"/><FInput value={f.probationEnd} onChange={v => set("probationEnd",v)} type="date"/></div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Basic Salary (Annual)" required/><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span><FInput value={f.salary} onChange={v => set("salary",v)} placeholder="e.g. 1200000" className="pl-7"/></div></div>
            <div><FieldLabel label="Pay Frequency"/><FSelect value={f.payFreq} onChange={v => set("payFreq",v)}><option>Monthly</option><option>Bi-weekly</option><option>Weekly</option></FSelect></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Currency"/><FSelect value={f.currency} onChange={v => set("currency",v)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></FSelect></div>
            {f.salary && <div className={`p-3 rounded-xl ${c("bg-indigo-600/10","bg-indigo-50")} border ${c("border-indigo-500/20","border-indigo-200")}`}><p className={`text-xs ${c("text-indigo-400","text-indigo-600")}`}>Monthly: <strong className="text-sm">₹{(parseFloat(f.salary||"0")/12).toLocaleString("en-IN",{maximumFractionDigits:0})}</strong></p></div>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel label="Annual Leave (days)"/><FInput value={f.annualLeave} onChange={v => set("annualLeave",v)} placeholder="24"/></div>
            <div><FieldLabel label="Sick Leave (days)"/><FInput value={f.sickLeave} onChange={v => set("sickLeave",v)} placeholder="12"/></div>
          </div>
          <div className={`p-4 rounded-xl ${c("bg-slate-800/50","bg-slate-50")} space-y-2`}>
            <p className={`text-xs font-semibold ${c("text-slate-400","text-slate-600")}`}>Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[["Name",`${f.firstName} ${f.lastName}`],["Email",f.email],["Department",f.dept],["Title",f.jobTitle],["Type",f.empType],["Location",f.workLoc]].map(([l,v]) => v ? <div key={l}><span className={c("text-slate-500","text-slate-400")}>{l}: </span><span className={c("text-slate-200","text-slate-700")}>{v}</span></div> : null)}
            </div>
          </div>
        </div>
      )}

      {submitError && <p className="text-xs text-red-400 mt-3">{submitError}</p>}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
        <Btn variant="secondary" onClick={() => step > 1 ? setStep(s => s-1) : onClose()}>{step > 1 ? "← Back" : "Cancel"}</Btn>
        {step < 3
          ? <Btn variant="primary" onClick={() => setStep(s => s+1)} icon={ChevronRight}>Next Step</Btn>
          : <Btn variant="primary" onClick={handleCreate}>{submitting ? "Creating..." : "Create Employee"}</Btn>
        }
      </div>
    </ModalOverlay>
  );
}

function AddDepartmentModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const departments = useDepartmentDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ name: "", head: "", parent: "None", desc: "", code: "", budget: "", color: "bg-indigo-500" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const colors = ["bg-indigo-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-pink-500","bg-teal-500"];

  const handleCreate = async () => {
    if (!(f.name && f.head)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not create department."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Add Department" onClose={onClose}>
      <SuccessBanner message={`${f.name} department created successfully.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Add New Department" subtitle="Create a new organizational department" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Department Name" required/><FInput value={f.name} onChange={v => set("name",v)} placeholder="e.g. Engineering"/></div>
          <div><FieldLabel label="Department Code"/><FInput value={f.code} onChange={v => set("code",v)} placeholder="e.g. ENG-001"/></div>
        </div>
        <div><FieldLabel label="Head of Department" required/><FSelect value={f.head} onChange={v => set("head",v)}><option value="">Select manager...</option>{employees.map(e => <option key={e.id}>{e.name}</option>)}</FSelect></div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Parent Department"/><FSelect value={f.parent} onChange={v => set("parent",v)}><option>None (Top-level)</option>{departments.map(d => <option key={d.id}>{d.name}</option>)}</FSelect></div>
          <div><FieldLabel label="Annual Budget (₹)"/><FInput value={f.budget} onChange={v => set("budget",v)} placeholder="e.g. 1500000"/></div>
        </div>
        <div><FieldLabel label="Description"/><FTextarea value={f.desc} onChange={v => set("desc",v)} placeholder="Brief description of this department's purpose and responsibilities..."/></div>
        <div>
          <FieldLabel label="Department Color"/>
          <div className="flex gap-2 mt-1">{colors.map(col => <button key={col} onClick={() => set("color",col)} className={`w-7 h-7 rounded-full ${col} transition-transform ${f.color === col ? "scale-125 ring-2 ring-white/40" : "hover:scale-110"}`}/>)}</div>
        </div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Plus} onClick={handleCreate}>{submitting ? "Creating..." : "Create Department"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function DepartmentDetailModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const { modalData } = useModal();
  const employees = useEmployeeDirectory();
  const [dept, setDept] = useState<any>(modalData?.dept ?? null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({ name: "", head: "", budget: "", color: "" });
  const colors = ["bg-indigo-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-pink-500","bg-teal-500"];

  useEffect(() => { setDept(modalData?.dept ?? null); }, [modalData?.dept]);

  if (!dept) return null;

  const startEdit = () => {
    setF({ name: dept.name, head: dept.head === "Unassigned" ? "" : dept.head, budget: dept.budget ? String(dept.budget) : "", color: dept.color });
    setError("");
    setEditing(true);
  };

  const save = async () => {
    if (!f.name.trim()) { setError("Department name is required."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not save changes."); return; }
      setDept((prev: any) => ({ ...prev, name: f.name, head: f.head || "Unassigned", budget: f.budget ? Math.round(Number(f.budget)) : prev.budget, color: f.color }));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${dept.name}? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not delete department."); return; }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay title={editing ? "Edit Department" : dept.name} onClose={onClose}>
      {editing ? (
        <div className="space-y-4">
          <div><FieldLabel label="Department Name" required/><FInput value={f.name} onChange={v=>setF(p=>({...p,name:v}))}/></div>
          <div><FieldLabel label="Head of Department"/><FSelect value={f.head} onChange={v=>setF(p=>({...p,head:v}))}><option value="">Unassigned</option>{employees.map((e:any)=><option key={e.id}>{e.name}</option>)}</FSelect></div>
          <div><FieldLabel label="Annual Budget (₹)"/><FInput value={f.budget} onChange={v=>setF(p=>({...p,budget:v}))} placeholder="e.g. 1500000"/></div>
          <div>
            <FieldLabel label="Department Color"/>
            <div className="flex gap-2 mt-1">{colors.map(col=><button key={col} onClick={()=>setF(p=>({...p,color:col}))} className={`w-7 h-7 rounded-full ${col} transition-transform ${f.color===col?"scale-125 ring-2 ring-white/40":"hover:scale-110"}`}/>)}</div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2"><Btn variant="primary" onClick={save} disabled={busy}>{busy?"Saving...":"Save"}</Btn><Btn variant="secondary" onClick={()=>setEditing(false)}>Cancel</Btn></div>
            <Btn variant="danger" size="sm" icon={Trash2} onClick={remove} disabled={busy}>{busy?"Deleting...":"Delete Department"}</Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${dept.color} flex items-center justify-center`}><Building2 size={20} className="text-white"/></div>
            <div><h3 className={`font-semibold text-sm ${c("text-white","text-slate-900")}`}>{dept.name}</h3><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{dept.employees} employees</p></div>
          </div>
          <div className="space-y-2 text-sm">
            {[["Head",dept.head],["Active Projects",String(dept.projects)],["Budget",`₹${(dept.budget/1000000).toFixed(2)}M`]].map(([label,val])=>(
              <div key={label as string} className="flex justify-between"><span className={c("text-slate-500","text-slate-400")}>{label}</span><span className={`font-medium ${c("text-slate-300","text-slate-700")}`}>{val}</span></div>
            ))}
          </div>
          <div>
            <div className="flex justify-between mb-1 text-xs"><span className={c("text-slate-500","text-slate-400")}>Utilization</span><span className={`font-semibold ${dept.utilization>=85?"text-emerald-500":dept.utilization>=70?"text-amber-500":"text-red-500"}`}>{dept.utilization}%</span></div>
            <ProgressBar value={dept.utilization} color={dept.utilization>=85?"bg-emerald-500":dept.utilization>=70?"bg-amber-500":"bg-red-500"}/>
          </div>
          <div>
            <p className={`text-xs font-semibold mb-2 ${c("text-slate-300","text-slate-700")}`}>Members ({dept.members?.length ?? 0})</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {(dept.members ?? []).map((m:any)=>(
                <div key={m.id} className={`flex items-center gap-2.5 p-2 rounded-lg ${c("bg-slate-800/50","bg-slate-50")}`}>
                  <Avatar initials={m.avatar} color={m.avatarColor} size="sm"/>
                  <div className="min-w-0"><p className={`text-sm truncate ${c("text-slate-200","text-slate-800")}`}>{m.name}</p><p className={`text-[11px] truncate ${c("text-slate-500","text-slate-400")}`}>{m.title}</p></div>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Btn variant="secondary" size="sm" icon={Edit2} onClick={startEdit}>Edit</Btn>
        </div>
      )}
    </ModalOverlay>
  );
}

function CreateTeamModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const departments = useDepartmentDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ name: "", dept: "", lead: "", desc: "", type: "Engineering", goals: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const toggle = (name: string) => setSelected(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);

  const handleCreate = async () => {
    if (!(f.name && f.lead)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, memberNames: selected }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not create team."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Create Team" onClose={onClose}>
      <SuccessBanner message={`Team "${f.name}" created with ${selected.length} members.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Create New Team" subtitle="Build a cross-functional team" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Team Name" required/><FInput value={f.name} onChange={v => set("name",v)} placeholder="e.g. Platform Core"/></div>
          <div><FieldLabel label="Team Type"/><FSelect value={f.type} onChange={v => set("type",v)}>{["Engineering","Design","Product","Marketing","Sales","Support","HR","Finance","Data"].map(t => <option key={t}>{t}</option>)}</FSelect></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Department" required/><FSelect value={f.dept} onChange={v => set("dept",v)}>{departments.map(d => <option key={d.id}>{d.name}</option>)}</FSelect></div>
          <div><FieldLabel label="Team Lead" required/><FSelect value={f.lead} onChange={v => set("lead",v)}><option value="">Select team lead...</option>{employees.map(e => <option key={e.id}>{e.name}</option>)}</FSelect></div>
        </div>
        <div><FieldLabel label="Team Description"/><FTextarea value={f.desc} onChange={v => set("desc",v)} placeholder="What does this team focus on?"/></div>
        <div><FieldLabel label="Team Goals / OKR Focus"/><FTextarea value={f.goals} onChange={v => set("goals",v)} placeholder="Key goals and objectives for this team..." rows={2}/></div>
        <div>
          <FieldLabel label={`Add Members (${selected.length} selected)`}/>
          <div className={`max-h-48 overflow-y-auto rounded-xl border ${c("border-white/[0.08]","border-slate-200")} divide-y ${c("divide-white/[0.04]","divide-slate-100")}`}>
            {employees.map(e => (
              <label key={e.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected.includes(e.name) ? c("bg-indigo-600/10","bg-indigo-50") : c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                <input type="checkbox" checked={selected.includes(e.name)} onChange={() => toggle(e.name)} className="rounded accent-indigo-500"/>
                <Avatar initials={e.avatar} color={e.avatarColor} size="sm"/>
                <div className="flex-1"><p className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{e.name}</p><p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>{e.role} · {e.dept}</p></div>
              </label>
            ))}
          </div>
        </div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Plus} onClick={handleCreate}>{submitting ? "Creating..." : "Create Team"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const departments = useDepartmentDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ name: "", code: "PROJ-009", client: "", dept: "", manager: "", priority: "high", status: "planning", desc: "", startDate: "", deadline: "", budget: "" });
  const [members, setMembers] = useState<string[]>([]);
  const [milestones, setMilestones] = useState([{ title: "", date: "" }, { title: "", date: "" }]);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const toggle = (name: string) => setMembers(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  const priorityOpts = [{ v: "critical", label: "Critical", color: "text-red-400" }, { v: "high", label: "High", color: "text-amber-400" }, { v: "medium", label: "Medium", color: "text-indigo-400" }, { v: "low", label: "Low", color: "text-slate-400" }];

  const handleCreate = async () => {
    if (!(f.name && f.manager)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, memberNames: members, milestones }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not create project."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Create Project" onClose={onClose}>
      <SuccessBanner message={`Project "${f.name}" (${f.code}) has been created and team members notified.`}/>
      <Btn variant="primary" onClick={onClose}>View Project</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Create New Project" subtitle="Set up a project with team and timeline" onClose={onClose} size="xl">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2"><FieldLabel label="Project Name" required/><FInput value={f.name} onChange={v => set("name",v)} placeholder="e.g. Customer Portal 3.0"/></div>
          <div><FieldLabel label="Project Code"/><FInput value={f.code} onChange={v => set("code",v)} placeholder="PROJ-009"/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Department" required/><FSelect value={f.dept} onChange={v => set("dept",v)}>{departments.map(d => <option key={d.id}>{d.name}</option>)}</FSelect></div>
          <div><FieldLabel label="Project Manager" required/><FSelect value={f.manager} onChange={v => set("manager",v)}><option value="">Select manager...</option>{employees.map(e => <option key={e.id}>{e.name}</option>)}</FSelect></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Client / Stakeholder"/><FInput value={f.client} onChange={v => set("client",v)} placeholder="e.g. Internal / ACME Corp"/></div>
          <div><FieldLabel label="Status"/><FSelect value={f.status} onChange={v => set("status",v)}><option value="planning">Planning</option><option value="in-progress">Active / In Progress</option><option value="review">In Review</option><option value="on-hold">On Hold</option></FSelect></div>
        </div>
        <div>
          <FieldLabel label="Priority" required/>
          <div className="flex gap-2 mt-1">{priorityOpts.map(opt => <button key={opt.v} onClick={() => set("priority",opt.v)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${f.priority === opt.v ? "bg-indigo-600 text-white border-indigo-500" : c("border-white/[0.08] text-slate-400 hover:border-white/20","border-slate-200 text-slate-500 hover:border-slate-300")}`}>{opt.label}</button>)}</div>
        </div>
        <div><FieldLabel label="Description"/><FTextarea value={f.desc} onChange={v => set("desc",v)} placeholder="Project overview, goals, and scope..." rows={3}/></div>
        <div className="grid grid-cols-3 gap-4">
          <div><FieldLabel label="Start Date" required/><FInput value={f.startDate} onChange={v => set("startDate",v)} type="date"/></div>
          <div><FieldLabel label="Deadline" required/><FInput value={f.deadline} onChange={v => set("deadline",v)} type="date"/></div>
          <div><FieldLabel label="Total Budget (₹)"/><FInput value={f.budget} onChange={v => set("budget",v)} placeholder="e.g. 500000"/></div>
        </div>
        <div>
          <FieldLabel label="Milestones"/>
          <div className="space-y-2">{milestones.map((m, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <div className="col-span-2"><FInput value={m.title} onChange={v => setMilestones(p => p.map((x, j) => j === i ? {...x, title: v} : x))} placeholder={`Milestone ${i+1} name`}/></div>
              <FInput value={m.date} onChange={v => setMilestones(p => p.map((x, j) => j === i ? {...x, date: v} : x))} type="date"/>
            </div>
          ))}</div>
          <button onClick={() => setMilestones(p => [...p, { title: "", date: "" }])} className="text-xs text-indigo-500 mt-2 hover:text-indigo-400">+ Add milestone</button>
        </div>
        <div>
          <FieldLabel label={`Team Members (${members.length} selected)`}/>
          <div className={`max-h-40 overflow-y-auto rounded-xl border ${c("border-white/[0.08]","border-slate-200")} divide-y ${c("divide-white/[0.04]","divide-slate-100")}`}>
            {employees.map(e => (
              <label key={e.id} className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${members.includes(e.name) ? c("bg-indigo-600/10","bg-indigo-50") : c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                <input type="checkbox" checked={members.includes(e.name)} onChange={() => toggle(e.name)} className="rounded accent-indigo-500"/>
                <Avatar initials={e.avatar} color={e.avatarColor} size="sm"/>
                <span className={`text-sm ${c("text-slate-200","text-slate-700")}`}>{e.name}</span>
                <span className={`ml-auto text-xs ${c("text-slate-500","text-slate-400")}`}>{e.dept}</span>
              </label>
            ))}
          </div>
        </div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Plus} onClick={handleCreate}>{submitting ? "Creating..." : "Create Project"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ title: "", project: "", assignee: "", priority: "high", status: "todo", dueDate: "", estimate: "", desc: "", tagInput: "" });
  const [tags, setTags] = useState<string[]>([]);
  const [projectList, setProjectList] = useState<string[]>([]);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const addTag = () => { if (f.tagInput.trim()) { setTags(p => [...p, f.tagInput.trim()]); set("tagInput", ""); }};
  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => {
      const names = (d.projects ?? []).map((p: any) => p.name);
      setProjectList(names);
      if (names.length) set("project", names[0]);
    });
  }, []);
  const priorityOpts = ["critical","high","medium","low"];

  const handleCreate = async () => {
    if (!f.title.trim()) { setSubmitError("Task title is required."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, tags }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not create task."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Create Task" onClose={onClose}>
      <SuccessBanner message={`Task "${f.title}" created and assigned to ${f.assignee || "Unassigned"}.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Create New Task" subtitle="Define work item with assignee and deadline" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div><FieldLabel label="Task Title" required/><FInput value={f.title} onChange={v => set("title",v)} placeholder="e.g. Implement dark mode for dashboard"/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Project"/><FSelect value={f.project} onChange={v => set("project",v)}><option value="">No Project</option>{projectList.map(p => <option key={p}>{p}</option>)}</FSelect></div>
          <div><FieldLabel label="Assignee"/><FSelect value={f.assignee} onChange={v => set("assignee",v)}><option value="">Unassigned</option>{employees.map(e => <option key={e.id}>{e.name}</option>)}</FSelect></div>
        </div>
        <div>
          <FieldLabel label="Priority" required/>
          <div className="flex gap-2 mt-1">{priorityOpts.map(opt => <button key={opt} onClick={() => set("priority",opt)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${f.priority === opt ? "bg-indigo-600 text-white border-indigo-500" : c("border-white/[0.08] text-slate-400 hover:border-white/20","border-slate-200 text-slate-500 hover:border-slate-300")}`}>{opt}</button>)}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><FieldLabel label="Status"/><FSelect value={f.status} onChange={v => set("status",v)}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="review">In Review</option><option value="done">Done</option></FSelect></div>
          <div><FieldLabel label="Due Date" required/><FInput value={f.dueDate} onChange={v => set("dueDate",v)} type="date"/></div>
          <div><FieldLabel label="Estimate (hrs)"/><FInput value={f.estimate} onChange={v => set("estimate",v)} placeholder="e.g. 4"/></div>
        </div>
        <div><FieldLabel label="Description"/><FTextarea value={f.desc} onChange={v => set("desc",v)} placeholder="Task details, acceptance criteria, notes..."/></div>
        <div>
          <FieldLabel label="Tags"/>
          <div className="flex gap-2 mb-2">{tags.map(t => <span key={t} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${c("bg-slate-700 text-slate-300","bg-slate-100 text-slate-600")}`}>{t}<button onClick={() => setTags(p => p.filter(x => x !== t))} className="ml-0.5 opacity-60 hover:opacity-100"><X size={11}/></button></span>)}</div>
          <div className="flex gap-2"><FInput value={f.tagInput} onChange={v => set("tagInput",v)} placeholder="Add tag..." className="flex-1" /><Btn variant="secondary" size="sm" onClick={addTag}>Add</Btn></div>
        </div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Plus} onClick={handleCreate}>{submitting ? "Creating..." : "Create Task"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function TaskDetailModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const { modalData } = useModal();
  const employees = useEmployeeDirectory();
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ title: "", desc: "", priority: "", dueDate: "", estimate: "", assignee: "" });

  const load = () => fetch(`/api/tasks/${modalData.taskId}`).then(r => r.json()).then(d => {
    if (d.task) setTask(d.task);
  });
  useEffect(() => { load(); }, [modalData?.taskId]);

  if (!task) return <ModalOverlay title="Loading..." onClose={onClose}><div className="h-20"/></ModalOverlay>;

  const isAssignee = authUser?.id === task.assignee?.id;
  const isAssigner = authUser?.id === task.assignedBy?.id;
  const isAdmin = authUser?.role === "super-admin";
  const canEditFull = isAssigner || isAdmin;
  const canChangeStatus = isAssignee || canEditFull;

  const statusOpts = [["todo","To Do"],["in-progress","In Progress"],["review","In Review"],["done","Done"]];

  const changeStatus = async (status: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not update status."); return; }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    setEdit({ title: task.title, desc: task.description || "", priority: task.priority, dueDate: "", estimate: task.estimateHours != null ? String(task.estimateHours) : "", assignee: task.assignee?.name || "" });
    setEditing(true);
  };

  const saveEdit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: edit.title, desc: edit.desc, priority: edit.priority, estimate: edit.estimate, assignee: edit.assignee, ...(edit.dueDate ? { dueDate: edit.dueDate } : {}) }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not save changes."); return; }
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not post comment."); return; }
      setComment("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const deleteTask = async () => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    setBusy(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay title={editing ? "Edit Task" : task.title} subtitle={task.project || undefined} onClose={onClose} size="lg">
      <div className="space-y-4">
        {editing ? (
          <>
            <div><FieldLabel label="Title" required/><FInput value={edit.title} onChange={v => setEdit(p => ({ ...p, title: v }))}/></div>
            <div><FieldLabel label="Description"/><FTextarea value={edit.desc} onChange={v => setEdit(p => ({ ...p, desc: v }))}/></div>
            <div className="grid grid-cols-3 gap-4">
              <div><FieldLabel label="Priority"/><FSelect value={edit.priority} onChange={v => setEdit(p => ({ ...p, priority: v }))}>{["critical","high","medium","low"].map(p => <option key={p}>{p}</option>)}</FSelect></div>
              <div><FieldLabel label="Due Date"/><FInput value={edit.dueDate} onChange={v => setEdit(p => ({ ...p, dueDate: v }))} type="date" placeholder={task.due}/></div>
              <div><FieldLabel label="Estimate (hrs)"/><FInput value={edit.estimate} onChange={v => setEdit(p => ({ ...p, estimate: v }))}/></div>
            </div>
            <div><FieldLabel label="Assignee"/><FSelect value={edit.assignee} onChange={v => setEdit(p => ({ ...p, assignee: v }))}><option value="">Unassigned</option>{employees.map(e => <option key={e.id}>{e.name}</option>)}</FSelect></div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2"><Btn variant="primary" onClick={saveEdit} disabled={busy}>Save</Btn><Btn variant="secondary" onClick={()=>setEditing(false)}>Cancel</Btn></div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap"><PriorityBadge priority={task.priority}/><StatusBadge status={task.status}/>{task.tags.map((t:string)=><span key={t} className={`text-[10px] px-1.5 py-0.5 rounded ${c("bg-slate-700 text-slate-400","bg-slate-100 text-slate-500")}`}>{t}</span>)}</div>
            {task.description && <p className={`text-sm ${c("text-slate-300","text-slate-700")}`}>{task.description}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg ${c("bg-slate-800/50","bg-slate-50")}`}>
                <p className={`text-[10px] uppercase tracking-wide mb-1.5 ${c("text-slate-500","text-slate-400")}`}>Assigned to</p>
                {task.assignee ? <div className="flex items-center gap-2"><Avatar initials={task.assignee.avatar} color={task.assignee.color} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{task.assignee.name}</span></div> : <span className={`text-sm ${c("text-slate-500","text-slate-400")}`}>Unassigned</span>}
              </div>
              <div className={`p-3 rounded-lg ${c("bg-slate-800/50","bg-slate-50")}`}>
                <p className={`text-[10px] uppercase tracking-wide mb-1.5 ${c("text-slate-500","text-slate-400")}`}>Assigned by</p>
                {task.assignedBy ? <div className="flex items-center gap-2"><Avatar initials={task.assignedBy.avatar} color={task.assignedBy.color} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{task.assignedBy.name}</span></div> : <span className={`text-sm ${c("text-slate-500","text-slate-400")}`}>—</span>}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {task.due && <span className={c("text-slate-400","text-slate-500")}>Due {task.due}</span>}
              {task.estimateHours != null && <span className={c("text-slate-400","text-slate-500")}>Est. {task.estimateHours}h</span>}
            </div>

            <div>
              <p className={`text-[10px] uppercase tracking-wide mb-1.5 ${c("text-slate-500","text-slate-400")}`}>Status</p>
              <div className="flex gap-2 flex-wrap">
                {statusOpts.map(([id,label]) => (
                  <button key={id} disabled={!canChangeStatus || busy || id===task.status} onClick={()=>changeStatus(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${id===task.status ? "bg-indigo-600 text-white border-indigo-500" : c("border-white/[0.08] text-slate-400 hover:border-white/20","border-slate-200 text-slate-500 hover:border-slate-300")}`}>{label}</button>
                ))}
              </div>
              {!canChangeStatus && <p className={`text-[10px] mt-1.5 ${c("text-slate-500","text-slate-400")}`}>Only the assignee, assigner, or an admin can change status.</p>}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            {canEditFull && <div className="flex gap-2"><Btn variant="secondary" size="sm" icon={Edit2} onClick={startEdit}>Edit</Btn><Btn variant="danger" size="sm" icon={Trash2} onClick={deleteTask}>Delete</Btn></div>}

            <div className={`border-t pt-4 ${c("border-white/[0.06]","border-slate-200")}`}>
              <p className={`text-xs font-semibold mb-2 ${c("text-slate-300","text-slate-700")}`}>Activity</p>
              <div className="space-y-2 max-h-32 overflow-y-auto mb-4">
                {task.activity.map((a:any) => (
                  <p key={a.id} className={`text-[11px] ${c("text-slate-500","text-slate-400")}`}><strong className={c("text-slate-300","text-slate-600")}>{a.actor}</strong> {a.action==="status_changed"?`changed status: ${a.detail}`:a.action==="reassigned"?a.detail:a.action==="commented"?"commented":a.detail||a.action} · {a.time}</p>
                ))}
              </div>

              <p className={`text-xs font-semibold mb-2 ${c("text-slate-300","text-slate-700")}`}>Comments</p>
              <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                {task.comments.length===0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No comments yet.</p>}
                {task.comments.map((cm:any) => (
                  <div key={cm.id} className="flex items-start gap-2">
                    <Avatar initials={cm.avatar} color={cm.color} size="sm"/>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2"><span className={`text-xs font-semibold ${c("text-slate-200","text-slate-800")}`}>{cm.author}</span><span className={`text-[10px] ${c("text-slate-600","text-slate-400")}`}>{cm.time}</span></div>
                      <p className={`text-xs ${c("text-slate-300","text-slate-600")}`}>{cm.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <FInput value={comment} onChange={setComment} placeholder="Add a comment..." className="flex-1"/>
                <Btn variant="primary" size="sm" onClick={addComment} disabled={busy}>Post</Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalOverlay>
  );
}

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ title: "", date: "", startTime: "09:00", endTime: "10:00", allDay: false, type: "meeting", color: "bg-indigo-500", desc: "", location: "", link: "", recurring: false, freq: "weekly", endDate: "" });
  const [attendees, setAttendees] = useState<string[]>([]);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const eventTypes = ["meeting","focus","event","deadline","holiday"];
  const colors = ["bg-indigo-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500"];

  const handleCreate = async () => {
    if (!(f.title && f.date)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, attendeeNames: attendees }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not create event."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Create Event" onClose={onClose}>
      <SuccessBanner message={`"${f.title}" has been added to the calendar${attendees.length > 0 ? ` and ${attendees.length} attendees notified` : ""}.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Create New Event" subtitle="Schedule an event on the team calendar" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div><FieldLabel label="Event Title" required/><FInput value={f.title} onChange={v => set("title",v)} placeholder="e.g. Q3 Planning Session"/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Event Type"/><FSelect value={f.type} onChange={v => set("type",v)}>{eventTypes.map(t => <option key={t} className="capitalize">{t}</option>)}</FSelect></div>
          <div><FieldLabel label="Date" required/><FInput value={f.date} onChange={v => set("date",v)} type="date"/></div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => set("allDay", !f.allDay)} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${f.allDay ? "bg-indigo-600" : c("bg-slate-700","bg-slate-300")}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${f.allDay ? "left-4" : "left-0.5"}`}/></div>
            <span className={`text-xs ${c("text-slate-400","text-slate-600")}`}>All Day</span>
          </label>
        </div>
        {!f.allDay && <div className="grid grid-cols-2 gap-4"><div><FieldLabel label="Start Time"/><FInput value={f.startTime} onChange={v => set("startTime",v)} type="time"/></div><div><FieldLabel label="End Time"/><FInput value={f.endTime} onChange={v => set("endTime",v)} type="time"/></div></div>}
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Location"/><FInput value={f.location} onChange={v => set("location",v)} placeholder="Room / Building / Platform"/></div>
          <div><FieldLabel label="Virtual Link"/><FInput value={f.link} onChange={v => set("link",v)} placeholder="https://meet.google.com/..."/></div>
        </div>
        <div><FieldLabel label="Description"/><FTextarea value={f.desc} onChange={v => set("desc",v)} placeholder="Event agenda, notes, or context..."/></div>
        <div>
          <FieldLabel label="Color"/>
          <div className="flex gap-2 mt-1">{colors.map(col => <button key={col} onClick={() => set("color",col)} className={`w-7 h-7 rounded-full ${col} transition-transform ${f.color === col ? "scale-125 ring-2 ring-white/40" : "hover:scale-110"}`}/>)}</div>
        </div>
        <div>
          <FieldLabel label={`Attendees (${attendees.length})`}/>
          <div className={`max-h-36 overflow-y-auto rounded-xl border ${c("border-white/[0.08]","border-slate-200")}`}>
            {employees.map(e => <label key={e.id} className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${attendees.includes(e.name) ? c("bg-indigo-600/10","bg-indigo-50") : c("hover:bg-slate-700/20","hover:bg-slate-50")}`}><input type="checkbox" checked={attendees.includes(e.name)} onChange={() => setAttendees(p => p.includes(e.name) ? p.filter(x=>x!==e.name) : [...p,e.name])} className="rounded accent-indigo-500"/><Avatar initials={e.avatar} color={e.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-700")}`}>{e.name}</span></label>)}
          </div>
        </div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Plus} onClick={handleCreate}>{submitting ? "Creating..." : "Create Event"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ScheduleMeetingModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ title: "", date: "", startTime: "10:00", endTime: "11:00", type: "video", gmeetLink: "", room: "", agenda: "", recurrence: "none", sendInvites: true, record: false });
  const [attendees, setAttendees] = useState<string[]>([]);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!(f.title && f.date)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, attendeeNames: attendees }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not schedule meeting."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const generateMeetLink = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const seg = (n: number) => Array.from({length:n},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
    set("gmeetLink", `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`);
  };

  const copyLink = () => navigator.clipboard.writeText(f.gmeetLink).catch(() => {});

  if (done) return (
    <ModalOverlay title="Meeting Scheduled" onClose={onClose} size="lg">
      <SuccessBanner message={`"${f.title}" has been scheduled. ${f.sendInvites ? `${attendees.length} invites sent.` : ""}`}/>
      <div className={`rounded-xl p-5 space-y-3 ${c("bg-slate-800/50","bg-slate-50")} border ${c("border-white/[0.06]","border-slate-200")}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center"><Video size={18} className="text-indigo-500"/></div>
          <div><p className={`font-semibold ${c("text-white","text-slate-900")}`}>{f.title}</p><p className={`text-xs ${c("text-slate-400","text-slate-500")}`}>{f.date} · {f.startTime} – {f.endTime}</p></div>
        </div>
        {f.gmeetLink && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${c("bg-indigo-600/10","bg-indigo-50")} border ${c("border-indigo-500/20","border-indigo-200")}`}>
            <Globe size={14} className="text-indigo-500 flex-shrink-0"/>
            <a href={f.gmeetLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline truncate flex-1">{f.gmeetLink}</a>
            <button onClick={copyLink} className={`text-xs px-2 py-1 rounded ${c("bg-slate-700 text-slate-300 hover:bg-slate-600","bg-white text-slate-600 hover:bg-slate-100")} border ${c("border-white/[0.08]","border-slate-200")}`}><Copy size={12}/></button>
          </div>
        )}
        <div className="flex items-center gap-1 flex-wrap">{attendees.slice(0,6).map(name => { const e = employees.find(x=>x.name===name); return e ? <div key={name} className={`w-7 h-7 rounded-full ${e.avatarColor} flex items-center justify-center text-[9px] font-bold text-white border-2 ${c("border-slate-800","border-white")} -ml-1 first:ml-0`}>{e.avatar}</div> : null; })}{attendees.length > 6 && <span className={`text-xs ${c("text-slate-500","text-slate-400")} ml-1`}>+{attendees.length-6}</span>}</div>
      </div>
      <Btn variant="primary" onClick={onClose} className="mt-4">Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Schedule Meeting" subtitle="Set up a meeting with Google Meet integration" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div><FieldLabel label="Meeting Title" required/><FInput value={f.title} onChange={v => set("title",v)} placeholder="e.g. Sprint Planning — Week 27"/></div>
        <div className="grid grid-cols-3 gap-4">
          <div><FieldLabel label="Date" required/><FInput value={f.date} onChange={v => set("date",v)} type="date"/></div>
          <div><FieldLabel label="Start Time"/><FInput value={f.startTime} onChange={v => set("startTime",v)} type="time"/></div>
          <div><FieldLabel label="End Time"/><FInput value={f.endTime} onChange={v => set("endTime",v)} type="time"/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="Meeting Type"/><FSelect value={f.type} onChange={v => set("type",v)}><option value="video">Video Call (Google Meet)</option><option value="in-person">In-Person</option><option value="phone">Phone Call</option><option value="hybrid">Hybrid</option></FSelect></div>
          <div><FieldLabel label="Recurrence"/><FSelect value={f.recurrence} onChange={v => set("recurrence",v)}><option value="none">No Recurrence</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></FSelect></div>
        </div>

        {/* Google Meet Link */}
        <div>
          <FieldLabel label="Google Meet Link"/>
          <div className="flex gap-2">
            <FInput value={f.gmeetLink} onChange={v => set("gmeetLink",v)} placeholder="https://meet.google.com/abc-defg-hij" className="flex-1"/>
            <button onClick={generateMeetLink} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${c("bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/25","bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200")}`}>
              <RefreshCw size={12}/> Generate
            </button>
            {f.gmeetLink && <button onClick={copyLink} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${c("bg-slate-700 text-slate-300 hover:bg-slate-600 border border-white/[0.08]","bg-white text-slate-600 hover:bg-slate-50 border border-slate-200")}`}><Copy size={12}/></button>}
          </div>
          {f.gmeetLink && <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1"><CheckCircle2 size={11}/> Meet link ready — will be included in calendar invites</p>}
        </div>

        {f.type === "in-person" || f.type === "hybrid" ? <div><FieldLabel label="Room / Location"/><FInput value={f.room} onChange={v => set("room",v)} placeholder="e.g. Conference Room A, Floor 3"/></div> : null}

        <div><FieldLabel label="Agenda"/><FTextarea value={f.agenda} onChange={v => set("agenda",v)} placeholder="• Welcome & intro&#10;• Review sprint goals&#10;• Blockers discussion&#10;• Action items" rows={4}/></div>

        <div>
          <FieldLabel label={`Invite Attendees (${attendees.length} selected)`}/>
          <div className={`max-h-40 overflow-y-auto rounded-xl border ${c("border-white/[0.08]","border-slate-200")}`}>
            {employees.map(e => <label key={e.id} className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${attendees.includes(e.name) ? c("bg-indigo-600/10","bg-indigo-50") : c("hover:bg-slate-700/20","hover:bg-slate-50")}`}><input type="checkbox" checked={attendees.includes(e.name)} onChange={() => setAttendees(p => p.includes(e.name) ? p.filter(x=>x!==e.name) : [...p,e.name])} className="rounded accent-indigo-500"/><Avatar initials={e.avatar} color={e.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-700")}`}>{e.name}</span><span className={`ml-auto text-xs ${c("text-slate-500","text-slate-400")}`}>{e.dept}</span></label>)}
          </div>
        </div>

        <div className="flex gap-6">
          {[["sendInvites","Send calendar invites to all attendees"],["record","Record this meeting (auto-transcript)"]].map(([k,l]) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set(k, !(f as any)[k])} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${(f as any)[k] ? "bg-indigo-600" : c("bg-slate-700","bg-slate-300")}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${(f as any)[k] ? "left-4" : "left-0.5"}`}/></div>
              <span className={`text-xs ${c("text-slate-400","text-slate-600")}`}>{l}</span>
            </label>
          ))}
        </div>

        <div className={`flex items-center gap-2 p-3 rounded-lg ${c("bg-slate-800/50","bg-slate-50")}`}>
          <User size={13} className={c("text-slate-500","text-slate-400")}/>
          <span className={`text-xs ${c("text-slate-400","text-slate-500")}`}>Organizer: <strong className={c("text-slate-200","text-slate-700")}>{authUser?.name || "You"}</strong></span>
        </div>

        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Video} onClick={handleCreate}>{submitting ? "Scheduling..." : "Schedule Meeting"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ApplyLeaveModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ type: "Annual Leave", from: "", to: "", halfDay: false, halfDayPart: "Morning", reason: "", emergencyName: "", emergencyPhone: "" });
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const [leaveBalance, setLeaveBalance] = useState<Record<string,number>>({});
  useEffect(() => {
    fetch("/api/leave").then(r => r.json()).then(d => {
      if (Array.isArray(d.balances)) setLeaveBalance(Object.fromEntries(d.balances.map((b: any) => [b.type, b.remaining])));
    });
  }, []);
  const calcDays = () => { if (!f.from || !f.to) return 0; const d = (new Date(f.to).getTime() - new Date(f.from).getTime()) / 86400000 + 1; return f.halfDay ? 0.5 : Math.max(0, d); };
  const days = calcDays();

  const handleSubmit = async () => {
    if (!(f.type && f.from && f.to && f.reason)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not submit leave request."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Leave Applied" onClose={onClose}>
      <SuccessBanner message={`Your ${f.type} application for ${days} day(s) has been submitted and is pending manager approval.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Apply for Leave" subtitle="Submit a leave request for manager approval" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel label="Leave Type" required/>
          <FSelect value={f.type} onChange={v => set("type",v)}>
            {Object.keys(leaveBalance).map(t => <option key={t}>{t}</option>)}
          </FSelect>
          <div className={`flex items-center justify-between mt-1.5 px-1`}>
            <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Balance remaining</span>
            <span className="text-xs font-semibold text-emerald-500">{leaveBalance[f.type] ?? "—"} days available</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel label="From Date" required/><FInput value={f.from} onChange={v => set("from",v)} type="date"/></div>
          <div><FieldLabel label="To Date" required/><FInput value={f.to} onChange={v => set("to",v)} type="date"/></div>
        </div>
        {days > 0 && (
          <div className={`flex items-center justify-between p-3 rounded-xl ${c("bg-indigo-600/10","bg-indigo-50")} border ${c("border-indigo-500/20","border-indigo-200")}`}>
            <span className={`text-sm ${c("text-indigo-300","text-indigo-700")}`}>Duration</span>
            <span className="text-sm font-bold text-indigo-500">{days} working day{days !== 1 ? "s" : ""}</span>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => set("halfDay", !f.halfDay)} className={`w-9 h-5 rounded-full relative transition-colors ${f.halfDay ? "bg-indigo-600" : c("bg-slate-700","bg-slate-300")}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${f.halfDay ? "left-4" : "left-0.5"}`}/></div>
          <span className={`text-sm ${c("text-slate-300","text-slate-700")}`}>Half Day</span>
        </label>
        {f.halfDay && <div><FieldLabel label="Half Day Preference"/><div className="flex gap-2">{["Morning","Afternoon"].map(p => <button key={p} onClick={() => set("halfDayPart",p)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${f.halfDayPart === p ? "bg-indigo-600 text-white border-indigo-500" : c("border-white/[0.08] text-slate-400","border-slate-200 text-slate-500")}`}>{p}</button>)}</div></div>}
        <div><FieldLabel label="Reason" required/><FTextarea value={f.reason} onChange={v => set("reason",v)} placeholder="Please describe the reason for your leave..."/></div>
        {f.type === "Sick Leave" && (
          <div className={`p-3 rounded-xl ${c("bg-amber-500/10","bg-amber-50")} border ${c("border-amber-500/20","border-amber-200")}`}>
            <p className={`text-xs font-medium mb-2 ${c("text-amber-400","text-amber-700")}`}>📎 Medical certificate may be required for sick leave &gt; 2 days</p>
            <div className={`flex items-center gap-3 p-3 rounded-lg border border-dashed ${c("border-amber-500/30","border-amber-300")} cursor-pointer`}><Upload size={15} className={c("text-amber-400","text-amber-600")}/><span className={`text-xs ${c("text-amber-300","text-amber-700")}`}>Upload medical document (optional)</span></div>
          </div>
        )}
        <div>
          <FieldLabel label="Emergency Contact During Leave"/>
          <div className="grid grid-cols-2 gap-3">
            <FInput value={f.emergencyName} onChange={v => set("emergencyName",v)} placeholder="Contact name"/>
            <FInput value={f.emergencyPhone} onChange={v => set("emergencyPhone",v)} placeholder="+1 (555) 000-0000"/>
          </div>
        </div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" onClick={handleSubmit}>{submitting ? "Submitting..." : "Submit Application"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function AddObjectiveModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const employees = useEmployeeDirectory();
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ title: "", owner: "", quarter: "Q1", year: String(new Date().getFullYear()) });
  const [krs, setKrs] = useState(["", ""]);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!f.title) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/okr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, keyResults: krs }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not create objective."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Objective Created" onClose={onClose}>
      <SuccessBanner message={`"${f.title}" has been added to the OKR tracker.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="Add Objective" subtitle="Define a new objective and its key results" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div><FieldLabel label="Objective Title" required/><FInput value={f.title} onChange={v => set("title",v)} placeholder="e.g. Scale platform to 10M users"/></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1"><FieldLabel label="Owner"/><FSelect value={f.owner} onChange={v => set("owner",v)}><option value="">Unassigned</option>{employees.map(e => <option key={e.id}>{e.name}</option>)}</FSelect></div>
          <div><FieldLabel label="Quarter"/><FSelect value={f.quarter} onChange={v => set("quarter",v)}><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option></FSelect></div>
          <div><FieldLabel label="Year"/><FInput value={f.year} onChange={v => set("year",v)}/></div>
        </div>
        <div>
          <FieldLabel label="Key Results"/>
          <div className="space-y-2">{krs.map((kr, i) => <FInput key={i} value={kr} onChange={v => setKrs(p => p.map((x, j) => j === i ? v : x))} placeholder={`Key Result ${i+1}`}/>)}</div>
          <button onClick={() => setKrs(p => [...p, ""])} className="text-xs text-indigo-500 mt-2 hover:text-indigo-400">+ Add key result</button>
        </div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Plus} onClick={handleCreate}>{submitting ? "Creating..." : "Create Objective"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function AddArticleModal({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [f, setF] = useState({ title: "", category: "Engineering", content: "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const categories = ["Engineering","HR Policies","Product","Onboarding","Finance","Security"];

  const handleCreate = async () => {
    if (!f.title) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Could not publish article."); return; }
      setDone(true);
    } catch {
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <ModalOverlay title="Article Published" onClose={onClose}>
      <SuccessBanner message={`"${f.title}" has been published to the Knowledge Base.`}/>
      <Btn variant="primary" onClick={onClose}>Done</Btn>
    </ModalOverlay>
  );

  return (
    <ModalOverlay title="New Article" subtitle="Publish a document, SOP, or company resource" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div><FieldLabel label="Title" required/><FInput value={f.title} onChange={v => set("title",v)} placeholder="e.g. Remote Work Policy 2026"/></div>
        <div><FieldLabel label="Category" required/><FSelect value={f.category} onChange={v => set("category",v)}>{categories.map(c => <option key={c}>{c}</option>)}</FSelect></div>
        <div><FieldLabel label="Content"/><FTextarea value={f.content} onChange={v => set("content",v)} placeholder="Article body..." rows={6}/></div>
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" icon={Plus} onClick={handleCreate}>{submitting ? "Publishing..." : "Publish Article"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ModalSystem() {
  const { activeModal, closeModal } = useModal();
  if (!activeModal) return null;
  return (
    <>
      {activeModal === "add-employee" && <AddEmployeeModal onClose={closeModal}/>}
      {activeModal === "add-department" && <AddDepartmentModal onClose={closeModal}/>}
      {activeModal === "department-detail" && <DepartmentDetailModal onClose={closeModal}/>}
      {activeModal === "create-team" && <CreateTeamModal onClose={closeModal}/>}
      {activeModal === "create-project" && <CreateProjectModal onClose={closeModal}/>}
      {activeModal === "create-task" && <CreateTaskModal onClose={closeModal}/>}
      {activeModal === "task-detail" && <TaskDetailModal onClose={closeModal}/>}
      {activeModal === "create-event" && <CreateEventModal onClose={closeModal}/>}
      {activeModal === "schedule-meeting" && <ScheduleMeetingModal onClose={closeModal}/>}
      {activeModal === "apply-leave" && <ApplyLeaveModal onClose={closeModal}/>}
      {activeModal === "add-objective" && <AddObjectiveModal onClose={closeModal}/>}
      {activeModal === "add-article" && <AddArticleModal onClose={closeModal}/>}
      {activeModal === "eod-detail" && <EODDetailModal onClose={closeModal}/>}
      {activeModal === "add-expense-claim" && <AddExpenseClaimModal onClose={closeModal}/>}
      {activeModal === "add-ops-expense" && <AddOpsExpenseModal onClose={closeModal}/>}
    </>
  );
}

// ─── EMPLOYEE EOD PAGE ────────────────────────────────────────────────────────

function EODPage() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const isHrAdmin = authUser?.role === "super-admin" || authUser?.role === "hr-admin";
  const [view, setView] = useState<"mine"|"team">("mine");

  return (
    <div className="space-y-4">
      {isHrAdmin && (
        <div className="flex gap-1">
          <button onClick={()=>setView("mine")} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${view==="mine"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}>My Report</button>
          <button onClick={()=>setView("team")} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${view==="team"?"bg-indigo-600 text-white":c("bg-slate-800/60 text-slate-500","bg-white border border-slate-200 text-slate-500")}`}>Team Reports</button>
        </div>
      )}
      {view==="mine" ? <MyEODView/> : <TeamEODView/>}
    </div>
  );
}

type EodAttachment = { name: string; url: string; size: number; type: string };
const MAX_EOD_ATTACHMENTS = 5;
const MAX_EOD_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

function MyEODView() {
  const { c } = useTheme();
  const { authUser } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [accomplish, setAccomplish] = useState("");
  const [blockers, setBlockers] = useState("");
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<{submitted:number;workingDays:number}|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState<EodAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/eod").then(r => r.json()).then(d => {
      setHistory(d.history ?? []);
      setCompliance(d.compliance ?? null);
      if (d.submittedToday && d.today) {
        setSubmitted(true);
        setAccomplish(d.today.summary || "");
        setBlockers(d.today.blockers || "");
        setPriorities((d.today.tomorrowPlan || "").split("\n").filter(Boolean).concat(["", "", ""]).slice(0, 3));
        setSelectedTaskIds(d.today.taskIds ?? []);
        setAttachments(d.today.attachments ?? []);
      }
    });
  }, []);
  useEffect(() => {
    if (authUser) fetch(`/api/tasks?assignee=${encodeURIComponent(authUser.name)}`).then(r => r.json()).then(d => setTasks((d.tasks ?? []).filter((t: any) => t.status !== "done")));
  }, [authUser]);

  const toggleTask = (id: number) => setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    const room = MAX_EOD_ATTACHMENTS - attachments.length;
    if (room <= 0) { setError(`You can attach at most ${MAX_EOD_ATTACHMENTS} files.`); return; }
    const picked = Array.from(files).slice(0, room);

    setUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/uploadToCloudinary");
      for (const file of picked) {
        if (file.size > MAX_EOD_ATTACHMENT_BYTES) { setError(`"${file.name}" is over the 5MB limit.`); continue; }
        const result = await uploadToCloudinary(file, "/api/eod/upload", { existingCount: String(attachments.length) });
        setAttachments(prev => [...prev, result]);
      }
    } catch {
      setError("Could not upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (url: string) => setAttachments(prev => prev.filter(a => a.url !== url));

  const submit = async () => {
    if (!accomplish.trim()) { setError("Please summarize what you accomplished today."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: accomplish, blockers, tomorrowPlan: priorities.filter(Boolean).join("\n"), taskIds: selectedTaskIds, attachments }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not submit report."); return; }
      setSubmitted(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5"><CheckCircle2 size={36} className="text-emerald-500"/></div>
      <h2 className={`text-2xl font-bold mb-2 ${c("text-white","text-slate-900")}`}>EOD Report Submitted! 🎉</h2>
      <p className={`text-sm mb-1 ${c("text-slate-400","text-slate-500")}`}>Great work today, {authUser?.name?.split(" ")[0] || "there"}!</p>
      {compliance && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>Submitted {compliance.submitted} of {compliance.workingDays} working days this month.</p>}
      <Btn variant="secondary" onClick={() => setSubmitted(false)} className="mt-5">Edit Report</Btn>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-5 ${c("bg-gradient-to-r from-slate-800/80 to-slate-800/40 border-white/[0.06]","bg-gradient-to-r from-slate-50 to-white border-slate-200")}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${authUser?.avatarColor || "bg-indigo-600"} flex items-center justify-center text-lg font-bold text-white`}>{authUser?.avatar}</div>
            <div>
              <h1 className={`text-xl font-bold ${c("text-white","text-slate-900")}`}>End of Day Report</h1>
              <p className={`text-sm mt-0.5 ${c("text-slate-400","text-slate-500")}`}>{authUser?.name} · {authUser?.title}</p>
            </div>
          </div>
          {compliance && <div className="text-right"><p className={`text-lg font-bold ${c("text-white","text-slate-900")}`}>{compliance.submitted}/{compliance.workingDays}</p><p className={`text-[11px] ${c("text-slate-500","text-slate-400")}`}>working days this month</p></div>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-3 ${c("text-white","text-slate-900")}`}>Tasks worked on today</h3>
            {tasks.length === 0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No open tasks — nice work!</p>}
            <div className="space-y-2">
              {tasks.slice(0, 8).map((t: any) => (
                <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={selectedTaskIds.includes(t.id)} onChange={()=>toggleTask(t.id)} className="rounded"/>
                  <PriorityBadge priority={t.priority}/>
                  <span className={c("text-slate-300","text-slate-700")}>{t.title}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-3 ${c("text-white","text-slate-900")}`}>Recent Reports</h3>
            {history.length === 0 && <p className={`text-xs ${c("text-slate-500","text-slate-400")}`}>No reports submitted yet.</p>}
            <div className="space-y-2">
              {history.slice(0, 5).map((h: any) => (
                <div key={h.id} className={`text-xs p-2 rounded-lg ${c("bg-slate-800/50","bg-slate-50")}`}>
                  <p className={`font-medium flex items-center gap-1.5 ${c("text-slate-300","text-slate-700")}`}>{h.date}{h.attachments?.length > 0 && <Paperclip size={10}/>}</p>
                  <p className={`mt-0.5 truncate ${c("text-slate-500","text-slate-400")}`}>{h.summary}</p>
                  {h.tasks?.length > 0 && <p className={`mt-1 truncate ${c("text-indigo-400","text-indigo-500")}`}>{h.tasks.join(", ")}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Today's Report</h3>
            <div><FieldLabel label="What did you accomplish today?" required/><FTextarea value={accomplish} onChange={setAccomplish} rows={5} placeholder="• List your key accomplishments&#10;• Code written, reviews done, meetings attended..."/></div>
            <div><FieldLabel label="Blockers & Challenges"/><FTextarea value={blockers} onChange={setBlockers} rows={3} placeholder="• List any blockers or challenges..."/></div>
            <div>
              <FieldLabel label="Top 3 Priorities for Tomorrow"/>
              <div className="space-y-2">
                {priorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? "bg-indigo-600 text-white" : c("bg-slate-700 text-slate-400","bg-slate-100 text-slate-500")}`}>{i+1}</span>
                    <FInput value={p} onChange={v => setPriorities(prev => prev.map((x, j) => j === i ? v : x))} placeholder={`Priority ${i+1}...`}/>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel label="Attachments"/>
              <input ref={fileInputRef} type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={e => handleFilesSelected(e.target.files)}/>
              <div className="space-y-2">
                {attachments.map(a => (
                  <div key={a.url} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${c("bg-slate-800/50","bg-slate-50")}`}>
                    <Paperclip size={12} className={c("text-slate-500","text-slate-400")}/>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className={`flex-1 truncate hover:underline ${c("text-slate-300","text-slate-700")}`}>{a.name}</a>
                    <span className={c("text-slate-500","text-slate-400")}>{(a.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeAttachment(a.url)} className={c("text-slate-500 hover:text-red-400","text-slate-400 hover:text-red-500")}><X size={12}/></button>
                  </div>
                ))}
                {attachments.length < MAX_EOD_ATTACHMENTS && (
                  <Btn variant="secondary" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "Uploading..." : "Attach file"}
                  </Btn>
                )}
              </div>
              <p className={`text-[11px] mt-1.5 ${c("text-slate-500","text-slate-400")}`}>Images or PDF, up to 5MB each, {MAX_EOD_ATTACHMENTS} files max.</p>
            </div>
          </Card>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className={`flex items-center justify-end p-4 rounded-xl border ${c("bg-slate-800/60 border-white/[0.06]","bg-white border-slate-200")}`}>
            <Btn variant="primary" onClick={submit} icon={Send} disabled={uploading}>{submitting ? "Submitting..." : "Submit EOD Report"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamEODView() {
  const { c } = useTheme();
  const { openModal, activeModal } = useModal();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [data, setData] = useState<any>(null);
  const [reminding, setReminding] = useState(false);
  const [remindMsg, setRemindMsg] = useState("");

  const load = () => fetch(`/api/eod/all?date=${date}`).then(r => r.json()).then(setData);
  useEffect(() => {
    if (activeModal === "eod-detail") return;
    load();
  }, [date, activeModal]);

  const sendReminders = async () => {
    setReminding(true);
    setRemindMsg("");
    try {
      const res = await fetch("/api/eod/remind", { method: "POST" });
      const d = await res.json();
      setRemindMsg(res.ok ? `Reminded ${d.reminded} employee(s) who haven't submitted today.` : (d.error || "Could not send reminders."));
    } finally {
      setReminding(false);
    }
  };

  if (!data) return null;
  const missingCount = data.employees.filter((e:any)=>!e.submitted).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <FInput value={date} onChange={setDate} type="date" className="max-w-[180px]"/>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" icon={Download} onClick={()=>window.location.href="/api/reports/export?type=eod"}>Download All (CSV)</Btn>
          <Btn variant="secondary" size="sm" onClick={sendReminders} disabled={reminding}>{reminding?"Sending...":"Send Reminders Now"}</Btn>
        </div>
      </div>
      {remindMsg && <p className={`text-xs ${c("text-slate-400","text-slate-500")}`}>{remindMsg}</p>}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Submitted" value={String(data.employees.length - missingCount)} icon={CheckCircle2} iconColor="bg-emerald-600/40" trend="up"/>
        <StatCard label="Missing" value={String(missingCount)} icon={AlertCircle} iconColor="bg-amber-600/40" trend="up"/>
      </div>
      <Card>
        <div className={`p-4 border-b ${c("border-white/[0.06]","border-slate-200")}`}><h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Reports — {data.date}</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>{["Employee","Status","Summary"].map(h=><th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}</tr></thead>
            <tbody>
              {data.employees.map((e:any)=>(
                <tr key={e.id}
                  onClick={()=>e.submitted && openModal("eod-detail",{employee:e,date:data.date})}
                  className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${e.submitted ? c("hover:bg-slate-700/20 cursor-pointer","hover:bg-slate-50 cursor-pointer") : ""}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar initials={e.avatar} color={e.avatarColor} size="sm"/><span className={`text-sm ${c("text-slate-200","text-slate-800")}`}>{e.name}</span></div></td>
                  <td className="px-4 py-3">{e.submitted ? <Badge variant="success">Submitted</Badge> : <Badge variant="warning">Missing</Badge>}</td>
                  <td className={`px-4 py-3 text-sm max-w-xs truncate ${c("text-slate-400","text-slate-500")}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {e.summary || "—"}
                      {e.attachments?.length > 0 && <Paperclip size={11} className="flex-shrink-0"/>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function EODDetailModal({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const { modalData } = useModal();
  const e = modalData?.employee;
  if (!e) return null;

  return (
    <ModalOverlay title={e.name} subtitle={`${e.title} · ${modalData.date}`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-3">
          <Avatar initials={e.avatar} color={e.avatarColor}/>
          <Badge variant="success">Submitted</Badge>
        </div>
        <div>
          <p className={`text-[11px] uppercase tracking-wide mb-1 ${c("text-slate-500","text-slate-400")}`}>Accomplished</p>
          <p className={c("text-slate-300","text-slate-700")}>{e.summary}</p>
        </div>
        {e.blockers && (
          <div>
            <p className={`text-[11px] uppercase tracking-wide mb-1 ${c("text-slate-500","text-slate-400")}`}>Blockers</p>
            <p className={c("text-slate-300","text-slate-700")}>{e.blockers}</p>
          </div>
        )}
        {e.tomorrowPlan && (
          <div>
            <p className={`text-[11px] uppercase tracking-wide mb-1 ${c("text-slate-500","text-slate-400")}`}>Tomorrow's Priorities</p>
            <p className={`whitespace-pre-line ${c("text-slate-300","text-slate-700")}`}>{e.tomorrowPlan}</p>
          </div>
        )}
        {e.attachments?.length > 0 && (
          <div>
            <p className={`text-[11px] uppercase tracking-wide mb-1 ${c("text-slate-500","text-slate-400")}`}>Attachments</p>
            <div className="space-y-1.5">
              {e.attachments.map((a: EodAttachment) => (
                <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded-lg hover:underline ${c("bg-slate-800/50 text-slate-300","bg-slate-50 text-slate-700")}`}>
                  <Paperclip size={12}/><span className="truncate">{a.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ─── MONTHLY EXPENSES PAGE ────────────────────────────────────────────────────

const expensesMonthlyData = [
  { month: "Jan", payroll: 4820, benefits: 260, ops: 380, marketing: 75, infra: 78, travel: 82 },
  { month: "Feb", payroll: 4820, benefits: 260, ops: 385, marketing: 78, infra: 80, travel: 65 },
  { month: "Mar", payroll: 4950, benefits: 272, ops: 390, marketing: 82, infra: 82, travel: 71 },
  { month: "Apr", payroll: 4950, benefits: 272, ops: 388, marketing: 79, infra: 85, travel: 69 },
  { month: "May", payroll: 5100, benefits: 278, ops: 410, marketing: 81, infra: 87, travel: 58 },
  { month: "Jun", payroll: 5100, benefits: 280, ops: 420, marketing: 82, infra: 89, travel: 67 },
];

const expenseCategories = [
  { name: "Salaries & Wages", amount: 4820000, pct: 83.1, vsLast: 2.9, trend: "up" },
  { name: "Employee Benefits", amount: 280000, pct: 4.8, vsLast: 1.2, trend: "up" },
  { name: "Health Insurance", amount: 156000, pct: 2.7, vsLast: 0, trend: "flat" },
  { name: "Office Rent & Facilities", amount: 145000, pct: 2.5, vsLast: 0, trend: "flat" },
  { name: "Cloud Infrastructure", amount: 89000, pct: 1.5, vsLast: 8.3, trend: "up" },
  { name: "Travel & Expenses", amount: 67000, pct: 1.2, vsLast: -15, trend: "down" },
  { name: "Marketing & Events", amount: 82000, pct: 1.4, vsLast: 5.0, trend: "up" },
  { name: "Equipment & Assets", amount: 54000, pct: 0.9, vsLast: -20, trend: "down" },
  { name: "Training & Development", amount: 38000, pct: 0.7, vsLast: 12, trend: "up" },
  { name: "Miscellaneous", amount: 72000, pct: 1.2, vsLast: 3.0, trend: "up" },
];

function MonthlyExpensesPage() {
  const { c, light } = useTheme();
  const col = light ? LIGHT : DARK;
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const load = () => fetch(`/api/expenses${month ? `?month=${month}` : ""}`).then(r => r.json()).then(d => { setData(d); setMonth(d.selectedMonth); });
  useEffect(() => { load(); }, [month]);

  if (!data) return null;
  const idx = data.months.findIndex((m:any) => m.value === data.selectedMonth);
  const shift = (delta: number) => { const ni = idx + delta; if (ni >= 0 && ni < data.months.length) setMonth(data.months[ni].value); };
  const find = (name: string) => data.breakdown.find((r:any) => r.name === name);
  const monthLabel = data.months[idx]?.label ?? "";

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly Company Expenses" subtitle="Full cost breakdown and budget analysis"
        actions={
          <>
            <div className="flex items-center gap-1">
              <button onClick={() => shift(-1)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${c("text-slate-400 hover:bg-slate-700","text-slate-500 hover:bg-slate-100")}`}><ChevronLeft size={15}/></button>
              <span className={`text-sm font-semibold px-3 ${c("text-white","text-slate-900")}`}>{monthLabel}</span>
              <button onClick={() => shift(1)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${c("text-slate-400 hover:bg-slate-700","text-slate-500 hover:bg-slate-100")}`}><ChevronRight size={15}/></button>
            </div>
            <Btn variant="secondary" size="sm" icon={Download} onClick={()=>window.location.href="/api/reports/export?type=expenses"}>Export CSV</Btn>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Expenses" value={`₹${(data.totalExpense/1000000).toFixed(2)}M`} icon={DollarSign} iconColor="bg-red-600/40" trend="up"/>
        <StatCard label="Payroll Cost" value={`₹${((find("Payroll")?.amount??0)/1000000).toFixed(2)}M`} icon={Users} iconColor="bg-indigo-600/40" trend="up"/>
        <StatCard label="Operations" value={`₹${((find("Operations")?.amount??0)/1000).toFixed(0)}K`} icon={Settings} iconColor="bg-amber-600/40" trend="up"/>
        <StatCard label="Benefits & Perks" value={`₹${((find("Benefits")?.amount??0)/1000).toFixed(0)}K`} icon={Award} iconColor="bg-emerald-600/40" trend="up"/>
      </div>

      {/* Stacked Bar Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>6-Month Expense Trend by Category</h3>
          <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>in thousands ₹</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={col.chartGrid}/>
            <XAxis dataKey="month" tick={{ fill: col.tickColor, fontSize: 11 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: col.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}K`}/>
            <Tooltip content={(p: any) => <ChartTip {...p} light={light}/>}/>
            <Legend wrapperStyle={{ fontSize: 11, color: col.tickColor }}/>
            <Bar key="exp-payroll" dataKey="payroll" name="Payroll" stackId="a" fill="#4F46E5"/>
            <Bar key="exp-benefits" dataKey="benefits" name="Benefits" stackId="a" fill="#22C55E"/>
            <Bar key="exp-ops" dataKey="ops" name="Operations" stackId="a" fill="#F59E0B"/>
            <Bar key="exp-marketing" dataKey="marketing" name="Marketing" stackId="a" fill="#8B5CF6"/>
            <Bar key="exp-infra" dataKey="infra" name="Infrastructure" stackId="a" fill="#06B6D4"/>
            <Bar key="exp-travel" dataKey="travel" name="Travel" stackId="a" fill="#F43F5E" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expense breakdown table */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className={`px-5 py-4 border-b ${c("border-white/[0.06]","border-slate-200")} flex items-center justify-between`}>
            <h3 className={`text-sm font-semibold ${c("text-white","text-slate-900")}`}>Expense Breakdown — {monthLabel}</h3>
            <span className={`text-xs font-semibold ${c("text-slate-300","text-slate-700")}`}>Total: ${(data.totalExpense/1000000).toFixed(2)}M</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={`border-b ${c("border-white/[0.06]","border-slate-200")}`}>
                {["Category","Amount","% of Total","vs Last Month","Trend",""].map(h => <th key={h} className={`text-left text-xs font-semibold px-4 py-3 ${c("text-slate-500","text-slate-400")}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.breakdown.map((cat:any, i:number) => (
                  <tr key={cat.name} className={`border-b ${c("border-white/[0.04]","border-slate-100")} ${c("hover:bg-slate-700/20","hover:bg-slate-50")}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: ["#4F46E5","#22C55E","#06B6D4","#F59E0B","#8B5CF6","#F43F5E","#EC4899","#14B8A6","#F97316","#94A3B8"][i] }}/>
                        <span className={`text-sm font-medium ${c("text-slate-200","text-slate-800")}`}>{cat.name}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${c("text-white","text-slate-900")}`}>₹{(cat.amount/1000).toFixed(0)}K</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={cat.pct} color="bg-indigo-500"/>
                        <span className={`text-xs w-10 flex-shrink-0 ${c("text-slate-400","text-slate-500")}`}>{cat.pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${cat.vsLast > 0 ? "text-red-400" : cat.vsLast < 0 ? "text-emerald-500" : c("text-slate-500","text-slate-400")}`}>
                        {cat.vsLast > 0 ? "+" : ""}{cat.vsLast}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {cat.trend === "up" && <span className="flex items-center gap-1 text-xs text-red-400"><ArrowUp size={11}/>Rising</span>}
                      {cat.trend === "down" && <span className="flex items-center gap-1 text-xs text-emerald-500"><ArrowDown size={11}/>Reduced</span>}
                      {cat.trend === "flat" && <span className={`text-xs ${c("text-slate-500","text-slate-400")}`}>→ Stable</span>}
                    </td>
                    <td className="px-4 py-3">
                      {cat.name !== "Payroll" && (
                        <button onClick={()=>setEditing(cat)} className={`w-7 h-7 rounded flex items-center justify-center ${c("text-slate-500 hover:text-indigo-400 hover:bg-slate-700/60","text-slate-400 hover:text-indigo-500 hover:bg-slate-100")}`}><Edit2 size={13}/></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Dept cost centers + budget vs actual */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Cost by Department</h3>
            <div className="space-y-3">
              {data.costByDept.map((d:any) => {
                const pct = data.totalExpense ? (d.cost / data.totalExpense) * 100 : 0;
                return (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${d.color}`}/><span className={c("text-slate-300","text-slate-700")}>{d.name}</span></div>
                      <span className={`font-semibold ${c("text-white","text-slate-900")}`}>₹{(d.cost/1000).toFixed(0)}K</span>
                    </div>
                    <ProgressBar value={Math.min(pct*3,100)} color={d.color}/>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-4 ${c("text-white","text-slate-900")}`}>Budget vs Actual</h3>
            <div className="space-y-3">
              {data.budgetVsActual.map((item:any) => {
                const over = item.actual > item.budget;
                const pct = item.budget ? (item.actual / item.budget) * 100 : 0;
                return (
                  <div key={item.cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={c("text-slate-400","text-slate-500")}>{item.cat}</span>
                      <span className={`font-semibold ${over ? "text-red-400" : "text-emerald-500"}`}>₹{item.actual}K / ₹{item.budget}K</span>
                    </div>
                    <ProgressBar value={Math.min(pct, 100)} color={over ? "bg-red-500" : "bg-emerald-500"}/>
                    {over && <p className="text-[10px] text-red-400 mt-0.5">Over budget by ₹{item.actual-item.budget}K</p>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
      {editing && (
        <EditExpenseModal
          category={editing.name}
          month={data.selectedMonth}
          initialAmount={String(editing.amount ?? "")}
          initialBudget={editing.budget != null ? String(editing.budget) : ""}
          onClose={()=>setEditing(null)}
          onSaved={()=>{ setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditExpenseModal({ category, month, initialAmount, initialBudget, onClose, onSaved }: { category: string; month: string; initialAmount: string; initialBudget: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(initialAmount);
  const [budget, setBudget] = useState(initialBudget);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!amount.trim() || !budget.trim()) { setError("Both amount and budget are required."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, month, amount, budgetAmount: budget }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not save."); return; }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay title={`Edit ${category}`} subtitle={month} onClose={onClose}>
      <div className="space-y-4">
        <div><FieldLabel label="Amount Spent (₹)" required/><FInput value={amount} onChange={setAmount} placeholder="e.g. 45000"/></div>
        <div><FieldLabel label="Budget (₹)" required/><FInput value={budget} onChange={setBudget} placeholder="e.g. 50000"/></div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Btn variant="primary" onClick={save} disabled={busy}>{busy?"Saving...":"Save"}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── PAGE ROUTER ─────────────────────────────────────────────────────────────

function PageContent({ page }: { page: Page }) {
  return (
    <div className="p-6 overflow-y-auto h-full">
      {page==="dashboard"&&<DashboardPage/>}{page==="employees"&&<EmployeesPage/>}{page==="departments"&&<DepartmentsPage/>}{page==="teams"&&<TeamsPage/>}
      {page==="projects"&&<ProjectsPage/>}{page==="tasks"&&<TasksPage/>}{page==="calendar"&&<CalendarPage/>}{page==="meetings"&&<MeetingsPage/>}
      {page==="attendance"&&<AttendancePage/>}{page==="leave"&&<LeavePage/>}{page==="payroll"&&<PayrollPage/>}{page==="payslip"&&<PayslipPage/>}
      {page==="kpi"&&<KPIPage/>}{page==="okr"&&<OKRPage/>}{page==="analytics"&&<AnalyticsPage/>}{page==="reports"&&<ReportsPage/>}
      {page==="knowledge"&&<KnowledgePage/>}
      {page==="settings"&&<SettingsPage/>}{page==="notifications"&&<NotificationsPage/>}{page==="roles"&&<RolesPage/>}
      {page==="audit"&&<AuditPage/>}{page==="billing"&&<BillingPage/>}{page==="profile"&&<ProfilePage/>}
      {page==="employee-profile"&&<EmployeeProfilePage/>}{page==="my-work"&&<MyWorkPage/>}
      {page==="eod"&&<EODPage/>}{page==="payroll-expenses"&&<MonthlyExpensesPage/>}{page==="expense-claims"&&<ExpenseClaimsPage/>}{page==="expense-log"&&<ExpenseLogPage/>}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(1);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalName>(null);
  const [modalData, setModalData] = useState<any>(null);
  const openModal = (n: ModalName, data?: any) => { setActiveModal(n); setModalData(data ?? null); };
  const closeModal = () => { setActiveModal(null); setModalData(null); };

  const light = theme === "light";
  const c = (dark: string, lt: string) => light ? lt : dark;
  const ctx: ThemeCtxType = { theme, setTheme, light, c };

  const landingPage: Record<UserRole, Page> = {
    "super-admin": "dashboard",
    "1st-level-manager": "dashboard",
    "2nd-level-manager": "dashboard",
    "manager": "dashboard",
    "team-lead": "my-work",
    "hr-admin": "employees",
    "employee": "my-work",
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.user) setAuthUser(data.user); })
      .finally(() => setAuthChecked(true));
  }, []);

  const login = (u: AuthUser) => {
    setAuthUser(u);
    setPage(landingPage[u.role] || "dashboard");
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setAuthUser(null);
    setPage("dashboard");
  };

  const updateAuthUser = (u: AuthUser) => setAuthUser(u);

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "#060D1F" }}>
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>;
  }

  if (!authUser) {
    return (
      <AuthCtx.Provider value={{ authUser, login, logout, updateAuthUser }}>
        <LoginPage />
      </AuthCtx.Provider>
    );
  }

  return (
    <AuthCtx.Provider value={{ authUser, login, logout, updateAuthUser }}>
      <ThemeCtx.Provider value={ctx}>
        <AppCtx.Provider value={{ selectedEmployeeId, setSelectedEmployeeId, navigateTo: setPage }}>
          <ModalCtx.Provider value={{ openModal, closeModal, activeModal, modalData }}>
            <DndProvider backend={HTML5Backend}>
              <div className="flex h-screen overflow-hidden" style={{ background:light?LIGHT.bg:DARK.bg, fontFamily:"'Inter',-apple-system,sans-serif" }}>
                <Sidebar activePage={page} onNavigate={setPage} collapsed={sidebarCollapsed} onToggle={()=>setSidebarCollapsed(v=>!v)}/>
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <TopBar activePage={page} onNavigate={setPage} onToggleTheme={()=>setTheme(t=>t==="dark"?"light":"dark")}/>
                  <main className="flex-1 overflow-hidden"><PageContent page={page}/></main>
                </div>
              </div>
              <ModalSystem/>
            </DndProvider>
          </ModalCtx.Provider>
        </AppCtx.Provider>
      </ThemeCtx.Provider>
    </AuthCtx.Provider>
  );
}
