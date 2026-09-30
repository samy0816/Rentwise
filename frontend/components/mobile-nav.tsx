"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Scale,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { translate, type TranslationKey } from "@/lib/i18n";

const items: { href: string; key: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/documents", key: "nav.documents", icon: FolderOpen },
  { href: "/ask", key: "nav.ask", icon: MessageSquareText },
  { href: "/compare", key: "nav.compare", icon: Scale },
];

export function MobileNav() {
  const pathname = usePathname();
  const { language, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button onClick={() => { signOut(); router.push("/"); }} aria-label="Sign out">
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
      <nav className="flex divide-x border-t">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {translate(item.key, language)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
