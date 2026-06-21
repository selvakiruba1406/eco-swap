import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { timeAgo } from "@/lib/marketplace";
import { Send, ImageOff } from "lucide-react";

const searchSchema = z.object({ c: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Messages — EcoSwap" }] }),
  component: MessagesPage,
});

type Profile = { id: string; display_name: string; avatar_url: string | null };
type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listings: { id: string; title: string; cover_image: string | null; price: string };
  buyer: Profile;
  seller: Profile;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function MessagesPage() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user.id],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`id, listing_id, buyer_id, seller_id, last_message_at, listings ( id, title, cover_image, price )`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<Omit<Conversation, "buyer" | "seller">>;
      const userIds = Array.from(new Set(rows.flatMap((c) => [c.buyer_id, c.seller_id])));
      const profilesById: Record<string, Profile> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .in("id", userIds);
        for (const p of profiles ?? []) profilesById[p.id] = p as Profile;
      }
      const fallback = (id: string): Profile => profilesById[id] ?? { id, display_name: "User", avatar_url: null };
      return rows.map((r) => ({ ...r, buyer: fallback(r.buyer_id), seller: fallback(r.seller_id) }));
    },
  });

  const activeId = search.c ?? conversations?.[0]?.id;
  const active = conversations?.find((c) => c.id === activeId);

  const { data: messages } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!activeId,
  });

  // Realtime subscription to active conversation
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", activeId] });
          qc.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, qc, user.id]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages?.length, activeId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    const body = draft.trim().slice(0, 2000);
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: user.id,
      body,
    });
    if (error) {
      console.error(error);
      setDraft(body);
    } else {
      qc.invalidateQueries({ queryKey: ["messages", activeId] });
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <h1 className="text-2xl font-medium mb-6">Messages</h1>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !conversations || conversations.length === 0 ? (
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-12 text-center">
            <p className="text-muted-foreground">No conversations yet. Browse listings and message sellers to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-card rounded-2xl ring-1 ring-black/5 overflow-hidden h-[70vh]">
            {/* List */}
            <aside className="md:col-span-4 border-r border-border overflow-y-auto">
              {conversations.map((c) => {
                const other = c.buyer_id === user.id ? c.seller : c.buyer;
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate({ search: { c: c.id } })}
                    className={
                      "w-full text-left p-4 border-b border-border hover:bg-muted/50 transition " +
                      (c.id === activeId ? "bg-muted/60" : "")
                    }
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className="size-9 rounded-full bg-muted overflow-hidden grid place-items-center text-sm font-medium">
                        {other.avatar_url ? (
                          <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          other.display_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium truncate">{other.display_name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo(c.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.listings.title}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Thread */}
            <section className="md:col-span-8 flex flex-col">
              {active ? (
                <>
                  <header className="p-4 border-b border-border flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-muted overflow-hidden grid place-items-center shrink-0">
                      {active.listings.cover_image ? (
                        <img src={active.listings.cover_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageOff className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{active.listings.title}</p>
                      <p className="text-xs text-muted-foreground">
                        with {(active.buyer_id === user.id ? active.seller : active.buyer).display_name}
                      </p>
                    </div>
                  </header>

                  <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Say hello — ask about condition, pickup, or anything else.
                      </p>
                    ) : (
                      messages?.map((m) => {
                        const mine = m.sender_id === user.id;
                        return (
                          <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                            <div
                              className={
                                "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap " +
                                (mine
                                  ? "bg-brand text-brand-foreground rounded-br-md"
                                  : "bg-muted text-foreground rounded-bl-md")
                              }
                            >
                              {m.body}
                              <div className={"text-[10px] mt-0.5 opacity-70"}>{timeAgo(m.created_at)}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={sendMessage} className="p-3 border-t border-border flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message..."
                      maxLength={2000}
                      className="flex-1 h-10 rounded-full bg-muted px-4 text-sm outline-none focus:ring-2 ring-brand/20"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="size-10 rounded-full bg-brand text-brand-foreground grid place-items-center disabled:opacity-50"
                    >
                      <Send className="size-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
                  Select a conversation
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
