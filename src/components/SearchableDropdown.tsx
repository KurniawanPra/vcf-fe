"use client";

import { useState, useRef, useEffect } from "react";

interface SearchableDropdownProps {
  label: string;
  options: Array<{ id: number | string; nama?: string; nama_transporter?: string; nama_supir?: string; label?: string; display_name?: string; [key: string]: any }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  displayField?: "nama" | "nama_transporter" | "nama_supir" | "label" | "display_name" | string;
}

export default function SearchableDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Pilih opsi",
  required = false,
  id,
  displayField = "nama"
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getDisplayText = (option: any) => {
    return option[displayField] || option.nama || option.nama_transporter || option.nama_supir || option.label || String(option.id);
  };

  const selectedOption = options.find(opt => String(opt.id) === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => {
    const text = getDisplayText(option).toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (option: any) => {
    onChange(String(option.id));
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative" ref={dropdownRef} id={id}>
      <label className="form-label">{label} {required && "*"}</label>
      <div className="relative group">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-between w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          <span className={selectedOption ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}>
            {selectedOption ? getDisplayText(selectedOption) : placeholder}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M6.293 9.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 p-1 space-y-1 max-h-60 overflow-auto">
            <input
              type="text"
              className="block w-full px-4 py-2 text-gray-800 dark:text-gray-200 border rounded-md border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              onClick={(e) => e.stopPropagation()}
            />
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Tidak ada hasil
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`block w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                    String(option.id) === value
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {getDisplayText(option)}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
