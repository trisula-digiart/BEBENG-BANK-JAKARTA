"use client";

import React, { useEffect, useState, useCallback } from "react";

interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  category: "Instruksi" | "Pengumuman" | "Target" | "Mendesak";
  created_at: string;
  is_read: boolean;
}

interface BroadcastInboxProps {
  unitId: string;
}

export function BroadcastInbox({ unitId }: BroadcastInboxProps) {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBroadcasts = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/area-broadcasts?unit_id=${unitId}`);
      const result = await res.json();
      if (res.ok && result.data) {
        setBroadcasts(result.data);
      }
    } catch (err) {
      console.error("Failed fetching broadcasts:", err);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleMarkAsRead = async (broadcastId: string) => {
    try {
      const res = await fetch("/api/area-broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcast_id: broadcastId, unit_id: unitId }),
      });

      if (res.ok) {
        setBroadcasts((prev) =>
          prev.map((b) => (b.id === broadcastId ? { ...b, is_read: true } : b))
        );
      }
    } catch (err) {
      console.error("Failed marking read:", err);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Mendesak": return "bg-rose-950 text-rose-400 border-rose-800";
      case "Instruksi": return "bg-amber-950 text-amber-400 border-amber-800";
      case "Target": return "bg-blue-950 text-blue-400 border-blue-800";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const unreadCount = broadcasts.filter((b) => !b.is_read).length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="text-purple-500">📢</span> Kotak Masuk Instruksi & Pengumuman Area
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Memo resmi dan arahan operasional dari Area Head.
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold animate-pulse">
            {unreadCount} BELUM DIBACA
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-slate-500 py-6 text-center animate-pulse">Memuat pengumuman area...</div>
      ) : broadcasts.length === 0 ? (
        <div className="text-xs text-slate-500 py-6 text-center">Belum ada pengumuman / instruksi dari Area Head.</div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {broadcasts.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                item.is_read
                  ? "bg-slate-950/40 border-slate-800/60 opacity-80"
                  : "bg-slate-950 border-purple-800/60 shadow-lg shadow-purple-950/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${getCategoryBadge(item.category)}`}>
                    {item.category}
                  </span>
                  <h3 className="text-xs font-bold text-slate-100">{item.title}</h3>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(item.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>

              {!item.is_read && (
                <div className="mt-2.5 text-right">
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="text-[11px] font-medium text-purple-400 hover:text-purple-300 underline cursor-pointer"
                  >
                    ✓ Tandai Sudah Dibaca
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}