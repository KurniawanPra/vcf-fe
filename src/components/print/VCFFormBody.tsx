"use client";

import { CK, UL, QRCodeSign, PRINT_STYLES } from "./PrintElements";

/* ─────────────────────────────────────────────
  TYPES (mirror of VcfDetail in PrintVCF.tsx)
───────────────────────────────────────────── */
export interface VcfDetail {
  id: number;
  nomor_urut: string;
  tanggal: string;
  created_at?: string;
  status: string;
  tipe_kegiatan: string;
  asal_tujuan: string;
  no_polisi: string;
  jam_masuk: string;
  produk?: string;
  tipe_kendaraan?: string;
  tahun_kendaraan?: number;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string; no_sim: string; jenis_sim?: string; tgl_berlaku_sim?: string };
  kelengkapan_supir?: { id: number; item_id: number; nilai: any; keterangan?: string; item: { nama_item: string } }[];
  pemeriksaan_masuk?: { id: number; item_id: number; nilai: string; keterangan?: string; item: { nama_item: string }; petugas?: { nama: string }; waktu_input?: string; created_at?: string }[];
  pemeriksaan_keluar?: { id: number; item_id: number; nilai: string; keterangan?: string; item: { nama_item: string }; petugas?: { nama: string }; waktu_input?: string; created_at?: string }[];
  beban_tambahan_masuk?: { jenis_beban: string; ada: boolean };
  beban_tambahan_keluar?: { jenis_beban: string; ada: boolean };
  segel_masuk?: { jumlah_segel: number; kondisi?: string; nomor_segel: { nomor_segel: string }[]; petugas?: { nama: string }; waktu_input?: string; created_at?: string; keterangan?: string };
  segel_keluar?: { jumlah_segel: number; kondisi?: string; nomor_segel: { nomor_segel: string }[]; petugas?: { nama: string }; waktu_input?: string; created_at?: string; keterangan?: string };
  vcf_keluar?: { jam_keluar: string; emergency_respon_kontak: string; keterangan?: string; petugas?: { nama: string }; waktu_input?: string; created_at?: string };
  vcf_bagian2?: { keterangan?: string };
  vcf_bagian3?: { keterangan?: string };
  catatan?: string;
  keterangan?: string;
  jenis_kendaraan_id?: number;
  jenis_kendaraan?: { id: number; nama: string };
  muatan_dibawa?: { item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nama_item?: string; nilai?: string }[];
  muatan_diisi?: { item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nama_item?: string; nilai?: string }[];
  created_by?: { id: number; nama: string };
  nama_petugas_main_gate_masuk?: string;
  nama_petugas_wb_masuk?: string;
  nama_petugas_wb_keluar?: string;
  nama_petugas_main_gate_keluar?: string;
}

export interface VcfPrintMasters {
  masterJenis: { id: number; nama: string }[];
  masterProduk: { id: number; nama: string; kode: string }[];
  masterKS: { id: number; nama_item: string }[];
  masterMuatan: { id: number; nama_item: string }[];
  masterPM: { id: number; nama_item: string; kode?: string; tipe_jawaban?: string }[];
  masterPK: { id: number; nama_item: string; kode?: string; tipe_jawaban?: string }[];
}

const cleanKeterangan = (raw?: string) => {
  if (!raw || raw === "-") return "";
  return raw.split(" | ")[0];
};

/* ─────────────────────────────────────────────
  VCF FORM BODY — renders the form content WITHOUT
  the PrintTemplate wrapper. Designed to be reused
  for both single-print and multi-print modes.
───────────────────────────────────────────── */
export default function VCFFormBody({ vcf, masters }: { vcf: VcfDetail; masters: VcfPrintMasters }) {
  const { masterJenis, masterProduk, masterKS, masterMuatan, masterPM, masterPK } = masters;

  /* ── helper: mapping logic ── */
  const tipe = (vcf.tipe_kegiatan ?? "").toLowerCase();
  const isLoading = tipe.includes("loading") && !tipe.includes("unloading");
  const isUnloading = tipe.includes("unloading");

  const asal = (vcf.asal_tujuan ?? "").toLowerCase();
  const isLokal = asal.includes("lokal") || tipe.includes("lokal");
  const isExport = asal.includes("export") || tipe.includes("export");
  const isImport = asal.includes("import") || tipe.includes("import");

  const vcfProduk = vcf.produk ?? "";
  const vcfProdukList = vcfProduk.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  const hasProduk = (nama: string, kode?: string) => vcfProdukList.some(p => {
    const pl = p.toLowerCase();
    return pl === nama.toLowerCase() ||
      (kode && pl === kode.toLowerCase()) ||
      pl.includes(nama.toLowerCase()) ||
      (kode && pl.includes(kode.toLowerCase()));
  });
  const othersEntry = vcfProdukList.find(p => p.toUpperCase().startsWith("OTHERS:") || p.toUpperCase().startsWith("OTHER:"));
  const othersVal = othersEntry ? othersEntry.split(":").slice(1).join(":").trim() : "";

  const findKS = (k: string) => vcf.kelengkapan_supir?.find(i => i.item?.nama_item?.toLowerCase().includes(k.toLowerCase()));
  const findPM = (k: string) => vcf.pemeriksaan_masuk?.find(i => i.item?.nama_item?.toLowerCase().includes(k.toLowerCase()));
  const findPK = (k: string) => vcf.pemeriksaan_keluar?.find(i => i.item?.nama_item?.toLowerCase().includes(k.toLowerCase()));
  const findPKById = (id: number) => vcf.pemeriksaan_keluar?.find(i => i.item_id === id);

  const pmTangki = findPM("kondisi tangki") || findPM("tangki");
  const pmValve = findPM("valve") || findPM("penutup");

  const isPosValue = (val?: string) => {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return ["ya", "ada", "bagus", "baik", "terpasang", "1", "kosong"].includes(v);
  };
  const isNegValue = (val?: string) => {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return ["tidak", "tidak ada", "tidak bagus", "rusak", "sisa", "0", "tidak terpasang"].includes(v);
  };

  const isValveAda = isPosValue(pmValve?.nilai);
  const isValveTidak = isNegValue(pmValve?.nilai);

  const pkValve = findPK("valve") || findPK("penutup");
  const isPkValveAda = isPosValue(pkValve?.nilai);
  const isPkValveTidak = isNegValue(pkValve?.nilai);

  const btmAda = vcf.beban_tambahan_masuk?.ada || isPosValue(findPM("beban")?.nilai);
  const segelMasukAda = (vcf.segel_masuk?.jumlah_segel ?? 0) > 0 || findPM("segel")?.nilai?.toLowerCase() === "terpasang";

  const pkTangki = findPK("kondisi tangki") || findPK("tangki");
  const btkAda = vcf.beban_tambahan_keluar?.ada || isPosValue(findPK("beban")?.nilai);
  const segelKeluarAda = (vcf.segel_keluar?.jumlah_segel ?? 0) > 0 || findPK("segel")?.nilai?.toLowerCase() === "terpasang";

  const hasBagian1Data = vcf.status && vcf.status !== "";
  const hasBagian2Data = vcf.status === "bagian2_selesai" || vcf.status === "loading_unloading_selesai" || vcf.status === "bagian3_selesai" || vcf.status === "weighbridge_keluar" || vcf.status === "selesai";
  const hasBagian3Data = vcf.status === "bagian3_selesai" || vcf.status === "weighbridge_keluar" || vcf.status === "selesai";
  const hasBagian4Data = vcf.status === "selesai";

  const formatVal = (val: string) => {
    if (!val || val === "" || val === "0" || val.toLowerCase() === "tidak") return "-";
    if (val === "1") return "Ya";
    return val;
  };

  const getMD = (id: number) => formatVal(vcf.muatan_dibawa?.find(m => m.item_muatan_id === id || m.item_muatan?.id === id)?.nilai || "");
  const getMI = (id: number) => formatVal(vcf.muatan_diisi?.find(m => m.item_muatan_id === id || m.item_muatan?.id === id)?.nilai || "");

  return (
    <>
      {/* ── INFO UMUM ── */}
      <table style={{ width: "100%" }}>
        <colgroup><col style={{ width: "38%" }} /><col style={{ width: "28%" }} /><col style={{ width: "34%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={PRINT_STYLES.CELL}>
              <strong>NOMOR URUT</strong>: <UL w={110} val={vcf.nomor_urut} /><br />
              <div style={{ marginTop: 2 }}><strong>TANGGAL</strong>: <UL w={110} val={vcf.tanggal} /></div>
            </td>
            <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}>
              <strong>LOGISTIK</strong><br />
              <div style={{ marginTop: 2 }}><CK checked={isLoading} label="LOADING" /><CK checked={isUnloading} label="UNLOADING" /></div>
            </td>
            <td style={PRINT_STYLES.CELL}>
              <CK checked={isLokal} label="LOKAL" /><CK checked={isExport} label="EXPORT" /><br />
              <div style={{ marginTop: 2 }}><CK checked={isImport} label="IMPORT" /></div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={PRINT_STYLES.CELL}>
              {masterProduk.length > 0 ? (
                masterProduk.map(p => (
                  <CK key={p.id} checked={hasProduk(p.nama, p.kode)} label={p.nama} highlight />
                ))
              ) : (
                <>
                  <CK checked={hasProduk("CPO", "CPO")} label="CPO" highlight />
                  <CK checked={hasProduk("RBDPO", "RBDPO")} label="RBDPO" highlight />
                  <CK checked={hasProduk("RBDOL", "RBDOL")} label="RBDOL" highlight />
                  <CK checked={hasProduk("RBDST", "RBDST")} label="RBDST" highlight />
                  <CK checked={hasProduk("PFAD", "PFAD")} label="PFAD" highlight />
                </>
              )}
              {othersVal && <span style={{ marginLeft: 10 }}>Others: <UL w={90} val={othersVal} /></span>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Tabel 1a: Info Kendaraan & Pemeriksaan Kelengkapan Supir ── */}
      <div style={PRINT_STYLES.HDR}>1. Diisi Oleh Security Main Gate</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "36%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} style={PRINT_STYLES.CELL}><strong>Transporter</strong>: {vcf.transporter?.nama_transporter || <UL w={120} />}</td>
            <td colSpan={2} style={PRINT_STYLES.CELL}><strong>Jam Masuk</strong>: <UL w={60} val={vcf.jam_masuk} /> WIB</td>
          </tr>
          <tr>
            <td colSpan={2} style={PRINT_STYLES.CELL}><strong>No. Polisi</strong>: {vcf.no_polisi || <UL w={80} />}</td>
            <td colSpan={2} style={PRINT_STYLES.CELL}>
              <strong>Tipe</strong>:{" "}
              {masterJenis.length > 0 ? (
                masterJenis.map(j => (
                  <CK key={j.id} checked={vcf.jenis_kendaraan_id === j.id || vcf.jenis_kendaraan?.id === j.id} label={j.nama} />
                ))
              ) : (
                <>
                  <CK checked={vcf.tipe_kendaraan?.toLowerCase().includes("bak")} label="BAK" />
                  <CK checked={vcf.tipe_kendaraan?.toLowerCase().includes("tangki")} label="TANGKI" />
                  <CK checked={vcf.tipe_kendaraan?.toLowerCase().includes("box")} label="BOX" />
                  <CK checked={vcf.tipe_kendaraan?.toLowerCase().includes("cont")} label="CONT" />
                </>
              )}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={PRINT_STYLES.CELL}><strong>Nama Supir</strong>: {vcf.driver?.nama_supir || <UL w={120} />}</td>
            <td colSpan={2} style={PRINT_STYLES.CELL}><strong>Tahun Unit</strong>: <UL w={60} val={vcf.tahun_kendaraan} /></td>
          </tr>
          <tr>
            <td colSpan={2} style={PRINT_STYLES.CELL}>
              <strong>SIM Supir</strong>: <UL w={80} val={vcf.driver?.no_sim} /> ( <UL w={30} val={vcf.driver?.jenis_sim} /> )
              {vcf.driver?.tgl_berlaku_sim && (
                <span style={{ marginLeft: 8, fontSize: 8 }}>
                  Berlaku s/d: <UL w={60} val={vcf.driver.tgl_berlaku_sim.split('T')[0]} />
                </span>
              )}
            </td>
            <td colSpan={2} style={PRINT_STYLES.CELL}>
            </td>
          </tr>

          <tr>
            <td colSpan={4} style={{ ...PRINT_STYLES.SUB_HDR, padding: "5px 8px 3px", fontSize: 9 }}>Pemeriksaan Kelengkapan Supir</td>
          </tr>
          {masterKS.length > 0 ? (
            masterKS.map((item, i) => {
              const ks = vcf.kelengkapan_supir?.find(val => val.item_id === item.id);
              if (!ks || (ks.nilai === null || ks.nilai === undefined || ks.nilai === "")) return null;
              const isYes = ks?.nilai === true || ks?.nilai === 1 || ks?.nilai === "1" || String(ks?.nilai).toLowerCase() === "ya";
              const isNo = ks?.nilai === false || ks?.nilai === 0 || ks?.nilai === "0" || String(ks?.nilai).toLowerCase() === "tidak";
              const exLbl = i === 0 ? "Tujuan" : "";
              const exVal = i === 0 ? vcf.asal_tujuan : "";
              return (
                <tr key={item.id}>
                  <td style={PRINT_STYLES.CELL}>{i + 1}. {item.nama_item}</td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={isYes} label="Ya" highlight /></td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={isNo} label="Tidak" highlight /></td>
                  <td style={PRINT_STYLES.CELL}>{exLbl ? <span><strong>{exLbl}</strong>: <UL w={110} val={exVal || "-"} /></span> : ""}</td>
                </tr>
              );
            })
          ) : (
            [
              { lbl: "1) SPB / DO", kw: "spb", ex: "Tujuan", val: vcf.asal_tujuan },
              { lbl: "2) Seragam", kw: "seragam" },
              { lbl: "3) Sepatu & Helm", kw: "sepatu" },
              { lbl: "4) ID Card / Visitor", kw: "id card" },
            ].map((item, i) => {
              const ks = findKS(item.kw);
              const isYes = ks?.nilai === true || ks?.nilai === 1 || ks?.nilai === "1" || String(ks?.nilai).toLowerCase() === "ya";
              const isNo = ks?.nilai === false || ks?.nilai === 0 || ks?.nilai === "0" || String(ks?.nilai).toLowerCase() === "tidak";
              return (
                <tr key={i}>
                  <td style={PRINT_STYLES.CELL}>{item.lbl}</td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={isYes} label="Ya" highlight /></td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={isNo} label="Tidak" highlight /></td>
                  <td style={PRINT_STYLES.CELL}>{item.ex ? <span><strong>{item.ex}</strong>: <UL w={110} val={(item as any).val || "-"} /></span> : ""}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* ── Tabel Jenis Muatan ── */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {(() => {
            const dibawa = masterMuatan.length > 0
              ? masterMuatan.filter(m => (m as any).jenis !== "diisi" && (m as any).jenis !== "loading_only")
              : ["Minyak", "Fuel", "Sparepart", "Lainnya"].map((k, idx) => ({ id: -(idx + 1), nama_item: k, _fallback: k }));
            const diisi = masterMuatan.length > 0
              ? masterMuatan.filter(m => (m as any).jenis !== "dibawa" && (m as any).jenis !== "unloading_only")
              : ["Minyak", "Limbah", "Lainnya"].map((k, idx) => ({ id: -(idx + 100), nama_item: k, _fallback: k }));

            const selectedDibawa = dibawa.filter((m: any) => {
              const val = m._fallback
                ? formatVal(vcf.muatan_dibawa?.find((x: any) => (x.item_muatan?.nama_item ?? x.nama_item ?? "").toLowerCase().includes(m._fallback.toLowerCase()))?.nilai || "")
                : getMD(m.id);
              return val !== "-" && val !== "";
            }).map((m: any) => m.nama_item).join(", ") || "-";

            const selectedDiisi = diisi.filter((m: any) => {
              const val = m._fallback
                ? formatVal(vcf.muatan_diisi?.find((x: any) => (x.item_muatan?.nama_item ?? x.nama_item ?? "").toLowerCase().includes(m._fallback.toLowerCase()))?.nilai || "")
                : getMI(m.id);
              return val !== "-" && val !== "";
            }).map((m: any) => m.nama_item).join(", ") || "-";

            const dibawaLainnya = vcf.muatan_dibawa?.find((m: any) => (!m.item_muatan_id || m.item_muatan_id === null) && m.nilai && m.nilai !== "0");
            const diisiLainnya = vcf.muatan_diisi?.find((m: any) => (!m.item_muatan_id || m.item_muatan_id === null) && m.nilai && m.nilai !== "0");

            const finalDibawa = dibawaLainnya
              ? (selectedDibawa !== "-" ? selectedDibawa + ", " : "") + "Lainnya (" + dibawaLainnya.nilai + ")"
              : selectedDibawa;
            const finalDiisi = diisiLainnya
              ? (selectedDiisi !== "-" ? selectedDiisi + ", " : "") + "Lainnya (" + diisiLainnya.nilai + ")"
              : selectedDiisi;

            return (
              <>
                {isLoading && (
                  <tr>
                    <td style={PRINT_STYLES.CELL}>
                      Muatan yang akan di isi adalah <strong>{finalDiisi}</strong>
                    </td>
                  </tr>
                )}
                {isUnloading && (
                  <>
                    <tr>
                      <td style={PRINT_STYLES.CELL}>
                        Muatan yang akan dibawa adalah <strong>{finalDibawa}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={PRINT_STYLES.CELL}>
                        <strong>Segel Masuk</strong>: Jml: {vcf.segel_masuk?.jumlah_segel || 0} &nbsp; No: ({vcf.segel_masuk?.nomor_segel?.map(s => s.nomor_segel).join(", ") || ""})
                      </td>
                    </tr>
                  </>
                )}
                {!isLoading && !isUnloading && (
                  <>
                    <tr>
                      <td style={PRINT_STYLES.CELL}>
                        Muatan yang akan dibawa adalah <strong>{finalDibawa}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={PRINT_STYLES.CELL}>
                        Muatan yang akan di isi adalah <strong>{finalDiisi}</strong>
                      </td>
                    </tr>
                  </>
                )}
              </>
            );
          })()}
        </tbody>
      </table>

      {/* ── Keterangan + QR ── */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup>
          <col style={{ width: "75%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...PRINT_STYLES.CELL, fontStyle: "italic", verticalAlign: "top" }}>
              Keterangan: <UL w={240} val={cleanKeterangan(vcf.keterangan || vcf.catatan)} textAlign="left" />
            </td>
            <td style={{ ...PRINT_STYLES.CELL, textAlign: "center", padding: "3px", verticalAlign: "middle" }}>
              <QRCodeSign
                nama={vcf.nama_petugas_main_gate_masuk || vcf.created_by?.nama}
                timestamp={vcf.created_at || vcf.tanggal}
                label="Petugas Main Gate"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div style={PRINT_STYLES.HDR}>2. Diisi Oleh Security Weighbridge ( Masuk )</div>
      <table style={{ width: "100%" }}>
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "36%" }} />
        </colgroup>
        <tbody>
          {masterPM.length > 0 ? (
            masterPM.map((item, i) => {
              const pm = vcf.pemeriksaan_masuk?.find(p => p.item_id === item.id);
              const nm = item.nama_item?.toLowerCase() ?? "";
              const isBTK = item.kode === "BTK" || nm.includes("beban");
              const isSGL = item.kode === "SGK" || item.kode === "SGL" || nm.includes("segel");
              const hasSpecialData = (isBTK && vcf.beban_tambahan_masuk) || (isSGL && vcf.segel_masuk);
              if (!pm?.nilai && !hasSpecialData) return null;
              const val = pm?.nilai;
              const opts = item.tipe_jawaban && item.tipe_jawaban !== "input"
                ? item.tipe_jawaban.split(",").map(s => s.trim())
                : [];
              const label1 = isBTK ? "Ada" : isSGL ? "Terpasang" : (opts[0] || "Ya");
              const label2 = isBTK ? "Tidak" : isSGL ? "Tidak Terpasang" : (opts[1] || "Tidak");
              const isOpt1 = val ? val.trim().toLowerCase() === label1.toLowerCase() || isPosValue(val) : false;
              const isOpt2 = val ? val.trim().toLowerCase() === label2.toLowerCase() || isNegValue(val) : false;
              return (
                <tr key={item.id}>
                  <td style={PRINT_STYLES.CELL}>{String.fromCharCode(97 + i)}. {item.nama_item}</td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}>
                    <CK checked={hasBagian2Data && (isOpt1 || (isBTK && btmAda) || (isSGL && segelMasukAda))}
                      label={label1} highlight />
                  </td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}>
                    <CK checked={hasBagian2Data && (isOpt2 || (isBTK && !btmAda) || (isSGL && !segelMasukAda))}
                      label={label2} highlight />
                  </td>
                  <td style={PRINT_STYLES.CELL}>
                    {isBTK && <span>Jenis: <UL w={100} val={vcf.beban_tambahan_masuk?.jenis_beban} /></span>}
                    {!isBTK && !isSGL && val && opts.length === 0 && <span><UL w={120} val={val} /></span>}
                  </td>
                </tr>
              );
            })
          ) : (
            <>
              <tr>
                <td style={PRINT_STYLES.CELL}>a. Kondisi Tangki</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && isPosValue(pmTangki?.nilai)} label="Bagus" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && isNegValue(pmTangki?.nilai)} label="Tidak" highlight /></td>
                <td style={PRINT_STYLES.CELL}>Jenis: <UL w={100} val={vcf.beban_tambahan_masuk?.jenis_beban} /></td>
              </tr>
              <tr>
                <td style={PRINT_STYLES.CELL}>b. Penutup Valve</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && isValveAda} label="Ada" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && isValveTidak} label="Tidak" highlight /></td>
                <td style={PRINT_STYLES.CELL}></td>
              </tr>
              <tr>
                <td style={PRINT_STYLES.CELL}>c. Beban Tambahan</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && btmAda} label="Ada" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && !btmAda} label="Tidak" highlight /></td>
                <td style={PRINT_STYLES.CELL}>Jenis: <UL w={100} val={vcf.beban_tambahan_masuk?.jenis_beban} /></td>
              </tr>
              <tr>
                <td style={PRINT_STYLES.CELL}>d. Segel</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && segelMasukAda} label="Terpasang" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian2Data && !segelMasukAda} label="Tidak Terpasang" highlight /></td>
                <td style={PRINT_STYLES.CELL}></td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup>
          <col style={{ width: "75%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...PRINT_STYLES.CELL, fontStyle: "italic", verticalAlign: "top" }}>
              Keterangan: <UL w={280} val={cleanKeterangan(vcf.segel_masuk?.keterangan || vcf.vcf_bagian2?.keterangan)} textAlign="left" />
            </td>
            <td style={{ ...PRINT_STYLES.CELL, textAlign: "center", padding: "3px", verticalAlign: "middle" }}>
              <QRCodeSign
                nama={vcf.nama_petugas_wb_masuk || vcf.pemeriksaan_masuk?.[0]?.petugas?.nama || vcf.segel_masuk?.petugas?.nama}
                timestamp={vcf.pemeriksaan_masuk?.[0]?.waktu_input || vcf.pemeriksaan_masuk?.[0]?.created_at || vcf.segel_masuk?.created_at}
                label="Petugas WB Masuk"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div style={PRINT_STYLES.HDR}>3. Diisi Oleh Security Weighbridge ( Keluar )</div>
      <table style={{ width: "100%" }}>
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "36%" }} />
        </colgroup>
        <tbody>
          {masterPK.length > 0 ? (
            masterPK.map((item, i) => {
              const pk = findPKById(item.id);
              const nm = item.nama_item?.toLowerCase() ?? "";
              const isBTK = item.kode === "BTK" || nm.includes("beban");
              const isSGL = item.kode === "SGK" || item.kode === "SGL" || nm.includes("segel");
              const hasSpecialData = (isBTK && vcf.beban_tambahan_keluar) || (isSGL && vcf.segel_keluar);
              if (!pk?.nilai && !hasSpecialData) return null;
              const val = pk?.nilai;
              const opts = item.tipe_jawaban && item.tipe_jawaban !== "input"
                ? item.tipe_jawaban.split(",").map(s => s.trim())
                : [];
              const label1 = isBTK ? "Ada" : isSGL ? "Terpasang" : (opts[0] || "Ya");
              const label2 = isBTK ? "Tidak" : isSGL ? "Tidak Terpasang" : (opts[1] || "Tidak");
              const isOpt1 = val ? val.trim().toLowerCase() === label1.toLowerCase() || isPosValue(val) : false;
              const isOpt2 = val ? val.trim().toLowerCase() === label2.toLowerCase() || isNegValue(val) : false;
              return (
                <tr key={item.id}>
                  <td style={PRINT_STYLES.CELL}>{String.fromCharCode(97 + i)}. {item.nama_item}</td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}>
                    <CK checked={hasBagian3Data && (isOpt1 || (isBTK && btkAda) || (isSGL && segelKeluarAda))}
                      label={label1} highlight />
                  </td>
                  <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}>
                    <CK checked={hasBagian3Data && (isOpt2 || (isBTK && !btkAda) || (isSGL && !segelKeluarAda))}
                      label={label2} highlight />
                  </td>
                  <td style={PRINT_STYLES.CELL}>
                    {isBTK && <span>Jenis: <UL w={100} val={vcf.beban_tambahan_keluar?.jenis_beban} /></span>}
                    {!isBTK && !isSGL && val && opts.length === 0 && <span><UL w={120} val={val} /></span>}
                  </td>
                </tr>
              );
            })
          ) : (
            <>
              <tr>
                <td style={PRINT_STYLES.CELL}>a. Kondisi Tangki</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && isPosValue(pkTangki?.nilai)} label="Bagus" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && isNegValue(pkTangki?.nilai)} label="Tidak" highlight /></td>
                <td style={PRINT_STYLES.CELL}></td>
              </tr>
              <tr>
                <td style={PRINT_STYLES.CELL}>b. Penutup Valve</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && isPkValveAda} label="Ada" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && isPkValveTidak} label="Tidak" highlight /></td>
                <td style={PRINT_STYLES.CELL}>Jenis: <UL w={100} val={vcf.beban_tambahan_keluar?.jenis_beban} /></td>
              </tr>
              <tr>
                <td style={PRINT_STYLES.CELL}>c. Beban Tambahan</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && btkAda} label="Ada" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && !btkAda} label="Tidak" highlight /></td>
                <td style={PRINT_STYLES.CELL}>Jenis: <UL w={100} val={vcf.beban_tambahan_keluar?.jenis_beban} /></td>
              </tr>
              <tr>
                <td style={PRINT_STYLES.CELL}>d. Segel</td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && segelKeluarAda} label="Terpasang" highlight /></td>
                <td style={{ ...PRINT_STYLES.CELL, textAlign: "center" }}><CK checked={hasBagian3Data && !segelKeluarAda} label="Tidak Terpasang" highlight /></td>
                <td style={PRINT_STYLES.CELL}></td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup>
          <col style={{ width: "75%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...PRINT_STYLES.CELL, fontStyle: "italic", verticalAlign: "top" }}>
              Keterangan: <UL w={280} val={cleanKeterangan(vcf.segel_keluar?.keterangan || vcf.vcf_bagian3?.keterangan)} textAlign="left" />
            </td>
            <td style={{ ...PRINT_STYLES.CELL, textAlign: "center", padding: "3px", verticalAlign: "middle" }}>
              <QRCodeSign
                nama={vcf.nama_petugas_wb_keluar || vcf.pemeriksaan_keluar?.[0]?.petugas?.nama || vcf.segel_keluar?.petugas?.nama}
                timestamp={vcf.pemeriksaan_keluar?.[0]?.waktu_input || vcf.pemeriksaan_keluar?.[0]?.created_at || vcf.segel_keluar?.created_at}
                label="Petugas WB Keluar"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div style={PRINT_STYLES.HDR}>4. Diisi Oleh Security Main Gate</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={PRINT_STYLES.CELL}><strong>Jam Keluar</strong>: <UL w={80} val={vcf.vcf_keluar?.jam_keluar} /> WIB</td>
            <td style={PRINT_STYLES.CELL}><strong>Emergency Respon</strong>: <UL w={110} val={vcf.vcf_keluar?.emergency_respon_kontak} /></td>
          </tr>
          <tr>
            <td colSpan={2} style={PRINT_STYLES.CELL}>
            </td>
          </tr>
          {isLoading && (
            <tr>
              <td colSpan={2} style={PRINT_STYLES.CELL}>
                <strong>Segel Keluar</strong>: Jml: {vcf.segel_keluar?.jumlah_segel || 0} &nbsp; No: ({vcf.segel_keluar?.nomor_segel?.map(s => s.nomor_segel).join(", ") || ""})
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup>
          <col style={{ width: "75%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...PRINT_STYLES.CELL, fontStyle: "italic", verticalAlign: "top" }}>
              Keterangan: <UL w={240} val={cleanKeterangan(vcf.vcf_keluar?.keterangan)} textAlign="left" />
            </td>
            <td style={{ ...PRINT_STYLES.CELL, textAlign: "center", padding: "3px", verticalAlign: "middle" }}>
              <QRCodeSign
                nama={vcf.nama_petugas_main_gate_keluar || vcf.vcf_keluar?.petugas?.nama}
                timestamp={vcf.vcf_keluar?.waktu_input || vcf.vcf_keluar?.created_at}
                label="Petugas Main Gate"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 3, fontSize: 7, fontStyle: "italic" }}>
        Lembar : 1. WB (Putih), 2. Security (Kuning)
      </div>
    </>
  );
}
