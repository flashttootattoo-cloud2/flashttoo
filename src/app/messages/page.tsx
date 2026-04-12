"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Conversation, Message, Profile } from "@/types/database";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function MessagesContent() {
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("user");

  const [conversations, setConversations] = useState<(Conversation & { other_user: Profile })[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [unreadConvIds, setUnreadConvIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (!data) return;

      const convsWithUsers = await Promise.all(
        data.map(async (conv) => {
          const otherId =
            conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          const { data: otherUser } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", otherId)
            .single();
          return { ...conv, other_user: otherUser };
        })
      );

      const filtered = convsWithUsers.filter((c) => c.other_user) as typeof convsWithUsers;
      setConversations(filtered as never);
      setLoadingConvs(false);

      // Marcar como no leída cualquier conversación donde el último mensaje
      // llegó después de la última vez que el usuario la abrió (localStorage).
      const stored = JSON.parse(localStorage.getItem("conv_read_at") ?? "{}") as Record<string, string>;
      const unreadIds = new Set<string>();
      for (const conv of filtered) {
        if (!conv.last_message_at || !conv.last_message) continue;
        const lastRead = stored[conv.id];
        // Unread if we have never opened it OR the last message arrived after we last opened it
        if (!lastRead || conv.last_message_at > lastRead) {
          unreadIds.add(conv.id);
        }
      }
      setUnreadConvIds(unreadIds);
    };

    loadConversations();

    // If target user provided, find or create conversation
    if (targetUserId && user.id !== targetUserId) {
      supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${user.id})`
        )
        .single()
        .then(async ({ data: existing }) => {
          if (existing) {
            setActiveConversationId(existing.id);
          } else {
            const { data: newConv } = await supabase
              .from("conversations")
              .insert({ participant_1: user.id, participant_2: targetUserId })
              .select("id")
              .single();
            if (newConv) {
              setActiveConversationId(newConv.id);
              loadConversations();
            }
          }
        });
    }
  }, [user, targetUserId]);

  // Keep ref in sync so broadcast callback always reads current active conversation
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Watch for conversation inserts/updates — mark as unread when someone writes to us
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`conv-watch:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const convId = payload.new.id as string;
          if (convId !== activeConvRef.current) {
            setUnreadConvIds((prev) => new Set(prev).add(convId));
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? { ...c, last_message: payload.new.last_message as string, last_message_at: payload.new.last_message_at as string }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        async (payload) => {
          const conv = payload.new;
          // Only care if we're a participant and didn't create it ourselves
          if (conv.participant_1 !== user.id && conv.participant_2 !== user.id) return;
          const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          const { data: otherUser } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", otherId)
            .single();
          if (!otherUser) return;
          const newConv = { ...conv, other_user: otherUser };
          setConversations((prev) => [newConv as never, ...prev]);
          // Mark as unread only if the other person created it (they're reaching out to us)
          if (conv.participant_1 !== user.id) {
            setUnreadConvIds((prev) => new Set(prev).add(conv.id as string));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(*)")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      setMessages((data as never) ?? []);
      setTimeout(scrollToBottom, 100);
    };

    // Guardar timestamp de apertura en localStorage → persiste entre navegaciones
    const stored = JSON.parse(localStorage.getItem("conv_read_at") ?? "{}") as Record<string, string>;
    stored[activeConversationId] = new Date().toISOString();
    localStorage.setItem("conv_read_at", JSON.stringify(stored));
    // Limpiar el punto rojo localmente
    setUnreadConvIds((prev) => { const next = new Set(prev); next.delete(activeConversationId); return next; });

    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !user) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      sender_id: user.id,
      content,
      status: "sent",
    });

    const now = new Date().toISOString();
    await supabase
      .from("conversations")
      .update({ last_message: content.slice(0, 80), last_message_at: now })
      .eq("id", activeConversationId);

    // Marcar como leída desde nuestro lado (nosotros mandamos el último mensaje)
    const readStored = JSON.parse(localStorage.getItem("conv_read_at") ?? "{}") as Record<string, string>;
    readStored[activeConversationId] = now;
    localStorage.setItem("conv_read_at", JSON.stringify(readStored));

    // Broadcast en tiempo real al destinatario (funciona aunque esté conectado)
    const conv = conversations.find((c) => c.id === activeConversationId);
    if (conv?.other_user) {
      const bc = supabase.channel(`user-notify:${conv.other_user.id}`);
      bc.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          bc.send({
            type: "broadcast",
            event: "new_message",
            payload: {
              senderName: profile?.full_name ?? "Alguien",
              preview: content.slice(0, 60),
              conversationId: activeConversationId,
            },
          }).then(() => supabase.removeChannel(bc));
        }
      });

      // Push notification al destinatario
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: conv.other_user.id,
          senderName: conv.other_user.full_name ?? "Alguien",
          messagePreview: content.slice(0, 60),
        }),
      }).catch(() => {});
    }

    setSending(false);
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-zinc-500">
        Debes iniciar sesión para ver tus mensajes.
      </div>
    );
  }

  const showChat = activeConversationId && activeConversation;

  const conversationList = (
    <div className={cn(
      "flex flex-col bg-zinc-900 border-zinc-800",
      "md:w-72 md:border-r md:rounded-none",
      showChat ? "hidden md:flex" : "flex w-full border rounded-2xl"
    )}>
      <div className="p-3 border-b border-zinc-800">
        <p className="text-sm font-medium text-zinc-400">Conversaciones</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingConvs ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Sin conversaciones aún
          </div>
        ) : (
          conversations.map((conv) => {
            const hasUnread = unreadConvIds.has(conv.id);
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 transition-colors text-left",
                  activeConversationId === conv.id
                    ? "bg-zinc-800"
                    : hasUnread
                    ? "bg-amber-400/10 hover:bg-amber-400/20 border-l-2 border-amber-400"
                    : "hover:bg-zinc-800"
                )}
              >
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={conv.other_user?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-amber-400 text-zinc-900 text-sm font-bold">
                    {conv.other_user?.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", hasUnread ? "font-bold text-white" : "font-medium text-white")}>
                    {conv.other_user?.full_name}
                  </p>
                  <p className={cn("text-xs truncate", hasUnread ? "text-zinc-300" : "text-zinc-500")}>
                    {conv.last_message ?? "Sin mensajes"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-32 md:pb-6">
      <h1 className="text-2xl font-bold mb-4">Mensajes</h1>

      {/* Mobile: list or chat. Desktop: side by side */}
      <div className="md:bg-zinc-900 md:border md:border-zinc-800 md:rounded-2xl md:overflow-hidden md:flex md:h-[70vh]">
        {conversationList}

        {/* Chat area */}
        {showChat ? (
          <div className={cn(
            "flex flex-col flex-1",
            "h-[calc(100vh-16rem)] md:h-auto",
            "bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-none md:border-0"
          )}>
            {/* Header */}
            <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
              <button
                onClick={() => setActiveConversationId(null)}
                className="md:hidden text-zinc-400 hover:text-white p-1 -ml-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={activeConversation.other_user?.avatar_url ?? ""} />
                <AvatarFallback className="bg-amber-400 text-zinc-900 text-xs font-bold">
                  {activeConversation.other_user?.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{activeConversation.other_user?.full_name}</p>
                <p className="text-xs text-zinc-500">@{activeConversation.other_user?.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      isMe ? "bg-amber-400 text-zinc-900" : "bg-zinc-800 text-white"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn("text-xs mt-1 opacity-60", isMe ? "text-right" : "text-left")}>
                        {format(new Date(msg.created_at), "HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Escribí un mensaje..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="bg-amber-400 hover:bg-amber-300 text-zinc-900 shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-zinc-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Seleccioná una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
