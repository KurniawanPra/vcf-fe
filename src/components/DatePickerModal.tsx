"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function getTodayWIB(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(str: string): string {
  if (!str) return "—";
  const d = parseDateStr(str);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onApply: (startDate: string, endDate: string) => void;
}

export default function DatePickerModal({ isOpen, onClose, startDate, endDate, onApply }: DatePickerModalProps) {
  const today = getTodayWIB();
  const todayDate = parseDateStr(today);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [showYearPicker, setShowYearPicker] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync when opened
  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setSelecting("start");
      setShowYearPicker(false);
      if (startDate) {
        const d = parseDateStr(startDate);
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
      }
    }
  }, [isOpen, startDate, endDate]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal-open"));
    } else {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    }
    return () => {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    };
  }, [isOpen]);

  const handleDayClick = useCallback((dateStr: string) => {
    if (selecting === "start") {
      setTempStart(dateStr);
      // If the new start is after end, reset end
      if (tempEnd && dateStr > tempEnd) {
        setTempEnd("");
      }
      setSelecting("end");
    } else {
      // If selected date is before start, swap
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
      setSelecting("start");
    }
  }, [selecting, tempStart, tempEnd]);

  const handlePreset = useCallback((days: number | "month" | "today") => {
    const todayStr = getTodayWIB();
    if (days === "today") {
      setTempStart(todayStr);
      setTempEnd(todayStr);
    } else if (days === "month") {
      const d = parseDateStr(todayStr);
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      setTempStart(formatDate(firstDay));
      setTempEnd(todayStr);
    } else {
      const d = parseDateStr(todayStr);
      d.setDate(d.getDate() - days);
      setTempStart(formatDate(d));
      setTempEnd(todayStr);
    }
    setSelecting("start");
  }, []);

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onApply(tempStart, tempEnd);
      onClose();
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  if (!isOpen || !mounted) return null;

  // Generate calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: { date: Date; dateStr: string; currentMonth: boolean }[] = [];

  // Previous month fill
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
    calendarDays.push({ date: d, dateStr: formatDate(d), currentMonth: false });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(viewYear, viewMonth, i);
    calendarDays.push({ date: d, dateStr: formatDate(d), currentMonth: true });
  }
  // Next month fill
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(viewYear, viewMonth + 1, i);
    calendarDays.push({ date: d, dateStr: formatDate(d), currentMonth: false });
  }

  const startD = tempStart ? parseDateStr(tempStart) : null;
  const endD = tempEnd ? parseDateStr(tempEnd) : null;

  const years = Array.from({ length: 10 }, (_, i) => todayDate.getFullYear() - 9 + i);

  return createPortal(
    <div
      className="datepicker-overlay"
      style={{ zIndex: 999999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="datepicker-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="datepicker-header">
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Pilih Rentang Tanggal
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {selecting === "start" ? "Pilih tanggal mulai" : "Pilih tanggal akhir"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="datepicker-close-btn"
            aria-label="Tutup"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selected Range Display */}
        <div className="datepicker-range-display">
          <button
            className={`datepicker-range-chip ${selecting === "start" ? "active" : ""}`}
            onClick={() => setSelecting("start")}
          >
            <span className="datepicker-range-label">Dari</span>
            <span className="datepicker-range-value">{formatDisplayDate(tempStart)}</span>
          </button>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <button
            className={`datepicker-range-chip ${selecting === "end" ? "active" : ""}`}
            onClick={() => setSelecting("end")}
          >
            <span className="datepicker-range-label">Sampai</span>
            <span className="datepicker-range-value">{formatDisplayDate(tempEnd)}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="datepicker-presets">
          {[
            { label: "Hari Ini", value: "today" as const },
            { label: "7 Hari", value: 7 },
            { label: "30 Hari", value: 30 },
            { label: "Bulan Ini", value: "month" as const },
          ].map((p) => (
            <button
              key={p.label}
              className="datepicker-preset-btn"
              onClick={() => handlePreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Calendar Navigation */}
        <div className="datepicker-nav">
          <button className="datepicker-nav-btn" onClick={prevMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className="datepicker-month-label"
            onClick={() => setShowYearPicker(!showYearPicker)}
          >
            {BULAN[viewMonth]} {viewYear}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: showYearPicker ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <button className="datepicker-nav-btn" onClick={nextMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Year/Month Quick Picker */}
        {showYearPicker && (
          <div className="datepicker-year-grid">
            {years.map(y => (
              <button
                key={y}
                className={`datepicker-year-btn ${y === viewYear ? "active" : ""}`}
                onClick={() => { setViewYear(y); setShowYearPicker(false); }}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Calendar Grid */}
        {!showYearPicker && (
          <div className="datepicker-calendar">
            {/* Day headers */}
            <div className="datepicker-weekdays">
              {HARI.map(h => (
                <div key={h} className="datepicker-weekday">{h}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="datepicker-days">
              {calendarDays.map(({ date, dateStr, currentMonth }, idx) => {
                const isToday = isSameDay(date, todayDate);
                const isStart = startD && isSameDay(date, startD);
                const isEnd = endD && isSameDay(date, endD);
                const isInRange = startD && endD && isBetween(date, startD, endD);
                const isSelected = isStart || isEnd;

                return (
                  <button
                    key={idx}
                    className={[
                      "datepicker-day",
                      !currentMonth ? "other-month" : "",
                      isToday ? "today" : "",
                      isSelected ? "selected" : "",
                      isInRange && !isSelected ? "in-range" : "",
                      isStart ? "range-start" : "",
                      isEnd ? "range-end" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => handleDayClick(dateStr)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="datepicker-footer">
          <button className="datepicker-cancel-btn" onClick={onClose}>
            Batal
          </button>
          <button
            className="datepicker-apply-btn"
            onClick={handleApply}
            disabled={!tempStart || !tempEnd}
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Reusable Date Trigger Button ─── */
export function DateRangeTrigger({
  startDate,
  endDate,
  onClick,
  className = "",
}: {
  startDate: string;
  endDate: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`date-range-trigger ${className}`}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span className="date-range-text">
        {formatDisplayDate(startDate)}
        <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>→</span>
        {formatDisplayDate(endDate)}
      </span>
    </button>
  );
}
