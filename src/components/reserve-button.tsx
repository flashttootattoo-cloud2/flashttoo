"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, Loader2, MessageSquare } from "lucide-react";
import type { Design } from "@/types/database";

interface ReserveButtonProps {
  design: Design & { artist: { id: string; full_name: string } };
  userId: string;
}

export function ReserveButton({ design, userId }: ReserveButtonProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReserve = async () => {
    setLoading(true);
    try {
      // Create reservation
      const { error: reservationError } = await supabase
        .from("reservations")
        .insert({
          design_id: design.id,
          client_id: userId,
          artist_id: design.artist.id,
          status: "pending",
          message: message || null,
          preferred_date: preferredDate || null,
        });

      if (reservationError) throw reservationError;

      // Create or find conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${userId},participant_2.eq.${design.artist.id}),and(participant_1.eq.${design.artist.id},participant_2.eq.${userId})`
        )
        .single();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            participant_1: userId,
            participant_2: design.artist.id,
          })
          .select("id")
          .single();
        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Send initial message
      const autoMessage = `Hola! Me interesa reservar tu diseño "${design.title}".${message ? `\n\n${message}` : ""}${preferredDate ? `\n\nFecha preferida: ${preferredDate}` : ""}`;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: autoMessage,
        status: "sent",
      });

      // Update conversation last_message
      await supabase
        .from("conversations")
        .update({
          last_message: autoMessage.slice(0, 80),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      // Obtener nombre del cliente para las notificaciones
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      const senderName = clientProfile?.full_name ?? "Un cliente";
      const preview = `Reserva: "${design.title}"`;

      // Broadcast en tiempo real (navbar badge del artista)
      const bc = supabase.channel(`user-notify:${design.artist.id}`);
      bc.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          bc.send({
            type: "broadcast",
            event: "new_message",
            payload: { senderName, preview },
          }).then(() => supabase.removeChannel(bc));
        }
      });

      // Push notification (si el artista tiene la app cerrada o en segundo plano)
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: design.artist.id,
          senderName,
          messagePreview: preview,
          conversationId,
        }),
      }).catch(() => {});

      toast.success("¡Reserva enviada! El tatuador recibirá tu solicitud.");
      setOpen(false);
    } catch {
      toast.error("Error al enviar la reserva. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold h-12 text-base"
      >
        <CalendarDays className="w-5 h-5 mr-2" />
        Reservar este diseño
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Reservar "{design.title}"</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Enviá tu solicitud a{" "}
              <span className="text-white">{design.artist.full_name}</span>. Te
              contactará para confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Fecha preferida (opcional)
              </label>
              <Input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Mensaje (opcional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="¿Tenés alguna consulta o preferencia especial?"
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 border-zinc-700 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReserve}
                disabled={loading}
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Enviar reserva"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
