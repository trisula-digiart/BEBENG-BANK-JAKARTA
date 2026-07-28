"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, CellValueChangedEvent } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

export interface GridRowData {
  id?: string;
  no_urut: number;
  kc_name: string;
  kcp_name: string;
  sentra_mikro: string;
  muh_name: string;
  muh_status: "Tetap" | "Backup";
  analis_mikro: string;
  nama_sm: string;
  nrik: string;
  vendor: string;
  join_date: string;
  dblm_status: "DBLM" | "NON DBLM";
  kode_officer: string;
}

interface UnitGridProps {
  rowData: GridRowData[];
  isLocked: boolean;
  onSaveRow: (row: GridRowData) => Promise<void>;
  unitMetaData?: {
    kc_name: string;
    kcp_name: string;
    sentra_mikro: string;
    muh_name: string;
    muh_status: "Tetap" | "Backup";
    analis_mikro: string;
  };
}

// Style Objek Konstan Kompatibel dengan AG Grid CellStyle Index Signature
const lockedCellStyle: Record<string, string> = {
  backgroundColor: "#0f172a",
  color: "#94a3b8",
};

const lockedCenteredCellStyle: Record<string, string> = {
  textAlign: "center",
  backgroundColor: "#0f172a",
  color: "#94a3b8",
};

export function UnitGrid({
  rowData,
  isLocked,
  onSaveRow,
  unitMetaData,
}: UnitGridProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [rows, setRows] = useState<GridRowData[]>(rowData);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setRows(rowData);
  }, [rowData]);

  // Definisi Kolom Dengan Label Baru (MUH -> UNIT)
  const columnDefs = useMemo<ColDef<GridRowData>[]>(
    () => [
      {
        headerName: "No",
        field: "no_urut",
        width: 70,
        editable: false,
        cellStyle: lockedCenteredCellStyle,
      },
      {
        headerName: "Kantor Cabang",
        field: "kc_name",
        width: 180,
        editable: false,
        cellStyle: lockedCellStyle,
      },
      {
        headerName: "KCP",
        field: "kcp_name",
        width: 180,
        editable: false,
        cellStyle: lockedCellStyle,
      },
      {
        headerName: "Sentra Mikro",
        field: "sentra_mikro",
        width: 160,
        editable: false,
        cellStyle: lockedCellStyle,
      },
      {
        headerName: "UNIT",
        field: "muh_name",
        width: 160,
        editable: false,
        cellStyle: lockedCellStyle,
      },
      {
        headerName: "Status UNIT",
        field: "muh_status",
        width: 130,
        editable: false,
        cellStyle: lockedCellStyle,
      },
      {
        headerName: "Analis Mikro",
        field: "analis_mikro",
        width: 160,
        editable: false,
        cellStyle: lockedCellStyle,
      },
      {
        headerName: "Nama SM *",
        field: "nama_sm",
        width: 200,
        editable: !isLocked,
        cellClass: !isLocked ? "bg-slate-800 text-slate-100 focus:bg-slate-700" : "",
      },
      {
        headerName: "NRIK",
        field: "nrik",
        width: 130,
        editable: !isLocked,
      },
      {
        headerName: "Vendor",
        field: "vendor",
        width: 150,
        editable: !isLocked,
      },
      {
        headerName: "Join Date (YYYY-MM-DD)",
        field: "join_date",
        width: 160,
        editable: !isLocked,
      },
      {
        headerName: "DBLM Status",
        field: "dblm_status",
        width: 140,
        editable: !isLocked,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["DBLM", "NON DBLM"],
        },
      },
      {
        headerName: "Kode Officer",
        field: "kode_officer",
        width: 140,
        editable: !isLocked,
      },
    ],
    [isLocked]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      singleClickEdit: true,
    }),
    []
  );

  const handleCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<GridRowData>) => {
      if (!event.data) return;
      try {
        setSavingStatus("saving");
        await onSaveRow(event.data);
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus("idle"), 2000);
      } catch (err) {
        console.error("Failed to save cell data:", err);
        setSavingStatus("error");
      }
    },
    [onSaveRow]
  );

  const handleAddRow = () => {
    if (isLocked) return;
    const nextNo = rows.length + 1;
    const newRow: GridRowData = {
      no_urut: nextNo,
      kc_name: unitMetaData?.kc_name || "Walikota Jakarta Timur",
      kcp_name: unitMetaData?.kcp_name || "-",
      sentra_mikro: unitMetaData?.sentra_mikro || "-",
      muh_name: unitMetaData?.muh_name || "-",
      muh_status: unitMetaData?.muh_status || "Tetap",
      analis_mikro: unitMetaData?.analis_mikro || "-",
      nama_sm: "",
      nrik: "",
      vendor: "",
      join_date: new Date().toISOString().split("T")[0],
      dblm_status: "DBLM",
      kode_officer: "",
    };

    setRows((prev) => [...prev, newRow]);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddRow}
            disabled={isLocked}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              isLocked
                ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm cursor-pointer"
            }`}
          >
            + Tambah Baris
          </button>
          {isLocked && (
            <span className="text-xs px-2.5 py-1 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60 font-medium">
              🔒 Laporan Dikunci oleh Head Area
            </span>
          )}
        </div>

        <div className="text-xs font-mono">
          {savingStatus === "saving" && <span className="text-amber-400 animate-pulse">💾 Menyimpan perubahan...</span>}
          {savingStatus === "saved" && <span className="text-emerald-400">✓ Perubahan tersimpan</span>}
          {savingStatus === "error" && <span className="text-rose-400">❌ Gagal menyimpan data</span>}
        </div>
      </div>

      <div className="ag-theme-alpine-dark w-full h-[600px] rounded-lg overflow-hidden border border-slate-800 shadow-xl">
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={handleCellValueChanged}
          animateRows={true}
          stopEditingWhenCellsLoseFocus={true}
        />
      </div>
    </div>
  );
}