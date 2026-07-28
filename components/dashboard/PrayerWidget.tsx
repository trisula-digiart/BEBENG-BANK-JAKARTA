"use client";

import React, { useEffect, useState } from "react";

interface PrayerTimes {
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export function PrayerWidget() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>({
    subuh: "04:42",
    dzuhur: "12:02",
    ashar: "15:23",
    maghrib: "17:58",
    isya: "19:10",
  });

  // Clock Ticker
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Prayer Times for Jakarta Region
  useEffect(() => {
    async function fetchPrayers() {
      try {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");

        const res = await fetch(`https://api.myquran.com/v2/sholat/jadwal/1301/${y}/${m}/${d}`);
        const result = await res.json();
        if (result?.status && result?.data?.jadwal) {
          const j = result.data.jadwal;
          setPrayerTimes({
            subuh: j.subuh,
            dzuhur: j.dzuhur,
            ashar: j.ashar,
            maghrib: j.maghrib,
            isya: j.isya,
          });
        }
      } catch (err) {
        // Fallback default times on error
      }
    }

    fetchPrayers();
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur">
      {/* Header Jam Digital */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
        <div>
          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">
            WAKTU OPERASIONAL REAL-TIME
          </div>
          <div className="text-3xl font-black font-mono text-slate-100 tracking-wider mt-0.5">
            {currentTime || "00:00:00 WIB"}
          </div>
          <div className="text-xs text-slate-400 font-medium">{currentDate}</div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-emerald-400 text-xs">📍</span>
          <span className="text-xs font-semibold text-slate-300">DKI Jakarta & Area Sekitarnya</span>
        </div>
      </div>

      {/* Jadwal Sholat Cards */}
      <div>
        <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
          <span>🕌</span> Jadwal Sholat Hari Ini:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 hover:border-amber-500/50 transition-colors">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Subuh</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{prayerTimes.subuh}</div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 hover:border-amber-500/50 transition-colors">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Dzuhur</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{prayerTimes.dzuhur}</div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 hover:border-amber-500/50 transition-colors">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Ashar</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{prayerTimes.ashar}</div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 hover:border-amber-500/50 transition-colors">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Maghrib</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{prayerTimes.maghrib}</div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 hover:border-amber-500/50 transition-colors">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Isya</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{prayerTimes.isya}</div>
          </div>
        </div>
      </div>
    </div>
  );
}