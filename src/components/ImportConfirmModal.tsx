"use client";

import { useState } from "react";

interface ImportConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedData: any[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  onResult?: (result: { success: number; failed: number; errors: string[] }) => void;
  data: any[];
  columns: { key: string; label: string }[];
  title?: string;
  loading?: boolean;
}

export default function ImportConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onResult,
  data,
  columns,
  title = "Konfirmasi Import Data",
  loading = false,
}: ImportConfirmModalProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set(data.map((_, i) => i)));

  if (!isOpen) return null;

  const toggleRow = (index: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((_, i) => i)));
    }
  };

  const selectedData = data.filter((_, i) => selectedRows.has(i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {data.length} data ditemukan • {selectedRows.size} akan diimport
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-300">No</th>
                {columns.map((col) => (
                  <th key={col.key} className="px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((row, index) => (
                <tr
                  key={index}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    !selectedRows.has(index) ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={() => toggleRow(index)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3 text-gray-900 dark:text-gray-100">
                      {row[col.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {data.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Tidak ada data yang dapat diimport
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="text-sm text-gray-500">
            Data yang tidak dipilih akan dilewati
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={async () => {
                const result = await onConfirm(selectedData);
                onResult?.(result);
              }}
              disabled={loading || selectedRows.size === 0}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Mengimport...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Import {selectedRows.size} Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
