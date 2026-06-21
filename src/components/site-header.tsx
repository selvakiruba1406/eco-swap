import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, MessageCircle, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: q || undefined } as any });
  };

  const onSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md ring-1 ring-black/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-semibold tracking-tight text-brand">
              EcoSwap
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/browse"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-sm font-medium text-foreground" }}
              >
                Browse
              </Link>
              <Link
                to="/sell"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-sm font-medium text-foreground" }}
              >
                Sell Gear
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <form onSubmit={onSearch} className="relative hidden sm:flex items-center">
              <Search className="absolute left-3 size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="search"
                placeholder="Search electronics..."
                className="h-9 w-56 lg:w-64 rounded-full bg-muted pl-9 pr-4 text-sm ring-1 ring-black/5 focus:ring-brand/30 outline-none"
              />
            </form>

            {user ? (
              <>
                <Link
                  to="/messages"
                  className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
                  aria-label="Messages"
                >
                  <MessageCircle className="size-5" />
                </Link>
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-1.5 py-2 pl-2 pr-3 text-sm font-medium text-brand-foreground bg-brand rounded-lg hover:opacity-90"
                >
                  <Plus className="size-4" />
                  List Item
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-secondary">
                    <UserIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/account">My listings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/messages">Messages</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile/$id" params={{ id: user.id }}>
                        Public profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSignOut}>
                      <LogOut className="size-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-1.5 py-2 pl-2 pr-3 text-sm font-medium text-brand-foreground bg-brand rounded-lg hover:opacity-90"
                >
                  <Plus className="size-4" />
                  List Item
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
