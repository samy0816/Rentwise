"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderOpen,
  Languages,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Scale,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { translate, type Language, type TranslationKey } from "@/lib/i18n";

const navItems: { href: string; key: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/documents", key: "nav.documents", icon: FolderOpen },
  { href: "/ask", key: "nav.ask", icon: MessageSquareText },
  { href: "/compare", key: "nav.compare", icon: Scale },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, language, setLanguage, signOut } = useAuth();
  const router = useRouter();

  function onSignOut() {
    signOut();
    router.push("/");
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-6 py-3">
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-sm font-medium">My Apartment</p>
          <p className="text-xs text-muted-foreground">Berlin, Germany</p>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {translate(item.key, language)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {(user?.full_name || user?.email || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.full_name || "Demo User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-between"
            onClick={() => setLanguage(language === "en" ? "de" : "en")}
          >
            <Languages className="h-3.5 w-3.5" />
            {language === "en" ? "English" : "Deutsch"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
