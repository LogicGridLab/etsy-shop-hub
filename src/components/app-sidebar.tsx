import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Package, Receipt, Settings, ShoppingBag, Store } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useShops } from "@/lib/shop-context";

const items = [
  { title: "Executive Dashboard", url: "/", icon: BarChart3 },
  { title: "Orders & Revenue", url: "/orders", icon: Receipt },
  { title: "Listing Performance", url: "/listings", icon: Package },
  { title: "Expenses & Ad Spend", url: "/expenses", icon: ShoppingBag },
  { title: "Settings & API Setup", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data } = useShops();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.png" alt="EtsyOps" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-sm font-bold leading-tight">EtsyOps</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Multi-Shop Analytics</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Connected shops</p>
            {(data?.shops ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-sidebar-foreground">{s.shop_name}</span>
                <Badge variant={s.sync_status === "synced" ? "default" : "secondary"} className="h-4 px-1.5 text-[10px]">
                  {s.sync_status}
                </Badge>
              </div>
            ))}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
