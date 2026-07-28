-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. EKSISTING TABLES (PRESERVED & UNTOUCHED)
-- ====================================================================

-- 1. Table: units
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kc_name TEXT DEFAULT 'Walikota Jakarta Timur',
  kcp_name TEXT NOT NULL,
  sentra_mikro TEXT NOT NULL,
  muh_name TEXT NOT NULL,
  muh_status TEXT NOT NULL CHECK (muh_status IN ('Tetap', 'Backup')),
  analis_mikro TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('HEAD_AREA', 'MUH')),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: sm_daily_reports
CREATE TABLE IF NOT EXISTS public.sm_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  no_urut INT NOT NULL,
  nama_sm TEXT NOT NULL,
  nrik TEXT NOT NULL,
  vendor TEXT NOT NULL,
  join_date DATE NOT NULL,
  dblm_status TEXT NOT NULL CHECK (dblm_status IN ('DBLM', 'NON DBLM')),
  kode_officer TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_report_unit_no UNIQUE(report_date, unit_id, no_urut)
);

-- Enable Row Level Security (RLS) Eksisting
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_daily_reports ENABLE ROW LEVEL SECURITY;

-- Security Policies: profiles
DROP POLICY IF EXISTS "Allow users to read profiles" ON public.profiles;
CREATE POLICY "Allow users to read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Security Policies: units
DROP POLICY IF EXISTS "Allow authenticated users to view units" ON public.units;
CREATE POLICY "Allow authenticated users to view units"
  ON public.units FOR SELECT
  TO authenticated
  USING (true);

-- Security Policies: sm_daily_reports
DROP POLICY IF EXISTS "Allow view reports based on role" ON public.sm_daily_reports;
CREATE POLICY "Allow view reports based on role"
  ON public.sm_daily_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (
        role = 'HEAD_AREA' OR
        (role = 'MUH' AND unit_id = sm_daily_reports.unit_id)
      )
    )
  );

DROP POLICY IF EXISTS "Allow MUH and Head Area to manage unlocked reports" ON public.sm_daily_reports;
CREATE POLICY "Allow MUH and Head Area to manage unlocked reports"
  ON public.sm_daily_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (
        role = 'HEAD_AREA' OR
        (role = 'MUH' AND unit_id = sm_daily_reports.unit_id AND sm_daily_reports.is_locked = FALSE)
      )
    )
  );

-- Auto-update Trigger for updated_at Column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ 
BEGIN     
  NEW.updated_at = NOW();     
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sm_daily_reports_updated_at ON public.sm_daily_reports;
CREATE TRIGGER update_sm_daily_reports_updated_at
  BEFORE UPDATE ON public.sm_daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ====================================================================
-- 2. PENAMBAHAN MODUL KEPALA UNIT (UNIT OPERATIONAL CONTROL)
-- ====================================================================

-- 4. Table: unit_performance (Performance Tracker)
CREATE TABLE IF NOT EXISTS public.unit_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  period_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  target_kredit NUMERIC(15,2) DEFAULT 0,
  realisasi_kredit NUMERIC(15,2) DEFAULT 0,
  target_funding NUMERIC(15,2) DEFAULT 0,
  realisasi_funding NUMERIC(15,2) DEFAULT 0,
  npl_percentage NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_unit_period UNIQUE(unit_id, period_month)
);

-- 5. Table: unit_pipelines (Digital Pipeline & Prospek Nasabah)
CREATE TABLE IF NOT EXISTS public.unit_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  nama_nasabah VARCHAR(255) NOT NULL,
  segmen VARCHAR(50) CHECK (segmen IN ('Mikro', 'Retail', 'Komersial', 'Consumer')) DEFAULT 'Mikro',
  potensi_plafond NUMERIC(15,2) DEFAULT 0,
  status_funnel VARCHAR(50) CHECK (status_funnel IN ('Prospek', 'Inisiasi', 'Analisis', 'Putusan', 'Pencairan', 'Batal')) DEFAULT 'Prospek',
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table: unit_daily_operations (Input Laporan Harian Operasional & Kendala)
CREATE TABLE IF NOT EXISTS public.unit_daily_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  ringkasan_kegiatan TEXT NOT NULL,
  kendala_lapangan TEXT,
  tindak_lanjut TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_unit_op_date UNIQUE(unit_id, report_date)
);

-- 7. Table: area_broadcasts & area_broadcast_reads (Notifikasi & Broadcast Reader)
CREATE TABLE IF NOT EXISTS public.area_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('Instruksi', 'Pengumuman', 'Target', 'Mendesak')) DEFAULT 'Pengumuman',
  sender_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.area_broadcast_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.area_broadcasts(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_broadcast_unit_read UNIQUE(broadcast_id, unit_id)
);

-- Enable RLS & Policies untuk Modul Baru
ALTER TABLE public.unit_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_daily_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_broadcast_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated performance" ON public.unit_performance;
CREATE POLICY "Allow authenticated performance" ON public.unit_performance FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated pipeline" ON public.unit_pipelines;
CREATE POLICY "Allow authenticated pipeline" ON public.unit_pipelines FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated operations" ON public.unit_daily_operations;
CREATE POLICY "Allow authenticated operations" ON public.unit_daily_operations FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated broadcasts" ON public.area_broadcasts;
CREATE POLICY "Allow authenticated broadcasts" ON public.area_broadcasts FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated broadcast reads" ON public.area_broadcast_reads;
CREATE POLICY "Allow authenticated broadcast reads" ON public.area_broadcast_reads FOR ALL TO authenticated USING (true);