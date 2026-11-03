/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ArtikelItem, UserAccount } from '../../types';
import { WILAYAH_JAWA_TIMUR } from '../../data/initialData';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { 
  Newspaper, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  User, 
  Tag, 
  ZoomIn, 
  RefreshCw, 
  X, 
  Sparkles,
  Layers,
  Check
} from 'lucide-react';

interface ArtikelBeritaManagementProps {
  currentUser: UserAccount;
  artikelList: ArtikelItem[];
  onSaveArtikel: (artikel: ArtikelItem) => void;
  onDeleteArtikel: (artikelId: string) => void;
  onRefreshData?: () => void;
}

const KATEGORI_ARTIKEL_OPTIONS = [
  'Edukasi',
  'Pemberdayaan Masyarakat',
  'Lingkungan',
  'Informasi Umum'
];

const PRESET_PHOTOS = [
  {
    name: 'Dokumentasi Penyaluran EPML',
    url: '/src/assets/images/bantuan_epml_activity_1793505601348.jpg'
  },
  {
    name: 'Gedung KPw BI Jawa Timur',
    url: '/src/assets/images/bi_pahlawan_building_1793505599998.jpg'
  },
  {
    name: 'Eksterior & Lanskap BI Jatim',
    url: '/src/assets/images/bi_jatim_hero_1793505598999.jpg'
  }
];

export const ArtikelBeritaManagement: React.FC<ArtikelBeritaManagementProps> = ({
  currentUser,
  artikelList,
  onSaveArtikel,
  onDeleteArtikel
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ArtikelItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Lightbox Zoom State
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title?: string;
    category?: string;
    date?: string;
    location?: string;
    caption?: string;
  }>({
    isOpen: false,
    imageUrl: ''
  });

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    judul: string;
    kategori: string;
    tanggal: string;
    kabupaten: string;
    ringkasan: string;
    isiLengkap: string;
    gambar: string;
    penulis: string;
    statusPublikasi: 'Published' | 'Draft';
    tampilkanDiBeranda: boolean;
  }>({
    judul: '',
    kategori: 'Edukasi',
    tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    kabupaten: 'Kota Surabaya',
    ringkasan: '',
    isiLengkap: '',
    gambar: PRESET_PHOTOS[0].url,
    penulis: 'Humas & Tim EPML KPw BI Prov. Jatim',
    statusPublikasi: 'Published',
    tampilkanDiBeranda: true
  });

  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Statistics
  const totalArticles = artikelList.length;
  const publishedCount = artikelList.filter(a => a.statusPublikasi !== 'Draft').length;
  const berandaCount = artikelList.filter(a => a.tampilkanDiBeranda !== false).length;
  const draftCount = totalArticles - publishedCount;

  // Filtered List
  const filteredArticles = useMemo(() => {
    return artikelList.filter(art => {
      const matchSearch = 
        art.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.ringkasan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.kabupaten.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.penulis && art.penulis.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchKat = filterKategori === 'ALL' || art.kategori === filterKategori;
      const matchStatus = 
        filterStatus === 'ALL' || 
        (filterStatus === 'Published' && art.statusPublikasi !== 'Draft') ||
        (filterStatus === 'Draft' && art.statusPublikasi === 'Draft') ||
        (filterStatus === 'Beranda' && art.tampilkanDiBeranda !== false);

      return matchSearch && matchKat && matchStatus;
    });
  }, [artikelList, searchQuery, filterKategori, filterStatus]);

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      id: `ART-${Date.now().toString().slice(-4)}`,
      judul: '',
      kategori: 'Edukasi',
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      kabupaten: 'Kota Surabaya',
      ringkasan: '',
      isiLengkap: '',
      gambar: PRESET_PHOTOS[0].url,
      penulis: currentUser.namaLengkap ? `${currentUser.namaLengkap} (Humas BI Jatim)` : 'Humas & Tim EPML KPw BI Prov. Jatim',
      statusPublikasi: 'Published',
      tampilkanDiBeranda: true
    });
    setUploadFeedback(null);
    setIsFormModalOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (item: ArtikelItem) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      judul: item.judul,
      kategori: item.kategori,
      tanggal: item.tanggal,
      kabupaten: item.kabupaten,
      ringkasan: item.ringkasan,
      isiLengkap: item.isiLengkap || item.ringkasan,
      gambar: item.gambar,
      penulis: item.penulis || 'Humas & Tim EPML KPw BI Prov. Jatim',
      statusPublikasi: item.statusPublikasi || 'Published',
      tampilkanDiBeranda: item.tampilkanDiBeranda !== undefined ? item.tampilkanDiBeranda : true
    });
    setUploadFeedback(null);
    setIsFormModalOpen(true);
  };

  // Handle Photo File Upload (Convert to Base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadFeedback('Error: File yang diunggah harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, gambar: reader.result as string }));
        setUploadFeedback(`Foto berhasil diunggah (${(file.size / 1024).toFixed(1)} KB)! Resolusi disesuaikan untuk landing page.`);
      }
    };
    reader.onerror = () => {
      setUploadFeedback('Gagal memproses file foto. Silakan coba kembali.');
    };
    reader.readAsDataURL(file);
  };

  // Save Artikel Form Submission
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.ringkasan.trim()) {
      alert('Judul dan ringkasan artikel wajib diisi!');
      return;
    }

    const payload: ArtikelItem = {
      id: formData.id || editingItem?.id || `ART-${Date.now().toString().slice(-4)}`,
      judul: formData.judul.trim(),
      kategori: formData.kategori,
      tanggal: formData.tanggal,
      kabupaten: formData.kabupaten,
      ringkasan: formData.ringkasan.trim(),
      isiLengkap: formData.isiLengkap.trim() || formData.ringkasan.trim(),
      gambar: formData.gambar || PRESET_PHOTOS[0].url,
      penulis: formData.penulis.trim(),
      statusPublikasi: formData.statusPublikasi,
      tampilkanDiBeranda: formData.tampilkanDiBeranda,
      updatedAt: new Date().toISOString()
    };

    onSaveArtikel(payload);
    setIsFormModalOpen(false);
  };

  // Quick Toggle Tampilkan di Beranda
  const handleToggleBeranda = (item: ArtikelItem) => {
    const updated: ArtikelItem = {
      ...item,
      tampilkanDiBeranda: item.tampilkanDiBeranda === false ? true : false
    };
    onSaveArtikel(updated);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteArtikel(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner & Action */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit & Kontrol Utama Artikel & Berita EPML
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola publikasi, penulisan berita, unggah dan ganti foto dokumentasi untuk ditampilkan di dashboard depan.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Artikel & Berita Baru</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Artikel Terdaftar</span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalArticles}</p>
          <span className="text-[10px] text-slate-400">Database Humas EPML</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Tayang di Dashboard Depan</span>
          <p className="text-xl font-bold text-blue-900 dark:text-blue-400 mt-1">{berandaCount}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Aktif di Beranda Publik</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Status Publikasi (Live)</span>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{publishedCount}</p>
          <span className="text-[10px] text-slate-400">Published Resmi</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Draft / Peninjauan</span>
          <p className="text-xl font-bold text-amber-600 mt-1">{draftCount}</p>
          <span className="text-[10px] text-slate-400">Belum Terbit</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari judul, ringkasan, wilayah, penulis..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={filterKategori}
            onChange={e => setFilterKategori(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Semua Kategori</option>
            {KATEGORI_ARTIKEL_OPTIONS.map(kat => (
              <option key={kat} value={kat}>{kat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Semua Status</option>
            <option value="Published">Published Saja</option>
            <option value="Beranda">Tayang di Dashboard Depan</option>
            <option value="Draft">Draft Saja</option>
          </select>

          <span className="text-xs text-slate-500 font-medium pl-1">
            Menampilkan {filteredArticles.length} artikel
          </span>
        </div>
      </div>

      {/* Articles Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredArticles.map(art => (
          <div
            key={art.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            {/* Image Preview with click-to-enlarge */}
            <div>
              <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src={art.gambar}
                  alt={art.judul}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                  onClick={() => setLightboxData({
                    isOpen: true,
                    imageUrl: art.gambar,
                    title: art.judul,
                    category: art.kategori,
                    date: art.tanggal,
                    location: art.kabupaten,
                    caption: art.ringkasan
                  })}
                />
                
                {/* Overlay Click to Zoom Button */}
                <button
                  type="button"
                  onClick={() => setLightboxData({
                    isOpen: true,
                    imageUrl: art.gambar,
                    title: art.judul,
                    category: art.kategori,
                    date: art.tanggal,
                    location: art.kabupaten,
                    caption: art.ringkasan
                  })}
                  className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 hover:bg-black/90 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                  title="Klik untuk Memperbesar Foto"
                >
                  <ZoomIn className="w-3 h-3 text-amber-300" />
                  <span>Perbesar Foto</span>
                </button>

                {/* Top badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/90 text-white backdrop-blur-xs shadow-xs">
                    {art.kategori}
                  </span>
                  {art.tampilkanDiBeranda !== false ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" />
                      <span>Beranda Depan</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-600/90 text-white backdrop-blur-xs shadow-xs flex items-center gap-1">
                      <EyeOff className="w-2.5 h-2.5" />
                      <span>Arsip</span>
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-xs ${
                    art.statusPublikasi === 'Draft' 
                      ? 'bg-amber-500 text-slate-950 font-black' 
                      : 'bg-emerald-500/90 text-white'
                  }`}>
                    {art.statusPublikasi === 'Draft' ? 'DRAFT' : 'PUBLISHED'}
                  </span>
                </div>
              </div>

              {/* Content Information */}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-800 dark:text-blue-400" />
                    {art.tanggal}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3 h-3 text-red-500" />
                    {art.kabupaten}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-900 dark:group-hover:text-blue-400 transition-colors">
                  {art.judul}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {art.ringkasan}
                </p>

                {art.penulis && (
                  <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="truncate">Penulis: {art.penulis}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Card Action Footer */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleBeranda(art)}
                className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  art.tampilkanDiBeranda !== false
                    ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title={art.tampilkanDiBeranda !== false ? 'Klik untuk sembunyikan dari dashboard depan' : 'Klik untuk tampilkan di dashboard depan'}
              >
                {art.tampilkanDiBeranda !== false ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tayang Depan</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Tidak Tayang</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(art)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Edit Berita / Ganti Foto"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(art.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 transition-colors cursor-pointer"
                  title="Hapus Berita"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <Newspaper className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Tidak ada artikel atau berita yang sesuai filter
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter kategori untuk melihat berita lainnya.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilterKategori('ALL'); setFilterStatus('ALL'); }}
            className="px-3.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 dark:text-slate-200"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL FORM INPUT & EDIT ARTIKEL */}
      {/* ========================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
                  <Newspaper className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {editingItem ? 'Edit Artikel & Publikasi Berita EPML' : 'Form Input Artikel & Berita Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingItem ? `Memperbarui ID: ${editingItem.id}` : 'Tambahkan warta dokumentasi baru untuk ditampilkan di dashboard'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs">
              {/* Row 1: Judul Artikel */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Artikel & Berita *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Digitalisasi Santri Pesantren Mojokerto: Bantuan Smart Board & Agribisnis Hidroponik"
                  value={formData.judul}
                  onChange={e => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800 font-semibold"
                />
              </div>

              {/* Row 2: Kategori, Wilayah & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Pilar Bantuan *
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    {KATEGORI_ARTIKEL_OPTIONS.map(kat => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wilayah Kab/Kota (Jawa Timur) *
                  </label>
                  <select
                    value={formData.kabupaten}
                    onChange={e => setFormData({ ...formData, kabupaten: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {WILAYAH_JAWA_TIMUR.map(w => (
                      <option key={w.nama} value={w.nama}>{w.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pemberitaan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 15 Oktober 2026"
                    value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Row 3: Upload & Ganti Foto Pemberitaan (Fitur Utama yang diminta) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                    <span>Foto Dokumentasi Pemberitaan (Bisa Diupload & Diganti)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Resolusi optimal 16:9 / Full HD
                  </span>
                </div>

                {/* Current Image Preview & Change Options */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5 relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 h-36">
                    <img
                      src={formData.gambar}
                      alt="Pratinjau Foto"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxData({
                        isOpen: true,
                        imageUrl: formData.gambar,
                        title: formData.judul || 'Pratinjau Foto Artikel',
                        category: formData.kategori,
                        date: formData.tanggal,
                        location: formData.kabupaten,
                        caption: formData.ringkasan
                      })}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white text-xs font-semibold transition-opacity"
                    >
                      <ZoomIn className="w-4 h-4 text-amber-300" />
                      <span>Lihat Ukuran Penuh</span>
                    </button>
                  </div>

                  <div className="sm:col-span-7 space-y-2.5">
                    {/* Upload File Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Unggah Foto dari Komputer (File Baru / Ganti Foto):
                      </label>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 cursor-pointer font-semibold transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Pilih File Gambar Baru</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Or URL Input */}
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Atau masukkan tautan URL Foto:
                      </label>
                      <input
                        type="text"
                        placeholder="https://... atau /src/assets/images/..."
                        value={formData.gambar}
                        onChange={e => setFormData({ ...formData, gambar: e.target.value })}
                        className="w-full px-2.5 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Preset Foto BI:</span>
                      {PRESET_PHOTOS.map((p, pIdx) => (
                        <button
                          key={p.url}
                          type="button"
                          onClick={() => setFormData({ ...formData, gambar: p.url })}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            formData.gambar === p.url
                              ? 'bg-blue-900 text-white border-blue-900'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Preset #{pIdx + 1}
                        </button>
                      ))}
                    </div>

                    {uploadFeedback && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {uploadFeedback}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Ringkasan Berita (Tampil di Card Beranda) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ringkasan Berita (Tampil di Cuplikan Card Dashboard Depan) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Tuliskan ringkasan 2-3 kalimat mengenai kegiatan bantuan atau program yang diselenggarakan..."
                  value={formData.ringkasan}
                  onChange={e => setFormData({ ...formData, ringkasan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              {/* Row 5: Isi Lengkap Artikel / Berita */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Isi Lengkap Artikel & Narasi Berita (Modal Baca Selengkapnya)
                </label>
                <textarea
                  rows={5}
                  placeholder="Tuliskan isi lengkap artikel, rincian teknis, testimoni penerima bantuan, dan pernyataan dari pimpinan Bank Indonesia..."
                  value={formData.isiLengkap}
                  onChange={e => setFormData({ ...formData, isiLengkap: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800 leading-relaxed"
                />
              </div>

              {/* Row 6: Penulis, Status & Kontrol Publikasi Beranda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Redaksi / Penulis Berita
                  </label>
                  <input
                    type="text"
                    value={formData.penulis}
                    onChange={e => setFormData({ ...formData, penulis: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Publikasi
                  </label>
                  <select
                    value={formData.statusPublikasi}
                    onChange={e => setFormData({ ...formData, statusPublikasi: e.target.value as 'Published' | 'Draft' })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <option value="Published">Published (Tayang Publik)</option>
                    <option value="Draft">Draft (Simpan Sementara)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tampilkanDiBeranda}
                      onChange={e => setFormData({ ...formData, tampilkanDiBeranda: e.target.checked })}
                      className="rounded text-blue-900 focus:ring-blue-800"
                    />
                    <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      Tampilkan di Dashboard Depan
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Simpan Perubahan Artikel' : 'Publikasikan Artikel Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI HAPUS ARTIKEL */}
      {/* ========================================================= */}
      {deleteConfirmId && (() => {
        const targetArtikel = artikelList.find(a => a.id === deleteConfirmId);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setDeleteConfirmId(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
                  <Trash2 className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                  Peringatan Hapus Artikel & Berita
                </span>
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Apakah benar data ini dihapus ?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Artikel yang dihapus tidak akan ditampilkan lagi pada halaman depan publik maupun arsip liputan EPML.
                </p>
              </div>

              {targetArtikel && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Judul Artikel & Berita:
                  </span>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {targetArtikel.judul}
                  </p>
                  <p className="text-[11px] font-mono font-semibold text-blue-900 dark:text-blue-300">
                    ID: {targetArtikel.id} • Kategori: {targetArtikel.kategori}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
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

      {/* ========================================================= */}
      {/* LIGHTBOX MODAL PERBESAR FOTO */}
      {/* ========================================================= */}
      <ImageLightboxModal
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.imageUrl}
        title={lightboxData.title}
        category={lightboxData.category}
        date={lightboxData.date}
        location={lightboxData.location}
        caption={lightboxData.caption}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
