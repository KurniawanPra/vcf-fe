"use client";

import { InputHTMLAttributes, useState } from "react";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  h11?: boolean;
  bgSecondary?: boolean;
  small?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  h11 = false,
  bgSecondary = false,
  small = false,
  placeholder = "Cari...",
  className = "",
  style = {},
  onFocus,
  onBlur,
  ...props
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const bgStyle = bgSecondary
    ? (isFocused ? "var(--bg-card-hover)" : "var(--bg-secondary)")
    : "var(--bg-card)";

  const borderStyle = isFocused
    ? "1.5px solid rgba(59, 130, 246, 0.5)"
    : "1.5px solid var(--border)";

  if (small) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="form-input h-8 text-xs pl-7.5 w-44"
          style={{
            paddingLeft: "1.875rem",
            ...style,
          }}
          {...props}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`w-full ${h11 ? "h-11" : "h-12"} pl-11 pr-4 rounded-xl text-sm transition-all focus:outline-none`}
        style={{
          background: bgStyle,
          border: borderStyle,
          color: "var(--text-primary)",
          fontFamily: "'Inter', sans-serif",
          ...style,
        }}
        {...props}
      />
    </div>
  );
}
