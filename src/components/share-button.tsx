"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  username: string;
  className?: string;
}

export function ShareButton({ username, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/artist/${username}`;

    if (navigator.share) {
      // Mobile native share sheet
      navigator.share({ title: `@${username} en flashtto`, url }).catch(() => {});
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={`border-zinc-700 hover:bg-zinc-800 gap-2 ${className ?? ""}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400">¡Copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Compartir</span>
        </>
      )}
    </Button>
  );
}
