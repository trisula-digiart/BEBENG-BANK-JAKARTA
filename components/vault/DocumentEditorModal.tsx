"use client";

import React, { useState, useEffect } from "react";

interface VaultDocument {
  id?: string;
  title: string;
  category: string;
  file_type: string;
  file_size?: string;
  content: string;
  file_url?: string;
}

interface DocumentEditorModalProps {
  doc: VaultDocument | null;
  onClose: () => void;
  onSave: (updatedDoc: VaultDocument) => Promise<void>;
}

export function DocumentEditorModal({ doc, onClose, onSave }: DocumentEditorModalProps) {
  const [title, setTitle] = useState<string>(doc?.title || "Dokumen Tanpa Judul");
  const [content, setContent] = useState<string>(doc?.content || "");
  const [saving, setSaving] = useState<boolean>(false);

  // Excel Sheet Tabs State
  const [sheetsData, setSheetsData] = useState<{ [sheetName: string]: string }>({});
  const [activeSheetName, setActiveSheetName] = useState<string>("");

  useEffect(() => {
    if (doc?.content) {
      try {
        const parsed = JSON.parse(doc.content);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          setSheetsData(parsed);
          const firstSheet = Object.keys(parsed)[0];
          if (firstSheet) setActiveSheetName(firstSheet);
        }
      } catch (e) {
        // Bukan JSON multi-sheet
      }
    }
  }, [doc]);

  if (!doc) return null;

  const sheetNames = Object.keys(sheetsData);
  const showSheetSwitcher = sheetNames.length > 1;
  const isMultiSheetExcel = sheetNames.length > 0;

  const handleSaveDoc = async () => {
    setSaving(true);
    try {
      await onSave({
        ...doc,
        title,
        content,
      });
      onClose();
    } catch (err) {
      alert("Gagal menyimpan perubahan dokumen.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintDoc = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 w-screen h-screen overflow-hidden">
      {/* Container Fullscreen */}
      <div className="bg-slate-950 w-full h-full flex flex-col shadow-none border-none">
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent font-bold text-slate-100 text-base focus:outline-none border-b border-dashed border-slate-700 focus:border-indigo-500 px-1 w-[350px] sm:w-[550px]"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Format: <span className="uppercase text-emerald-400 font-mono font-bold">{doc.file_type}</span> | Kategori: {doc.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDoc}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-2 shadow-md"
            >
              <span>🖨️</span> Cetak / Print PDF
            </button>
            <button
              onClick={handleSaveDoc}
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-rose-900 hover:text-white text-slate-300 font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              ✕ Tutup Layar
            </button>
          </div>
        </div>

        {/* Dynamic Sheet Switcher Tabs */}
        {showSheetSwitcher && (
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-6 py-2 border-b border-slate-800 overflow-x-auto print:hidden shrink-0">
            <span className="text-[11px] font-mono text-slate-400 mr-2 font-bold">PILIH SHEET EXCEL:</span>
            {sheetNames.map((sheet) => (
              <button
                key={sheet}
                onClick={() => setActiveSheetName(sheet)}
                className={`px-3.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  activeSheetName === sheet
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {sheet}
              </button>
            ))}
          </div>
        )}

        {/* Fullscreen Editor & Viewer Body Area */}
        <div className="flex-1 p-6 overflow-auto bg-slate-950 text-slate-200 print:hidden">
          <div className="excel-sheet-fullscreen bg-white text-slate-900 p-6 rounded-xl shadow-2xl min-w-full overflow-x-auto">
            <style jsx global>{`
              .excel-sheet-fullscreen {
                background-color: #ffffff !important;
                color: #0f172a !important;
              }
              .excel-sheet-fullscreen table {
                border-collapse: collapse !important;
                width: 100% !important;
                font-size: 11px !important;
                font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif !important;
                margin-bottom: 20px;
              }
              .excel-sheet-fullscreen th,
              .excel-sheet-fullscreen td {
                border: 1px solid #cbd5e1 !important;
                padding: 6px 10px !important;
                color: #0f172a !important;
                background-color: #ffffff !important;
                white-space: nowrap !important;
                font-size: 11px !important;
              }
              .excel-sheet-fullscreen tr:nth-child(even) td {
                background-color: #f8fafc !important;
              }
              .excel-sheet-fullscreen tr:first-child td,
              .excel-sheet-fullscreen tr:first-child th {
                background-color: #1e293b !important;
                color: #ffffff !important;
                font-weight: bold !important;
                text-align: center !important;
              }
            `}</style>

            {isMultiSheetExcel ? (
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  const updatedSheets = { ...sheetsData, [activeSheetName]: e.currentTarget.innerHTML };
                  setSheetsData(updatedSheets);
                  setContent(JSON.stringify(updatedSheets));
                }}
                dangerouslySetInnerHTML={{ __html: sheetsData[activeSheetName] || "" }}
                className="focus:outline-none min-h-[70vh]"
              />
            ) : (
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: content }}
                className="focus:outline-none min-h-[70vh]"
              />
            )}
          </div>
        </div>

        {/* PRINT-ONLY TEMPLATE PERBANKAN RESMI */}
        <div className="hidden print:block print-only-container p-2">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 5mm;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-only-container {
                display: block !important;
                width: 100% !important;
              }
              .print-only-container table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: 8pt !important;
                font-family: Arial, sans-serif !important;
                table-layout: auto !important;
              }
              .print-only-container th,
              .print-only-container td {
                border: 1px solid #000000 !important;
                padding: 4px 6px !important;
                color: #000000 !important;
                background-color: #ffffff !important;
                word-wrap: break-word !important;
              }
              .print-only-container tr:first-child td,
              .print-only-container tr:first-child th {
                background-color: #f1f5f9 !important;
                font-weight: bold !important;
              }
            }
          `}</style>

          <div style={{ textAlign: "center", marginBottom: "12px", borderBottom: "2px solid #000", paddingBottom: "8px" }}>
            <h2 style={{ fontSize: "14pt", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>{title}</h2>
            <p style={{ fontSize: "8.5pt", margin: "4px 0 0 0", color: "#333333" }}>
              DOKUMEN RESMI BRANKAS • Kategori: {doc.category} {activeSheetName ? `| Sheet: ${activeSheetName}` : ""}
            </p>
          </div>

          <div
            dangerouslySetInnerHTML={{
              __html: isMultiSheetExcel ? sheetsData[activeSheetName] : content,
            }}
          />
        </div>
      </div>
    </div>
  );
}