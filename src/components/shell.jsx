"use client";

import {useState, useEffect} from "react";
import {Navigation} from "@/components/nav";
import {Button} from "@/components/ui/button";
import {Sheet, SheetContent, SheetTrigger} from "@/components/ui/sheet";
import {LogOut, Menu, Clock} from "lucide-react";
import {useAuth} from "@/lib/auth-context";
import {useRouter} from "next/navigation";

export function Shell({children, title}) {
  const {logout} = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px]">
            <span className="font-semibold">Firext System</span>
          </div>
          <Navigation />
        </div>
      </div>
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 border-b bg-background">
          <div className="flex h-14 items-center justify-between gap-4 px-4 lg:h-[60px] lg:px-6">
            <div className="flex items-center gap-4">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <div className="flex h-14 items-center border-b px-4 lg:h-[60px]">
                    <span className="font-semibold">Firext System</span>
                  </div>
                  <Navigation />
                </SheetContent>
              </Sheet>
              <h1 className="font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatDate(currentTime)}</span>
                <span className="text-sm font-medium">
                  {formatTime(currentTime)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
