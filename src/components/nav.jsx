"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {Gauge, Settings} from "lucide-react";

const navigation = [
  {name: "Dashboard", href: "/", icon: Gauge},
  {name: "Configure", href: "/configure", icon: Settings},
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 p-4">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
