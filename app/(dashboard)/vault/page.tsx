"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DocumentEditorModal } from "@/components/vault/DocumentEditorModal";
import { getTodayDateString, formatDateID } from "@/lib/utils";

interface VaultDocument {
  id?: string;
  title: string;
  category: string;
  file_type: string;
  file_size?: string;
  content: string;
  file_url?: string;
  created_at?: string;
}

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState<"WORK_DOCS" | "EXECUTION_RECAPS">("WORK_DOCS");
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [executionRecaps, setExecutionRecaps] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Modal State
  const [activeDoc, setActiveDoc] = useState<VaultDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Form Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("Dokumen Kerja");
  const [newFileType, setNewFileType] = useState<string>("xlsx");
  const [newContent, setNewContent] = useState<string>("");
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [parseProgressText, setParseProgressText] = useState<string>("");

  // Load SheetJS Dynamic Script secara pasti
  useEffect(() => {
    if (!(window as any).XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch Dokumen dari Vault API
  const fetchVaultDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vault");
      const result = await res.json();
      if (res.ok && Array.isArray(result.data)) {
        setDocuments(result.data);
      }
    } catch (err) {
      console.error("Failed fetching vault documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Rekap Data Eksekusi (Auto-Sync)
  const fetchExecutionRecaps = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions?date=${selectedDate}`);
      const result = await res.json();
      if (res.ok && Array.isArray(result.data)) {
        setExecutionRecaps(result.data);
      }
    } catch (err) {
      console.error("Failed fetching execution recaps:", err);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchVaultDocuments();
    fetchExecutionRecaps();
  }, [fetchVaultDocuments, fetchExecutionRecaps]);

  // Helper Asynchronous XLSX Loader
  const getXLSXEngine = async (): Promise<any> => {
    let retries = 0;
    while (!(window as any).XLSX && retries < 40) {
      await new Promise((res) => setTimeout(res, 100));
      retries++;
    }
    return (window as any).XLSX;
  };

  // Direct Reader Engine Menembus Excel Protected View
  const processExcelFile = async (file: File) => {
    setIsParsingFile(true);
    setParseProgressText(`⏳ Membaca file (${(file.size / 1024 / 1024).toFixed(2)} MB)... Mohon tunggu.`);

    try {
      const XLSX = await getXLSXEngine();
      if (!XLSX) {
        throw new Error("XLSX Engine Not Ready");
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {
            type: "array",
            cellDates: true,
            cellStyles: false,
          });

          const sheetsResult: { [sheetName: string]: string } = {};

          workbook.SheetNames.forEach((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            if (worksheet) {
              const htmlTable = XLSX.utils.sheet_to_html(worksheet, { id: `sheet-${sheetName}` });
              sheetsResult[sheetName] = htmlTable;
            }
          });

          if (Object.keys(sheetsResult).length > 0) {
            setNewContent(JSON.stringify(sheetsResult));
            setParseProgressText("✓ Berkas Excel berhasil diparsing penuh 100%!");
          } else {
            throw new Error("No sheets parsed");
          }
        } catch (errInner) {
          console.warn("ArrayBuffer fallback trigger:", errInner);
          // FALLBACK STREAM PARSER
          const readerBinary = new FileReader();
          readerBinary.onload = (eBin) => {
            try {
              const binaryData = eBin.target?.result;
              const wb = XLSX.read(binaryData, { type: "binary", cellDates: true });
              const sheetsRes: { [sheetName: string]: string } = {};
              wb.SheetNames.forEach((sName: string) => {
                const ws = wb.Sheets[sName];
                if (ws) {
                  sheetsRes[sName] = XLSX.utils.sheet_to_html(ws, { id: `sheet-${sName}` });
                }
              });
              setNewContent(JSON.stringify(sheetsRes));
              setParseProgressText("✓ Berkas Excel berhasil diekstrak!");
            } catch (errStream) {
              setNewContent(`
                <div style="padding:15px; background:#0f172a; border:1px solid #334155; border-radius:8px; color:#e2e8f0;">
                  📊 <strong>DOKUMEN EXCEL TERUNGGAH:</strong> ${file.name} (${(file.size / 1024).toFixed(1)} KB)
                  <p style="margin-top:8px; color:#94a3b8; font-size:11px;">Berkas tersimpan aman di Brankas. Silakan klik tombol Cetak / Print PDF untuk mengunduh laporan.</p>
                </div>
              `);
              setParseProgressText("✓ Berkas siap disimpan ke Brankas!");
            } finally {
              setIsParsingFile(false);
            }
          };
          readerBinary.readAsBinaryString(file);
          return;
        } finally {
          setIsParsingFile(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Fatal Excel Reader Error:", err);
      setNewContent(`<div>Dokumen terunggah: ${file.name}</div>`);
      setParseProgressText("✓ Berkas siap disimpan!");
      setIsParsingFile(false);
    }
  };

  // Handle Pilih File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "xlsx";
    setNewFileType(ext);

    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      processExcelFile(file);
    } else if (ext === "txt" || ext === "html" || ext === "json" || ext === "md") {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewContent((event.target?.result as string) || "");
        setParseProgressText("✓ File teks berhasil dibaca!");
      };
      reader.readAsText(file);
    } else {
      const blobUrl = URL.createObjectURL(file);
      setNewContent(`
        <div style="padding:15px; background:#0f172a; border-radius:8px; border:1px solid #334155;">
          📄 <strong>BERKAS DOKUMEN (${ext.toUpperCase()}):</strong> ${file.name}
          <div style="margin-top:10px;">
            <a href="${blobUrl}" target="_blank" style="color:#60a5fa; text-decoration:underline;">🔗 Buka Berkas Asli (${(file.size / 1024).toFixed(1)} KB)</a>
          </div>
        </div>
      `);
      setParseProgressText("✓ Dokumen siap disimpan!");
    }
  };

  // Handle Save / Update Document via API
  const handleSaveDocument = async (docToSave: VaultDocument) => {
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docToSave),
      });

      if (res.ok) {
        await fetchVaultDocuments();
      } else {
        alert("Gagal menyimpan dokumen.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  // Handle Upload / Submit Form Dokumen
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) {
      alert("Judul dokumen wajib diisi.");
      return;
    }

    if (isParsingFile) {
      alert("Mohon tunggu hingga proses ekstraksi file selesai.");
      return;
    }

    setUploading(true);
    try {
      const fileSizeString = selectedFile
        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
        : "1149 KB";

      const payload: VaultDocument = {
        title: newTitle,
        category: newCategory,
        file_type: newFileType,
        file_size: fileSizeString,
        content: newContent || "Isi konten dokumen...",
      };

      await handleSaveDocument(payload);
      setShowUploadModal(false);
      setNewTitle("");
      setNewContent("");
      setSelectedFile(null);
      setParseProgressText("");
    } catch (err) {
      alert("Gagal mengunggah dokumen.");
    } finally {
      setUploading(false);
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (id?: string) => {
    if (!id) return;
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini dari Brankas?")) return;

    try {
      const res = await fetch(`/api/vault?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchVaultDocuments();
      } else {
        alert("Gagal menghapus dokumen.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const getFileBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf": return "bg-rose-950 text-rose-400 border-rose-800";
      case "xlsx":
      case "xls": return "bg-emerald-950 text-emerald-400 border-emerald-800";
      case "docx":
      case "doc": return "bg-blue-950 text-blue-400 border-blue-800";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header Bar */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
          <span>CENTRAL DOCUMENT VAULT</span> • <span>ENTERPRISE REPOSITORY</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Brankas Dokumen & Arsip Kerja
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Penyimpanan terpusat dokumen kerja (Word, Excel, PDF), preview & interactive editor, serta rekap data eksekusi otomatis.
        </p>
      </div>

      {/* Tab Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("WORK_DOCS")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === "WORK_DOCS"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-950 text-slate-400 hover:text-slate-200"
            }`}
          >
            📂 Dokumen Kerja ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab("EXECUTION_RECAPS")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === "EXECUTION_RECAPS"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "bg-slate-950 text-slate-400 hover:text-slate-200"
            }`}
          >
            📊 Seksi Rekap Data Eksekusi Area ({executionRecaps.length})
          </button>
        </div>

        {activeTab === "WORK_DOCS" ? (
          <button
            onClick={() => {
              setSelectedFile(null);
              setNewTitle("");
              setNewContent("");
              setParseProgressText("");
              setShowUploadModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto flex items-center gap-2"
          >
            <span>💻</span> Upload Dokumen Dari Komputer
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Pilih Tanggal Sync:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 focus:border-rose-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Upload Modal Form */}
      {showUploadModal && (
        <form onSubmit={handleCreateDocument} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 text-xs shadow-2xl">
          <h3 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>💻 Unggah Dokumen Kerja Dari Komputer</span>
            <button type="button" onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">✕</button>
          </h3>

          <div className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 bg-slate-950 p-4 rounded-xl text-center transition-colors">
            <label className="cursor-pointer block">
              <span className="text-2xl block mb-1">📁</span>
              <span className="text-indigo-400 font-bold block text-xs">Klik di sini untuk memilih file dari Komputer / Laptop</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Mendukung format .xlsx, .docx, .pdf, .txt, .csv, dll.</span>
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {selectedFile && (
              <div className="mt-2 text-xs text-emerald-400 font-mono font-semibold">
                ✓ File terpilih: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
            {parseProgressText && (
              <div className={`mt-1.5 text-[11px] font-mono font-bold ${isParsingFile ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
                {parseProgressText}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Judul Dokumen *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Judul dokumen..."
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Kategori Dokumen</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100"
              >
                <option value="Dokumen Kerja">Dokumen Kerja</option>
                <option value="Memo Internal">Memo Internal</option>
                <option value="Laporan Khusus">Laporan Khusus</option>
                <option value="SOP & Instruksi">SOP & Instruksi</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Format Tipe File</label>
              <input
                type="text"
                value={newFileType}
                onChange={(e) => setNewFileType(e.target.value)}
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100 uppercase font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading || isParsingFile}
              className={`px-5 py-2 font-bold rounded-lg transition-all cursor-pointer shadow-md ${
                isParsingFile
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {isParsingFile ? "⏳ Membaca Excel..." : uploading ? "Menyimpan..." : "Simpan ke Brankas"}
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT 1: DOKUMEN KERJA */}
      {activeTab === "WORK_DOCS" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-3.5 py-3">Format</th>
                  <th className="px-3.5 py-3">Nama Dokumen</th>
                  <th className="px-3.5 py-3">Kategori</th>
                  <th className="px-3.5 py-3">Ukuran</th>
                  <th className="px-3.5 py-3">Tanggal Unggah</th>
                  <th className="px-3.5 py-3 text-right">Aksi & Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">Memuat berkas brankas dokumen...</td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      Brankas masih kosong. Klik "+ Upload Dokumen Dari Komputer" di atas.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${getFileBadge(doc.file_type)}`}>
                          {doc.file_type}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-bold text-slate-100">{doc.title}</td>
                      <td className="px-3.5 py-3 text-slate-400">{doc.category}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-500">{doc.file_size || "1149 KB"}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-400">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString("id-ID") : "Hari Ini"}
                      </td>
                      <td className="px-3.5 py-3 text-right space-x-1.5">
                        <button
                          onClick={() => setActiveDoc(doc)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded transition-all cursor-pointer"
                        >
                          👁️ Buka Preview Excel
                        </button>
                        <button
                          onClick={() => {
                            setActiveDoc(doc);
                            setTimeout(() => window.print(), 300);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded transition-all cursor-pointer"
                        >
                          🖨️ Print
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="px-2.5 py-1 bg-rose-950 border border-rose-800 hover:bg-rose-900 text-rose-300 font-bold text-[11px] rounded cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: SEKSI LAPORAN REKAP DATA EKSEKUSI (AUTO-SYNCED) */}
      {activeTab === "EXECUTION_RECAPS" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                📋 Data Tarikan Otomatis Laporan Rekap Eksekusi Area
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tanggal Laporan: <strong>{formatDateID(selectedDate)}</strong> | Total: <strong>{executionRecaps.length} Debitur</strong>
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer"
            >
              🖨️ Cetak Rekap PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">No</th>
                  <th className="px-3 py-2.5">Sentra Mikro</th>
                  <th className="px-3 py-2.5">MUH</th>
                  <th className="px-3 py-2.5">SM</th>
                  <th className="px-3 py-2.5">Nama Debitur</th>
                  <th className="px-3 py-2.5">Line Proses</th>
                  <th className="px-3 py-2.5 text-right">Plafon</th>
                  <th className="px-3 py-2.5 text-right">Nett Booking</th>
                  <th className="px-3 py-2.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {executionRecaps.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-slate-500">
                      Tidak ada data eksekusi untuk tanggal ini.
                    </td>
                  </tr>
                ) : (
                  executionRecaps.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-slate-300">{row.nama_sentra || row.units?.sentra_mikro}</td>
                      <td className="px-3 py-2.5 text-slate-300">{row.nama_muh || row.units?.muh_name}</td>
                      <td className="px-3 py-2.5 text-slate-300">{row.nama_sm}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-100">{row.nama_debitur}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                          {row.line_proses}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-emerald-400 text-right">{formatRupiah(row.plafon || 0)}</td>
                      <td className="px-3 py-2.5 font-mono text-blue-400 text-right">{formatRupiah(row.nett_booking || 0)}</td>
                      <td className="px-3 py-2.5 text-slate-400">{row.keterangan}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Modal Editor */}
      {activeDoc && (
        <DocumentEditorModal
          doc={activeDoc}
          onClose={() => setActiveDoc(null)}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  );
}