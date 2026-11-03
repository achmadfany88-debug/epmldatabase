/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BantuanItem, 
  KategoriPajakVendor, 
  RiwayatTransaksiVendor, 
  VendorItem 
} from '../../types';
import { 
  Building2, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  X, 
  ChevronRight, 
  Filter, 
  DollarSign, 
  Package, 
  ExternalLink,
  Briefcase,
  Layers,
  Calendar,
  AlertTriangle,
  Send
} from 'lucide-react';

interface VendorManagementProps {
  vendorList: VendorItem[];
  bantuanList: BantuanItem[];
  currentActorName: string;
  onSaveVendor: (vendor: VendorItem) => void;
  onDeleteVendor: (vendorId: string) => void;
}

export const VendorManagement: React.FC<VendorManagementProps> = ({
  vendorList,
  bantuanList,
  currentActorName,
  onSaveVendor,
  onDeleteVendor
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<'ALL' | KategoriPajakVendor>('ALL');
  const [filterStatusPengadaan, setFilterStatusPengadaan] = useState<'ALL' | 'AKTIF' | 'STANDBY'>('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);
  const [selectedDetailVendor, setSelectedDetailVendor] = useState<VendorItem | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<VendorItem | null>(null);
  const [formError, setFormError] = useState('');

  // Form State
  const [formNamaVendor, setFormNamaVendor] = useState('');
  const [formKategoriVendor, setFormKategoriVendor] = useState<KategoriPajakVendor>('PKP');
  const [formBarangJasa, setFormBarangJasa] = useState('');
  const [formLokasi, setFormLokasi] = useState('');
  const [formNamaPic, setFormNamaPic] = useState('');
  const [formNoKontak, setFormNoKontak] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNpwp, setFormNpwp] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formRiwayatTransaksi, setFormRiwayatTransaksi] = useState<RiwayatTransaksiVendor[]>([]);

  // New Transaction Sub-form state inside modal
  const [newTrxTahun, setNewTrxTahun] = useState<number>(new Date().getFullYear());
  const [newTrxNoSpk, setNewTrxNoSpk] = useState('');
  const [newTrxPaket, setNewTrxPaket] = useState('');
  const [newTrxNominal, setNewTrxNominal] = useState<number>(0);
  const [newTrxStatus, setNewTrxStatus] = useState<'Selesai' | 'Berjalan' | 'Asesmen'>('Selesai');

  // Helper to get active procurements for a vendor from bantuanList
  const getVendorProcurements = (vendorName: string) => {
    if (!vendorName) return [];
    const cleanVendor = vendorName.toLowerCase().trim();
    return bantuanList.filter(b => {
      const bVendor = (b.vendorPenyedia || '').toLowerCase().trim();
      const inVendorString = bVendor === cleanVendor || 
             bVendor.includes(cleanVendor) || 
             cleanVendor.includes(bVendor);
      const inDaftarVendor = b.daftarVendor?.some(v => {
        const vName = (v.namaVendor || '').toLowerCase().trim();
        return vName === cleanVendor || vName.includes(cleanVendor) || cleanVendor.includes(vName);
      });
      return inVendorString || Boolean(inDaftarVendor);
    });
  };

  const getOngoingProcurements = (vendorName: string) => {
    const list = getVendorProcurements(vendorName);
    return list.filter(b => ['Asesmen', 'Usulan', 'Pengadaan', 'Pengiriman'].includes(b.statusTahap));
  };

  // KPI calculations
  const totalVendors = vendorList.length;
  const countPkp = useMemo(() => vendorList.filter(v => v.kategoriVendor === 'PKP').length, [vendorList]);
  const countNonPkp = useMemo(() => vendorList.filter(v => v.kategoriVendor === 'Non-PKP').length, [vendorList]);
  
  const vendorsWithActiveProcurement = useMemo(() => {
    return vendorList.filter(v => getOngoingProcurements(v.namaVendor).length > 0).length;
  }, [vendorList, bantuanList]);

  const totalNilaiKontrakAll = useMemo(() => {
    return vendorList.reduce((acc, v) => {
      const sumTrx = (v.riwayatTransaksi || []).reduce((s, t) => s + (t.nominal || 0), 0);
      return acc + sumTrx;
    }, 0);
  }, [vendorList]);

  // Filtered Vendor List
  const filteredVendors = useMemo(() => {
    return vendorList.filter(vendor => {
      const matchSearch = 
        vendor.namaVendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.barangJasa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.lokasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.namaPic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.noKontak.includes(searchTerm) ||
        vendor.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchKategori = filterKategori === 'ALL' || vendor.kategoriVendor === filterKategori;

      const ongoing = getOngoingProcurements(vendor.namaVendor);
      const isAktif = ongoing.length > 0;
      let matchStatus = true;
      if (filterStatusPengadaan === 'AKTIF') {
        matchStatus = isAktif;
      } else if (filterStatusPengadaan === 'STANDBY') {
        matchStatus = !isAktif;
      }

      return matchSearch && matchKategori && matchStatus;
    });
  }, [vendorList, searchTerm, filterKategori, filterStatusPengadaan, bantuanList]);

  // Open Form Modal for Create
  const handleOpenCreateModal = () => {
    setEditingVendor(null);
    setFormNamaVendor('');
    setFormKategoriVendor('PKP');
    setFormBarangJasa('');
    setFormLokasi('');
    setFormNamaPic('');
    setFormNoKontak('');
    setFormEmail('');
    setFormNpwp('');
    setFormCatatan('');
    setFormRiwayatTransaksi([]);
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEditModal = (vendor: VendorItem) => {
    setEditingVendor(vendor);
    setFormNamaVendor(vendor.namaVendor);
    setFormKategoriVendor(vendor.kategoriVendor);
    setFormBarangJasa(vendor.barangJasa);
    setFormLokasi(vendor.lokasi);
    setFormNamaPic(vendor.namaPic);
    setFormNoKontak(vendor.noKontak);
    setFormEmail(vendor.email);
    setFormNpwp(vendor.npwp || '');
    setFormCatatan(vendor.catatan || '');
    setFormRiwayatTransaksi([...(vendor.riwayatTransaksi || [])]);
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Add a transaction to the temporary list in modal
  const handleAddTransaction = () => {
    setFormError('');
    if (!newTrxPaket || newTrxNominal <= 0) {
      setFormError('Silakan isi nama paket dan nominal transaksi yang valid.');
      return;
    }
    const newTrx: RiwayatTransaksiVendor = {
      id: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tahun: newTrxTahun,
      noSpkKontrak: newTrxNoSpk.trim() || `SPK-BI-JTM/${newTrxTahun}/${Math.floor(100 + Math.random() * 900)}`,
      namaPaket: newTrxPaket.trim(),
      nominal: Number(newTrxNominal),
      status: newTrxStatus
    };
    setFormRiwayatTransaksi(prev => [newTrx, ...prev]);
    setNewTrxPaket('');
    setNewTrxNoSpk('');
    setNewTrxNominal(0);
  };

  // Remove transaction from list in modal
  const handleRemoveTransaction = (trxId: string) => {
    setFormRiwayatTransaksi(prev => prev.filter(t => t.id !== trxId));
  };

  // Submit Save/Update Vendor
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formNamaVendor.trim() || !formBarangJasa.trim()) {
      setFormError('Nama Vendor dan Barang/Jasa yang disediakan wajib diisi.');
      return;
    }

    const vendorToSave: VendorItem = {
      id: editingVendor ? editingVendor.id : `VND-${Date.now().toString().slice(-4)}`,
      namaVendor: formNamaVendor.trim(),
      kategoriVendor: formKategoriVendor,
      barangJasa: formBarangJasa.trim(),
      lokasi: formLokasi.trim(),
      namaPic: formNamaPic.trim(),
      noKontak: formNoKontak.trim(),
      email: formEmail.trim(),
      npwp: formNpwp.trim() || undefined,
      catatan: formCatatan.trim() || undefined,
      riwayatTransaksi: formRiwayatTransaksi,
      createdAt: editingVendor ? editingVendor.createdAt : new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    onSaveVendor(vendorToSave);
    setIsFormModalOpen(false);
  };

  // Handle Delete Vendor (Open Custom Confirmation Popup)
  const handleDelete = (vendor: VendorItem) => {
    setVendorToDelete(vendor);
  };

  // Confirm Delete Vendor
  const handleConfirmDeleteVendor = () => {
    if (!vendorToDelete) return;
    const targetId = vendorToDelete.id;
    setVendorToDelete(null);
    if (selectedDetailVendor?.id === targetId) {
      setSelectedDetailVendor(null);
    }
    onDeleteVendor(targetId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner / Heading */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Direktori & Manajemen Rekanan Vendor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data penyedia barang/jasa, status pengadaan aktif, profil pajak, dan riwayat transaksi tahunan Bank Indonesia.
              </p>
            </div>
          </div>
        </div>

        {/* Input Vendor Baru Button */}
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Input Vendor Baru</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Vendor */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Total Rekanan Vendor</p>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {totalVendors} <span className="text-xs font-normal text-slate-400">Badan Usaha</span>
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>PKP: <strong className="text-blue-700 dark:text-blue-400">{countPkp}</strong></span>
            <span>&bull;</span>
            <span>Non-PKP: <strong className="text-amber-700 dark:text-amber-400">{countNonPkp}</strong></span>
          </div>
        </div>

        {/* Card 2: Pengadaan Aktif */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Proses Pengadaan Aktif</p>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {vendorsWithActiveProcurement} <span className="text-xs font-normal text-slate-400">Vendor Berjalan</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            Sedang dalam tahap asesmen, pengadaan, atau pengiriman
          </p>
        </div>

        {/* Card 3: Vendor Standby / Bebas */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Vendor Siap Ditunjuk</p>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {totalVendors - vendorsWithActiveProcurement} <span className="text-xs font-normal text-slate-400">Tersedia</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            Bebas beban pengadaan & siap untuk penugasan baru
          </p>
        </div>

        {/* Card 4: Total Akumulasi Transaksi */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Akumulasi Kontrak BI</p>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
            Rp {(totalNilaiKontrakAll / 1000000000).toFixed(2)} Milyar
          </p>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            Total nilai riwayat transaksi tahunan rekanan
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama vendor, barang/jasa, lokasi, PIC..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-900"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Dropdown Kategori Pajak Vendor (PKP / Non-PKP) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Kategori:</span>
            <select
              value={filterKategori}
              onChange={e => setFilterKategori(e.target.value as 'ALL' | KategoriPajakVendor)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">Semua Kategori (PKP & Non-PKP)</option>
              <option value="PKP">Hanya PKP (Pengusaha Kena Pajak)</option>
              <option value="Non-PKP">Hanya Non-PKP</option>
            </select>
          </div>

          {/* Status Pengadaan Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Status:</span>
            <select
              value={filterStatusPengadaan}
              onChange={e => setFilterStatusPengadaan(e.target.value as 'ALL' | 'AKTIF' | 'STANDBY')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">Semua Status Pengadaan</option>
              <option value="AKTIF">🔔 Sedang Proses Pengadaan</option>
              <option value="STANDBY">✓ Siap Ditunjuk (Standby)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Vendor Table with Scroll & Sticky Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[620px] scroll-smooth">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 shadow-xs">
              <tr className="text-slate-700 dark:text-slate-200 font-semibold">
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3 min-w-[180px]">Nama Vendor & Kategori</th>
                <th className="p-3 min-w-[200px]">Barang / Jasa Disediakan</th>
                <th className="p-3 min-w-[160px]">Lokasi Vendor</th>
                <th className="p-3 min-w-[150px]">Kontak & PIC</th>
                <th className="p-3 min-w-[220px]">Notifikasi Proses Pengadaan</th>
                <th className="p-3 min-w-[150px] text-right">Riwayat Transaksi BI</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVendors.map((vendor, idx) => {
                const ongoingList = getOngoingProcurements(vendor.namaVendor);
                const hasOngoing = ongoingList.length > 0;
                const totalNilaiVendor = (vendor.riwayatTransaksi || []).reduce(
                  (sum, t) => sum + (t.nominal || 0), 
                  0
                );

                return (
                  <tr 
                    key={vendor.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* No */}
                    <td className="p-3 text-center tabular-nums text-slate-400 font-medium">
                      {idx + 1}
                    </td>

                    {/* Nama Vendor & Kategori Dropdown/Badge */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {vendor.namaVendor}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          vendor.kategoriVendor === 'PKP'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}>
                          {vendor.kategoriVendor}
                        </span>
                        {vendor.npwp && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            NPWP: {vendor.npwp}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Barang / Jasa Disediakan */}
                    <td className="p-3 max-w-xs">
                      <p className="line-clamp-2 text-slate-700 dark:text-slate-300 font-medium">
                        {vendor.barangJasa}
                      </p>
                    </td>

                    {/* Lokasi Vendor */}
                    <td className="p-3">
                      <div className="flex items-start gap-1 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{vendor.lokasi}</span>
                      </div>
                    </td>

                    {/* Kontak & PIC */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {vendor.namaPic}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{vendor.noKontak}</span>
                      </div>
                      {vendor.email && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[130px]">{vendor.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Notifikasi Si Vendor Sedang Dalam Proses Pengadaan Di Mana & Statusnya */}
                    <td className="p-3">
                      {hasOngoing ? (
                        <div className="space-y-1">
                          {ongoingList.map(item => (
                            <div 
                              key={item.id}
                              className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs animate-in fade-in"
                            >
                              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                                <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600 animate-pulse" />
                                <span>Sedang Proses: {item.statusTahap}</span>
                              </div>
                              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                                Lokasi: <strong>{item.kabupatenKota.replace('Kabupaten ', 'Kab. ')}</strong>
                              </p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                Penerima: {item.namaPenerima}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-900/50">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tidak ada pengadaan aktif (Siap Ditunjuk)</span>
                        </div>
                      )}
                    </td>

                    {/* Riwayat Transaksi Tiap Tahun dengan Bank Indonesia */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100 block">
                        Rp {totalNilaiVendor.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {(vendor.riwayatTransaksi || []).length} Kontrak SPK
                      </span>
                      <button
                        onClick={() => setSelectedDetailVendor(vendor)}
                        className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline flex items-center justify-end gap-1 mt-0.5 ml-auto"
                      >
                        <span>Lihat Riwayat</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>

                    {/* Aksi: Detail, Edit, Hapus */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedDetailVendor(vendor)}
                          title="Lihat Detail Vendor & Riwayat Transaksi"
                          className="p-1.5 text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(vendor)}
                          title="Perbarui / Edit Data Vendor"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor)}
                          title="Hapus Data Vendor Rekanan"
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-medium">Tidak ada data rekanan vendor yang sesuai kriteria pencarian.</p>
                    <p className="text-xs text-slate-400 mt-1">Coba ganti filter atau klik tombol "Input Vendor Baru".</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">
            Menampilkan <strong>{filteredVendors.length}</strong> dari <strong>{vendorList.length}</strong> rekanan vendor terdaftar
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Sistem Monitoring Rekanan Terintegrasi EPML</span>
            <span>&bull;</span>
            <span>KPw Bank Indonesia Provinsi Jawa Timur</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: INPUT / EDIT DATA VENDOR */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {editingVendor ? 'Perbarui Data Rekanan Vendor' : 'Input Rekanan Vendor Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingVendor 
                      ? `Ubah data vendor ID: ${editingVendor.id}`
                      : 'Lengkapi formulir pendaftaran penyedia barang/jasa Bank Indonesia'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Vendor */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Vendor / Badan Usaha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Surya Mandiri Solusindo / CV Agrotek Nusantara"
                    value={formNamaVendor}
                    onChange={e => setFormNamaVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                {/* Kategori Vendor (PKP / Non-PKP) Dropdown */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Vendor Pajak <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formKategoriVendor}
                    onChange={e => setFormKategoriVendor(e.target.value as KategoriPajakVendor)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="PKP">PKP (Pengusaha Kena Pajak)</option>
                    <option value="Non-PKP">Non-PKP (Bukan Pengusaha Kena Pajak)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Pilih status perpajakan rekanan untuk penerbitan faktur pajak pengadaan.
                  </span>
                </div>

                {/* NPWP */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor NPWP
                  </label>
                  <input
                    type="text"
                    placeholder="01.234.567.8-012.000"
                    value={formNpwp}
                    onChange={e => setFormNpwp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* Barang / Jasa yang Disediakan */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Barang / Jasa yang Disediakan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Komputer, Server, Mesin Pertanian, Instalasi Solar Cell, Jasa Sertifikasi"
                    value={formBarangJasa}
                    onChange={e => setFormBarangJasa(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Lokasi Vendor */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi / Alamat Vendor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Alamat lengkap, gedung, jalan, kota / kabupaten"
                    value={formLokasi}
                    onChange={e => setFormLokasi(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Nama PIC Vendor */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama PIC Rekanan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama penanggung jawab pengadaan"
                    value={formNamaPic}
                    onChange={e => setFormNamaPic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* No Telepon / Kontak */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kontak HP / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="081234567890"
                    value={formNoKontak}
                    onChange={e => setFormNoKontak(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Resmi
                  </label>
                  <input
                    type="email"
                    placeholder="kontrak@vendor.co.id"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Catatan Kinerja */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Kualifikasi / Kinerja
                  </label>
                  <input
                    type="text"
                    placeholder="Sertifikasi TKDN, rating ketepatan, garansi"
                    value={formCatatan}
                    onChange={e => setFormCatatan(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Sub-form: Riwayat Transaksi Tiap Tahun dengan Bank Indonesia */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      Riwayat Transaksi Kontrak Tahunan dengan Bank Indonesia
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Catat riwayat kontrak atau pekerjaan yang pernah diselesaikan oleh vendor ini.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-400">
                    {formRiwayatTransaksi.length} Catatan Kontrak
                  </span>
                </div>

                {/* Add transaction form row */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Tambah Entri Riwayat Kontrak Baru:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <input
                      type="number"
                      placeholder="Tahun"
                      value={newTrxTahun}
                      onChange={e => setNewTrxTahun(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="No. SPK / Kontrak"
                      value={newTrxNoSpk}
                      onChange={e => setNewTrxNoSpk(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Nama Paket / Pekerjaan"
                      value={newTrxPaket}
                      onChange={e => setNewTrxPaket(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 sm:col-span-2"
                    />
                    <input
                      type="number"
                      placeholder="Nominal (Rp)"
                      value={newTrxNominal || ''}
                      onChange={e => setNewTrxNominal(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Status:</span>
                      <select
                        value={newTrxStatus}
                        onChange={e => setNewTrxStatus(e.target.value as 'Selesai' | 'Berjalan' | 'Asesmen')}
                        className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="Selesai">Selesai</option>
                        <option value="Berjalan">Berjalan</option>
                        <option value="Asesmen">Asesmen</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTransaction}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambahkan ke Riwayat</span>
                    </button>
                  </div>
                </div>

                {/* List of transactions in modal */}
                {formRiwayatTransaksi.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {formRiwayatTransaksi.map(trx => (
                      <div key={trx.id} className="p-2.5 flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{trx.tahun}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="font-mono text-[10px] text-blue-800 dark:text-blue-400">{trx.noSpkKontrak}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              trx.status === 'Selesai' 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {trx.status}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5">{trx.namaPaket}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                            Rp {trx.nominal.toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTransaction(trx.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {editingVendor ? 'Simpan Perubahan Vendor' : 'Daftarkan Vendor Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL VENDOR & RIWAYAT TRANSAKSI LENGKAP */}
      {/* ========================================================================= */}
      {selectedDetailVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-900 text-white shrink-0 mt-0.5">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {selectedDetailVendor.namaVendor}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedDetailVendor.kategoriVendor === 'PKP'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}>
                      {selectedDetailVendor.kategoriVendor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    ID Rekanan: {selectedDetailVendor.id} {selectedDetailVendor.npwp && `| NPWP: ${selectedDetailVendor.npwp}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailVendor(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Process Status Alert */}
            {(() => {
              const ongoing = getOngoingProcurements(selectedDetailVendor.namaVendor);
              if (ongoing.length > 0) {
                return (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                      <span>Notifikasi: Rekanan Memiliki {ongoing.length} Proses Pengadaan Aktif Berjalan!</span>
                    </div>
                    <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
                      {ongoing.map(item => (
                        <div key={item.id} className="pt-2 text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-900 dark:text-amber-300">
                              Tahap: {item.statusTahap}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              Rp {item.nominalBantuan.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            Lokasi: <strong>{item.kabupatenKota}</strong> &middot; Penerima: {item.namaPenerima}
                          </p>
                          <p className="text-[10px] text-slate-500 italic mt-0.5">
                            Rincian: {item.detailBantuan}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Status Rekanan Saat Ini: <strong>Siap Ditunjuk</strong> (Tidak ada proses pengadaan yang tertunda atau berjalan).
                  </span>
                </div>
              );
            })()}

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Barang / Jasa yang Disediakan
                </span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedDetailVendor.barangJasa}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Alamat & Wilayah Operasional
                </span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedDetailVendor.lokasi}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Kontak Person (PIC Rekanan)
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedDetailVendor.namaPic}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <a
                    href={`https://wa.me/${selectedDetailVendor.noKontak.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                  >
                    <Send className="w-3 h-3" />
                    <span>WA: {selectedDetailVendor.noKontak}</span>
                  </a>
                </div>
                {selectedDetailVendor.email && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Email: {selectedDetailVendor.email}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Catatan Kualifikasi Rekanan
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  {selectedDetailVendor.catatan || 'Belum ada catatan kualifikasi khusus.'}
                </p>
              </div>
            </div>

            {/* Riwayat Transaksi Tiap Tahun Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <span>Riwayat Transaksi Kontrak Tahunan dengan Bank Indonesia</span>
                </h4>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                  Total: Rp {(selectedDetailVendor.riwayatTransaksi || []).reduce((s, t) => s + (t.nominal || 0), 0).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5 w-16">Tahun</th>
                      <th className="p-2.5">No. SPK / Kontrak</th>
                      <th className="p-2.5">Nama Paket Pekerjaan</th>
                      <th className="p-2.5 text-right">Nilai Kontrak</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(selectedDetailVendor.riwayatTransaksi || []).map(trx => (
                      <tr key={trx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {trx.tahun}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-blue-900 dark:text-blue-400">
                          {trx.noSpkKontrak}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">
                          {trx.namaPaket}
                        </td>
                        <td className="p-2.5 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          Rp {trx.nominal.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            trx.status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {trx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!selectedDetailVendor.riwayatTransaksi || selectedDetailVendor.riwayatTransaksi.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          Belum ada riwayat transaksi kontrak yang tercatat untuk vendor ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Terdaftar sejak: {selectedDetailVendor.createdAt}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const v = selectedDetailVendor;
                    setSelectedDetailVendor(null);
                    handleOpenEditModal(v);
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Data Vendor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetailVendor(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: POP-UP PERINGATAN KONFIRMASI HAPUS DATA VENDOR */}
      {/* ========================================================================= */}
      {vendorToDelete && (() => {
        const ongoingList = getOngoingProcurements(vendorToDelete.namaVendor);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setVendorToDelete(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                  Peringatan Hapus Data Vendor
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Apakah benar data ini dihapus ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Data rekanan vendor ini akan dihapus dari direktori penyedia barang/jasa EPML dan tindakan ini akan dicatat pada Audit Log Sistem.
                </p>
              </div>

              {/* Detail Vendor yang Akan Dihapus */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Detail Rekanan Vendor:
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {vendorToDelete.namaVendor}
                </p>
                <p className="text-[11px] font-mono font-semibold text-blue-900 dark:text-blue-300">
                  ID: {vendorToDelete.id} • Status Pajak: {vendorToDelete.kategoriVendor}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-0.5 line-clamp-2">
                  Bidang: {vendorToDelete.barangJasa}
                </p>
              </div>

              {/* Peringatan Tambahan jika Vendor Sedang Memiliki Pengadaan Aktif */}
              {ongoingList.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 flex items-start gap-2.5 text-left">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                    <strong>Perhatian:</strong> Vendor ini saat ini tercatat memiliki{' '}
                    <strong>{ongoingList.length} pengadaan aktif</strong> dalam program bantuan EPML.
                  </p>
                </div>
              )}

              {/* Tombol Batal / Ya, Hapus */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVendorToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteVendor}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Ya, Hapus Data</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
