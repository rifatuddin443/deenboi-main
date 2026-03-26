import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ScanBarcode,
  BookOpen,
  LayoutDashboard,
  BarChart3,
  RotateCcw,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/", icon: ScanBarcode, label: "Scan & Sell" },
  { to: "/inventory", icon: BookOpen, label: "Inventory" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/returns", icon: RotateCcw, label: "Returns" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role, signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border">
        <h1 className="font-display text-lg text-sidebar-foreground">Barakah Books</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground p-1"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 h-full md:h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 hidden md:block">
          <h1 className="font-display text-2xl text-sidebar-foreground leading-tight">
            Barakah Books
          </h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Inventory & Sales</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-sidebar-foreground/60 truncate flex-1">{user?.email}</p>
            <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground/70 capitalize">
              {role || "..."}
            </Badge>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
