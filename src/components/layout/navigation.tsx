"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Wifi,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  Sun,
  Moon,
  PanelLeftClose,
  UserCog,
} from "lucide-react";
import { useState, createContext, useContext } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useAppSettings } from "@/hooks/use-app-settings";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/paket", label: "Paket Internet", icon: Wifi },
  { href: "/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/tagihan", label: "Tagihan", icon: FileText },
  { href: "/pembayaran", label: "Pembayaran", icon: CreditCard },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/users", label: "Manajemen User", icon: UserCog, adminOnly: true },
  { href: "/settings", label: "Pengaturan", icon: Settings, adminOnly: true },
];

// Context for sidebar collapsed state
const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150",
        collapsed ? "w-10 h-10" : "w-8 h-8"
      )}
      aria-label="Toggle dark mode"
    >
      <Sun className="h-4 w-4 hidden dark:block" />
      <Moon className="h-4 w-4 block dark:hidden" />
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, setCollapsed } = useSidebar();
  const isAdmin = session?.user?.role === "admin";
  const { logoUrl } = useAppSettings();

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border transition-all duration-300",
        collapsed ? "md:w-[68px]" : "md:w-64"
      )}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className={cn("flex items-center h-16 border-b border-border", collapsed ? "justify-center px-2" : "justify-between px-6")}>
          <div className={cn("flex items-center", collapsed ? "" : "gap-3")}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Globe className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <h1 className="text-sm font-semibold text-foreground">Bill BumdesNET</h1>
                <p className="text-xs text-muted-foreground">Desa Jelijih Punggang</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center py-3 border-b border-border">
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
              aria-label="Expand sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        )}
        <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors duration-150",
                  collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
        <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Keluar" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors duration-150",
              collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2 w-full"
            )}
            style={{ color: "#d87943" }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Keluar"}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [open, setOpen] = useState(false);
  const { logoUrl } = useAppSettings();

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-primary-foreground" />
            )}
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-foreground">Bill BumdesNET</h1>
            <p className="text-[10px] text-muted-foreground">Desa Jelijih Punggang</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} className="p-2 text-muted-foreground">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 top-14 bg-card z-40 overflow-y-auto">
          <nav className="px-4 py-3 space-y-1">
            {filteredNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="border-t border-border mt-4 pt-4">
              <div className="px-4 py-2 mb-2">
                <p className="text-sm font-medium text-foreground">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{session?.user?.role}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors duration-150"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

export function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="hidden md:flex h-14 items-center justify-between px-6 border-b border-border bg-card">
      <div />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-medium">
          {session?.user?.name?.charAt(0) || "U"}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{session?.user?.role}</p>
        </div>
      </div>
    </header>
  );
}
