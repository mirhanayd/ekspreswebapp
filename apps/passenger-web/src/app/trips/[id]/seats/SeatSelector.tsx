'use client';

import { useState, useEffect, useCallback } from 'react';

type Seat = {
  id: string;
  seatNo: string;
  seatType: string;
  priceMinor: number;
  status: string;
};

type SeatMapData = {
  tripId: string;
  bus: { plateNumber: string; model: string };
  seatLayout: {
    layout: string;
    rows: number;
    columns: number;
    items: Array<{
      type: string;
      seatNo?: string;
      row: number;
      column: number;
    }>;
  };
  seats: Seat[];
};

export default function SeatSelector({
  tripId,
  initialData,
}: {
  tripId: string;
  initialData: SeatMapData;
}) {
  const [seatMap, setSeatMap] = useState<SeatMapData>(initialData);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [holdInfo, setHoldInfo] = useState<{
    holdId: string;
    seatNo: string;
    expiresAt: string;
    ttlSeconds: number;
  } | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  // Countdown timer for hold
  useEffect(() => {
    if (!holdInfo) {
      setCountdown(0);
      return;
    }
    const expiresAt = new Date(holdInfo.expiresAt).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        // Hold expired, reset
        setHoldInfo(null);
        setSelectedSeat(null);
        refreshSeatMap();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdInfo]);

  const refreshSeatMap = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/seats/trip/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setSeatMap(data);
      }
    } catch {
      // Silently fail on refresh
    }
  }, [apiUrl, tripId]);

  const handleSeatClick = async (seat: Seat) => {
    if (seat.status !== 'available' || loading) return;

    // If another seat is already held, release it first
    if (holdInfo) {
      await releaseCurrentHold();
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/seats/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          seatNo: seat.seatNo,
          userId: 'demo-user-id', // Demo: in production this comes from auth
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to hold seat');
      }

      const holdData = await res.json();
      setHoldInfo(holdData);
      setSelectedSeat(seat.seatNo);
      await refreshSeatMap();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const releaseCurrentHold = async () => {
    if (!holdInfo) return;
    try {
      await fetch(`${apiUrl}/seats/hold/${holdInfo.holdId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user-id' }),
      });
    } catch {
      // Best-effort release
    }
    setHoldInfo(null);
    setSelectedSeat(null);
    await refreshSeatMap();
  };

  const getSeatStatus = (seatNo: string): string => {
    const seat = seatMap.seats.find((s) => s.seatNo === seatNo);
    if (!seat) return 'unavailable';
    if (selectedSeat === seatNo) return 'selected';
    return seat.status;
  };

  const getSeatColor = (status: string): string => {
    switch (status) {
      case 'selected':
        return 'bg-blue-600 text-white border-blue-700 shadow-lg scale-105';
      case 'available':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer';
      case 'held':
        return 'bg-amber-100 text-amber-800 border-amber-300 cursor-not-allowed';
      case 'purchased':
        return 'bg-red-100 text-red-400 border-red-200 cursor-not-allowed';
      case 'blocked':
        return 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed';
      default:
        return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
    }
  };

  const layout = seatMap.seatLayout;
  const maxRow = layout?.rows || 14;

  // Build the grid from layout items
  const rows = [];
  for (let r = 1; r <= maxRow; r++) {
    const rowItems = (layout?.items || []).filter((item: any) => item.row === r);
    rows.push({ row: r, items: rowItems });
  }

  const selectedSeatData = seatMap.seats.find((s) => s.seatNo === selectedSeat);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {[
          { label: 'Boş', color: 'bg-emerald-50 border-emerald-300' },
          { label: 'Seçili', color: 'bg-blue-600 border-blue-700' },
          { label: 'Tutulmuş', color: 'bg-amber-100 border-amber-300' },
          { label: 'Satılmış', color: 'bg-red-100 border-red-200' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded border ${item.color}`} />
            <span className="text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Bus layout */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <div className="max-w-xs mx-auto space-y-1.5">
          {rows.map(({ row, items }) => (
            <div key={row} className="flex items-center gap-1.5 justify-center">
              {[1, 2, 3, 4].map((col) => {
                const item = items.find((i: any) => i.column === col);
                if (!item) {
                  return <div key={col} className="w-11 h-11" />;
                }
                if (item.type === 'aisle') {
                  return <div key={col} className="w-6 h-11" />;
                }
                if (item.type === 'driver') {
                  return (
                    <div
                      key={col}
                      className="w-11 h-11 rounded-lg bg-gray-300 border border-gray-400 flex items-center justify-center text-xs text-gray-500"
                    >
                      🚌
                    </div>
                  );
                }
                if (item.type === 'seat' && item.seatNo) {
                  const status = getSeatStatus(item.seatNo);
                  const seat = seatMap.seats.find((s) => s.seatNo === item.seatNo);
                  return (
                    <button
                      key={col}
                      disabled={status !== 'available' && status !== 'selected'}
                      onClick={() => {
                        if (status === 'selected') {
                          releaseCurrentHold();
                        } else if (seat) {
                          handleSeatClick(seat);
                        }
                      }}
                      className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 ${getSeatColor(status)}`}
                    >
                      {item.seatNo}
                    </button>
                  );
                }
                return <div key={col} className="w-11 h-11" />;
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Hold info */}
      {holdInfo && selectedSeatData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-blue-900">Koltuk {selectedSeat} seçildi</p>
              <p className="text-sm text-blue-700">
                Fiyat: {(selectedSeatData.priceMinor / 100).toFixed(2)} ₺
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-800 tabular-nums">
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </p>
              <p className="text-xs text-blue-600">kalan süre</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={releaseCurrentHold}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Vazgeç
            </button>
            <button className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-semibold shadow-md">
              Devam Et
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 text-sm animate-pulse">İşleniyor...</div>
      )}
    </div>
  );
}
