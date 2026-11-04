/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { WILAYAH_JAWA_TIMUR, WILAYAH_KERJA_KPW_JATIM } from '../../data/initialData';
import { StorageService } from '../../services/storageService';
import {
  DRIVE_PHOTO_ARCHIVE_ROOT_URL,
  syncRecipientPhotosToGoogleDrive,
  getActiveBudgetYear,
  setActiveBudgetYear,
  getYearlyFoldersRegistry,
  ensureYearlyArchiveFoldersForYear,
  getAccessToken
} from '../../services/googleDriveService';
import { GoogleDriveConnectButton } from '../common/GoogleDriveConnectButton';
import { MultiPhotoUploader } from '../common/MultiPhotoUploader';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { QrStickerDesignCard } from './PrintQrStickerModal';
import { 
  BantuanItem, 
  BentukBantuan, 
  ItemBarangVendor, 
  JenisBarang, 
  KategoriBantuan, 
  KategoriSumberBantuan,
  KategoriLembaga, 
  RekananVendorBantuan,
  SpesifikasiItemBarang,
  StatusAsesmen, 
  StatusKondisiFisik, 
  StatusTahap,
  VendorItem 
} from '../../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Upload, 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Image as ImageIcon,
  Building2,
  Tag,
  Check,
  CheckSquare,
  Square,
  Phone,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  Package,
  Coins,
  QrCode,
  FolderOpen,
  ExternalLink
} from 'lucide-react';

interface BantuanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: BantuanItem) => void;
  initialItem?: BantuanItem | null;
  actorName: string;
}

export const BantuanFormModal: React.FC<BantuanFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  actorName
}) => {
  const [formData, setFormData] = useState<Partial<BantuanItem>>(() => {
    const activeYr = getActiveBudgetYear();
    return {
      id: `EPML-JTM-${activeYr}-${Math.floor(100 + Math.random() * 900)}`,
      namaPenerima: '',
      picAsesmen: actorName || 'Dimas Wicaksono, S.E.',
      kategoriInisiatif: 'BI Driven',
      statusAsesmen: 'Disetujui',
      alamat: '',
      kabupatenKota: 'Kota Surabaya',
      latitude: -7.2575,
      longitude: 112.7521,
      noHp: '081234567890',
      kategoriLembaga: 'Sekolah / Pesantren',
      kategoriBantuan: 'Edukasi',
      bentukBantuan: 'Barang',
      jenisBarang: 'Personal Computer / Laptop',
      detailBantuan: '',
      qty: 1,
      satuan: 'Unit',
      vendorPenyedia: '',
      hargaSatuan: 0,
      nominalBantuan: 0,
      statusTahap: 'Pengadaan',
      statusKondisiFisik: 'Belum Diterima / Tahap Asesmen',
      catatanKondisiFisik: '',
      tanggalPenyaluran: new Date().toISOString().slice(0, 10),
      tanggalJadwalMonitoring: '',
      triwulan: 'Q2',
      tahun: activeYr,
      fotoPenerimaUrl: '',
      buktiPenyaluranVendorUrl: '',
      buktiSerahTerimaBastUrl: '',
      fotoMonitoringUrl: ''
    };
  });

  const [vendorItems, setVendorItems] = useState<ItemBarangVendor[]>([]);

  // Registered vendors in system for quick selection
  const [registeredVendors, setRegisteredVendors] = useState<VendorItem[]>(() => StorageService.getVendors());

  // Multiple Choice Jenis Barang
  const [selectedJenisBarang, setSelectedJenisBarang] = useState<JenisBarang[]>(['Personal Computer / Laptop']);

  // Dedicated Specifications for EACH selected item type
  const [spesifikasiList, setSpesifikasiList] = useState<SpesifikasiItemBarang[]>([
    {
      jenisBarang: 'Personal Computer / Laptop',
      deskripsi: ''
    }
  ]);

  // Nested Item definition for vendor
  interface FormVendorItem {
    id: string;
    namaBarang: string;
    spesifikasi: string;
    qty: number | '';
    satuan: string;
    hargaSatuan: number | '';
  }

  // Multi-Vendor list with nested items for this recipient
  interface FormRekananVendor {
    id: string;
    namaVendor: string;
    kategoriPengadaan: (JenisBarang | string)[];
    kontak: string;
    pic: string;
    kategoriPajak: 'PKP' | 'Non-PKP';
    catatan?: string;
    items: FormVendorItem[];
  }

  const [rekananVendors, setRekananVendors] = useState<FormRekananVendor[]>([
    {
      id: `vnd-${Date.now()}-1`,
      namaVendor: '',
      kategoriPengadaan: ['Personal Computer / Laptop'],
      kontak: '',
      pic: '',
      kategoriPajak: 'PKP',
      catatan: '',
      items: [
        {
          id: `itm-${Date.now()}-1`,
          namaBarang: 'Personal Computer / Laptop',
          spesifikasi: '',
          qty: '',
          satuan: 'Unit',
          hargaSatuan: ''
        }
      ]
    }
  ]);

  // Documentation Photo Lists (Up to 7 photos for each stage)
  const [fotoPenerimaList, setFotoPenerimaList] = useState<string[]>([]);
  const [buktiPenyaluranVendorList, setBuktiPenyaluranVendorList] = useState<string[]>([]);
  const [buktiSerahTerimaBastList, setBuktiSerahTerimaBastList] = useState<string[]>([]);
  const [fotoMonitoringList, setFotoMonitoringList] = useState<string[]>([]);

  // Lightbox Zoom Modal State
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; url: string; caption: string }>({
    isOpen: false,
    url: '',
    caption: ''
  });
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState('');

  useEffect(() => {
    setRegisteredVendors(StorageService.getVendors());

    if (initialItem) {
      setFormData(initialItem);
      setVendorItems(initialItem.daftarBarangVendor || []);

      // Initialize photo lists (up to 7 photos per category)
      setFotoPenerimaList(
        initialItem.fotoPenerimaList && initialItem.fotoPenerimaList.length > 0
          ? initialItem.fotoPenerimaList
          : (initialItem.fotoPenerimaUrl ? [initialItem.fotoPenerimaUrl] : [])
      );
      setBuktiPenyaluranVendorList(
        initialItem.buktiPenyaluranVendorList && initialItem.buktiPenyaluranVendorList.length > 0
          ? initialItem.buktiPenyaluranVendorList
          : (initialItem.buktiPenyaluranVendorUrl ? [initialItem.buktiPenyaluranVendorUrl] : [])
      );
      setBuktiSerahTerimaBastList(
        initialItem.buktiSerahTerimaBastList && initialItem.buktiSerahTerimaBastList.length > 0
          ? initialItem.buktiSerahTerimaBastList
          : (initialItem.buktiSerahTerimaBastUrl ? [initialItem.buktiSerahTerimaBastUrl] : [])
      );
      setFotoMonitoringList(
        initialItem.fotoMonitoringList && initialItem.fotoMonitoringList.length > 0
          ? initialItem.fotoMonitoringList
          : (initialItem.fotoMonitoringUrl ? [initialItem.fotoMonitoringUrl] : [])
      );

      // Initialize multiple choice Jenis Barang
      const jenisArr: JenisBarang[] = (initialItem.daftarJenisBarang && initialItem.daftarJenisBarang.length > 0)
        ? initialItem.daftarJenisBarang
        : (initialItem.jenisBarang ? [initialItem.jenisBarang] : ['Personal Computer / Laptop']);
      setSelectedJenisBarang(jenisArr);

      // Initialize specifications for each selected item type
      if (initialItem.spesifikasiBarangList && initialItem.spesifikasiBarangList.length > 0) {
        setSpesifikasiList(initialItem.spesifikasiBarangList);
      } else {
        const specs: SpesifikasiItemBarang[] = jenisArr.map(j => ({
          jenisBarang: j,
          deskripsi: initialItem.detailBantuan || ''
        }));
        setSpesifikasiList(specs);
      }

      // Initialize multi-vendor list with nested items
      if (initialItem.daftarVendor && initialItem.daftarVendor.length > 0) {
        const mappedVendors: FormRekananVendor[] = initialItem.daftarVendor.map((v, vIdx) => {
          let vItems: FormVendorItem[] = [];
          if (v.items && v.items.length > 0) {
            vItems = v.items.map((it, itmIdx) => ({
              id: it.id || `itm-${vIdx}-${itmIdx}`,
              namaBarang: it.namaBarang,
              spesifikasi: it.spesifikasi || '',
              qty: it.qty,
              satuan: it.satuan || 'Unit',
              hargaSatuan: it.hargaSatuan
            }));
          } else if (vIdx === 0 && initialItem.daftarBarangVendor && initialItem.daftarBarangVendor.length > 0) {
            vItems = initialItem.daftarBarangVendor.map((it, itmIdx) => ({
              id: `itm-${vIdx}-${itmIdx}`,
              namaBarang: it.namaBarang,
              spesifikasi: it.spesifikasi || '',
              qty: it.qty,
              satuan: 'Unit',
              hargaSatuan: it.hargaSatuan
            }));
          } else {
            vItems = [
              {
                id: `itm-${Date.now()}-${vIdx}-1`,
                namaBarang: (v.kategoriPengadaan && v.kategoriPengadaan[0]) || jenisArr[0] || 'Barang Bantuan',
                spesifikasi: '',
                qty: initialItem.qty || '',
                satuan: initialItem.satuan || 'Unit',
                hargaSatuan: initialItem.hargaSatuan || ''
              }
            ];
          }

          return {
            id: v.id || `vnd-${Date.now()}-${vIdx}`,
            namaVendor: v.namaVendor || '',
            kategoriPengadaan: v.kategoriPengadaan && v.kategoriPengadaan.length > 0 ? v.kategoriPengadaan : [...jenisArr],
            kontak: v.kontak || '',
            pic: v.pic || '',
            kategoriPajak: v.kategoriPajak || 'PKP',
            catatan: v.catatan || '',
            items: vItems
          };
        });
        setRekananVendors(mappedVendors);
      } else if (initialItem.vendorPenyedia) {
        let vItems: FormVendorItem[] = [];
        if (initialItem.daftarBarangVendor && initialItem.daftarBarangVendor.length > 0) {
          vItems = initialItem.daftarBarangVendor.map((it, itmIdx) => ({
            id: `itm-0-${itmIdx}`,
            namaBarang: it.namaBarang,
            spesifikasi: it.spesifikasi || '',
            qty: it.qty,
            satuan: 'Unit',
            hargaSatuan: it.hargaSatuan
          }));
        } else {
          vItems = [
            {
              id: `itm-${Date.now()}-1`,
              namaBarang: jenisArr[0] || 'Barang Bantuan',
              spesifikasi: '',
              qty: initialItem.qty || '',
              satuan: initialItem.satuan || 'Unit',
              hargaSatuan: initialItem.hargaSatuan || ''
            }
          ];
        }

        setRekananVendors([
          {
            id: `vnd-${Date.now()}-1`,
            namaVendor: initialItem.vendorPenyedia,
            kategoriPengadaan: [...jenisArr],
            kontak: '',
            pic: '',
            kategoriPajak: 'PKP',
            catatan: '',
            items: vItems
          }
        ]);
      } else {
        setRekananVendors([
          {
            id: `vnd-${Date.now()}-1`,
            namaVendor: '',
            kategoriPengadaan: [...jenisArr],
            kontak: '',
            pic: '',
            kategoriPajak: 'PKP',
            catatan: '',
            items: [
              {
                id: `itm-${Date.now()}-1`,
                namaBarang: jenisArr[0] || 'Personal Computer / Laptop',
                spesifikasi: '',
                qty: '',
                satuan: 'Unit',
                hargaSatuan: ''
              }
            ]
          }
        ]);
      }
    } else {
      const activeYr = getActiveBudgetYear();
      setFormData({
        id: `EPML-JTM-${activeYr}-${Math.floor(100 + Math.random() * 900)}`,
        namaPenerima: '',
        picAsesmen: actorName || 'Dimas Wicaksono, S.E.',
        kategoriInisiatif: 'BI Driven',
        statusAsesmen: 'Disetujui',
        alamat: '',
        kabupatenKota: 'Kota Surabaya',
        latitude: -7.2575,
        longitude: 112.7521,
        noHp: '081234567890',
        kategoriLembaga: 'Sekolah / Pesantren',
        kategoriBantuan: 'Edukasi',
        bentukBantuan: 'Barang',
        jenisBarang: 'Personal Computer / Laptop',
        detailBantuan: '',
        qty: 1,
        satuan: 'Unit',
        vendorPenyedia: '',
        hargaSatuan: 0,
        nominalBantuan: 0,
        statusTahap: 'Pengadaan',
        statusKondisiFisik: 'Belum Diterima / Tahap Asesmen',
        catatanKondisiFisik: '',
        tanggalPenyaluran: new Date().toISOString().slice(0, 10),
        tanggalJadwalMonitoring: '',
        triwulan: 'Q2',
        tahun: activeYr,
        fotoPenerimaUrl: '',
        buktiPenyaluranVendorUrl: '',
        buktiSerahTerimaBastUrl: '',
        fotoMonitoringUrl: ''
      });
      setVendorItems([]);
      setSelectedJenisBarang(['Personal Computer / Laptop']);
      setSpesifikasiList([
        {
          jenisBarang: 'Personal Computer / Laptop',
          deskripsi: ''
        }
      ]);
      setRekananVendors([
        {
          id: `vnd-${Date.now()}-1`,
          namaVendor: '',
          kategoriPengadaan: ['Personal Computer / Laptop'],
          kontak: '',
          pic: '',
          kategoriPajak: 'PKP',
          catatan: '',
          items: [
            {
              id: `itm-${Date.now()}-1`,
              namaBarang: 'Personal Computer / Laptop',
              spesifikasi: '',
              qty: '',
              satuan: 'Unit',
              hargaSatuan: ''
            }
          ]
        }
      ]);
      setFotoPenerimaList([]);
      setBuktiPenyaluranVendorList([]);
      setBuktiSerahTerimaBastList([]);
      setFotoMonitoringList([]);
    }
  }, [initialItem, isOpen, actorName]);

  // Real-time calculated Total Nominal from all vendors and items
  const totalNominalBantuan = useMemo(() => {
    let total = 0;
    rekananVendors.forEach(vnd => {
      (vnd.items || []).forEach(itm => {
        const q = typeof itm.qty === 'number' ? itm.qty : parseInt(String(itm.qty), 10) || 0;
        const h = typeof itm.hargaSatuan === 'number' ? itm.hargaSatuan : parseInt(String(itm.hargaSatuan), 10) || 0;
        total += q * h;
      });
    });
    return total;
  }, [rekananVendors]);

  // Real-time calculated Total QTY from all vendor items
  const totalQtyBantuan = useMemo(() => {
    let total = 0;
    rekananVendors.forEach(vnd => {
      (vnd.items || []).forEach(itm => {
        const q = typeof itm.qty === 'number' ? itm.qty : parseInt(String(itm.qty), 10) || 0;
        total += q;
      });
    });
    return total || 1;
  }, [rekananVendors]);

  if (!isOpen) return null;

  // Auto update coordinates when Kabupaten changes
  const handleKabupatenChange = (kab: string) => {
    const wil = WILAYAH_JAWA_TIMUR.find(w => w.nama === kab);
    setFormData(prev => ({
      ...prev,
      kabupatenKota: kab,
      latitude: wil ? wil.lat : prev.latitude,
      longitude: wil ? wil.lng : prev.longitude
    }));
  };

  // Handle Multiple Choice Jenis Barang
  const handleToggleJenisBarang = (item: JenisBarang) => {
    const isSelected = selectedJenisBarang.includes(item);
    if (isSelected) {
      if (selectedJenisBarang.length === 1) return; // minimal 1 jenis barang terpilih
      const updated = selectedJenisBarang.filter(j => j !== item);
      setSelectedJenisBarang(updated);
      setSpesifikasiList(prev => prev.filter(s => s.jenisBarang !== item));
    } else {
      const updated = [...selectedJenisBarang, item];
      setSelectedJenisBarang(updated);
      setSpesifikasiList(prev => [
        ...prev,
        {
          jenisBarang: item,
          deskripsi: ''
        }
      ]);
    }
  };

  // Handle update specification description for an item
  const handleUpdateSpesifikasi = (jenis: JenisBarang, deskripsi: string) => {
    setSpesifikasiList(prev => {
      const exists = prev.some(s => s.jenisBarang === jenis);
      if (!exists) {
        return [...prev, { jenisBarang: jenis, deskripsi }];
      }
      return prev.map(s => s.jenisBarang === jenis ? { ...s, deskripsi } : s);
    });
  };

  // Multi-Vendor Actions
  const handleAddVendor = () => {
    setRekananVendors(prev => [
      ...prev,
      {
        id: `vnd-${Date.now()}-${prev.length + 1}`,
        namaVendor: '',
        kategoriPengadaan: [...selectedJenisBarang],
        kontak: '',
        pic: '',
        kategoriPajak: 'PKP',
        catatan: '',
        items: [
          {
            id: `itm-${Date.now()}-1`,
            namaBarang: selectedJenisBarang[0] || 'Personal Computer / Laptop',
            spesifikasi: '',
            qty: '',
            satuan: 'Unit',
            hargaSatuan: ''
          }
        ]
      }
    ]);
  };

  const handleRemoveVendor = (index: number) => {
    if (rekananVendors.length <= 1) {
      setRekananVendors([
        {
          id: `vnd-${Date.now()}-1`,
          namaVendor: '',
          kategoriPengadaan: [...selectedJenisBarang],
          kontak: '',
          pic: '',
          kategoriPajak: 'PKP',
          catatan: '',
          items: [
            {
              id: `itm-${Date.now()}-1`,
              namaBarang: selectedJenisBarang[0] || 'Personal Computer / Laptop',
              spesifikasi: '',
              qty: '',
              satuan: 'Unit',
              hargaSatuan: ''
            }
          ]
        }
      ]);
      return;
    }
    setRekananVendors(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateVendorField = (index: number, field: keyof FormRekananVendor, value: unknown) => {
    setRekananVendors(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const handleUpdateVendor = handleUpdateVendorField;

  const handleSelectRegisteredVendor = (index: number, vendorName: string) => {
    const match = registeredVendors.find(v => v.namaVendor === vendorName);
    if (match) {
      const matchedCategories: (JenisBarang | string)[] = [];
      JENIS_BARANG_OPTIONS.forEach(opt => {
        if (match.barangJasa.toLowerCase().includes(opt.toLowerCase())) {
          matchedCategories.push(opt);
        }
      });
      const finalCats = matchedCategories.length > 0 ? matchedCategories : [...selectedJenisBarang];

      setRekananVendors(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          namaVendor: match.namaVendor,
          kontak: match.noKontak || match.email || '',
          pic: match.namaPic || '',
          kategoriPajak: match.kategoriVendor || 'PKP',
          kategoriPengadaan: finalCats
        };
        return next;
      });
    } else {
      handleUpdateVendorField(index, 'namaVendor', vendorName);
    }
  };

  const handleToggleVendorKategori = (vendorIdx: number, cat: JenisBarang) => {
    setRekananVendors(prev => {
      const next = [...prev];
      const currentCats = next[vendorIdx].kategoriPengadaan || [];
      const exists = currentCats.includes(cat);
      const updatedCats = exists
        ? currentCats.filter(c => c !== cat)
        : [...currentCats, cat];
      next[vendorIdx] = { ...next[vendorIdx], kategoriPengadaan: updatedCats };
      return next;
    });
  };

  const handleSyncVendorKategoriWithBantuan = (vendorIdx: number) => {
    setRekananVendors(prev => {
      const next = [...prev];
      next[vendorIdx] = { ...next[vendorIdx], kategoriPengadaan: [...selectedJenisBarang] };
      return next;
    });
  };

  // Manage items directly under each vendor
  const handleAddItemToVendor = (vendorIdx: number) => {
    setRekananVendors(prev => {
      const next = [...prev];
      const vendor = next[vendorIdx];
      const defaultItemName = (vendor.kategoriPengadaan && vendor.kategoriPengadaan[0]) || selectedJenisBarang[0] || 'Barang Bantuan';
      const newItem: FormVendorItem = {
        id: `itm-${Date.now()}-${(vendor.items || []).length + 1}`,
        namaBarang: defaultItemName,
        spesifikasi: '',
        qty: '',
        satuan: 'Unit',
        hargaSatuan: ''
      };
      next[vendorIdx] = {
        ...vendor,
        items: [...(vendor.items || []), newItem]
      };
      return next;
    });
  };

  const handleRemoveItemFromVendor = (vendorIdx: number, itemIdx: number) => {
    setRekananVendors(prev => {
      const next = [...prev];
      const vendor = next[vendorIdx];
      const currentItems = vendor.items || [];
      if (currentItems.length <= 1) {
        next[vendorIdx] = {
          ...vendor,
          items: [
            {
              id: `itm-${Date.now()}-1`,
              namaBarang: '',
              spesifikasi: '',
              qty: '',
              satuan: 'Unit',
              hargaSatuan: ''
            }
          ]
        };
        return next;
      }
      next[vendorIdx] = {
        ...vendor,
        items: currentItems.filter((_, i) => i !== itemIdx)
      };
      return next;
    });
  };

  const handleUpdateVendorItem = (
    vendorIdx: number,
    itemIdx: number,
    field: keyof FormVendorItem,
    value: any
  ) => {
    setRekananVendors(prev => {
      const next = [...prev];
      const vendor = next[vendorIdx];
      const currentItems = [...(vendor.items || [])];
      if (!currentItems[itemIdx]) return prev;
      currentItems[itemIdx] = {
        ...currentItems[itemIdx],
        [field]: value
      };
      next[vendorIdx] = {
        ...vendor,
        items: currentItems
      };
      return next;
    });
  };

  // Handle simulated photo upload via FileReader
  const handlePhotoFileUpload = (field: 'fotoPenerimaUrl' | 'buktiPenyaluranVendorUrl' | 'buktiSerahTerimaBastUrl' | 'fotoMonitoringUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({ ...prev, [field]: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPenerima || !formData.id) return;

    // Collect all vendor items
    const allVendorItems: ItemBarangVendor[] = [];
    const cleanedDaftarVendor: RekananVendorBantuan[] = rekananVendors.map(vnd => {
      const vItems: ItemBarangVendor[] = (vnd.items || []).map(itm => {
        const q = typeof itm.qty === 'number' ? itm.qty : parseInt(String(itm.qty), 10) || 1;
        const h = typeof itm.hargaSatuan === 'number' ? itm.hargaSatuan : parseInt(String(itm.hargaSatuan), 10) || 0;
        const itemObj: ItemBarangVendor = {
          id: itm.id,
          namaBarang: itm.namaBarang || (vnd.kategoriPengadaan && vnd.kategoriPengadaan[0]) || 'Barang Bantuan',
          spesifikasi: itm.spesifikasi || '',
          qty: q,
          satuan: itm.satuan || 'Unit',
          hargaSatuan: h,
          subtotal: q * h
        };
        allVendorItems.push(itemObj);
        return itemObj;
      });

      const vNominal = vItems.reduce((acc, curr) => acc + (curr.qty * curr.hargaSatuan), 0);
      return {
        id: vnd.id,
        namaVendor: vnd.namaVendor,
        kategoriPengadaan: vnd.kategoriPengadaan,
        kontak: vnd.kontak,
        pic: vnd.pic,
        kategoriPajak: vnd.kategoriPajak,
        nominalAlokasi: vNominal,
        items: vItems,
        catatan: vnd.catatan
      };
    });

    // Build compound detailBantuan from individual specifications
    let combinedDetailBantuan = formData.detailBantuan || '';
    if (formData.bentukBantuan === 'Barang' && spesifikasiList.length > 0) {
      const details = spesifikasiList
        .filter(s => s.deskripsi && s.deskripsi.trim().length > 0)
        .map(s => `[${s.jenisBarang}]: ${s.deskripsi.trim()}`);
      if (details.length > 0) {
        combinedDetailBantuan = details.join('; ');
      } else {
        combinedDetailBantuan = spesifikasiList.map(s => s.jenisBarang).join(', ');
      }
    }

    // Build string representation of vendors for backward compatibility
    const validVendorNames = rekananVendors
      .map(v => v.namaVendor.trim())
      .filter(Boolean);
    const vendorSummary = validVendorNames.length > 0 
      ? validVendorNames.join(', ') 
      : (formData.vendorPenyedia || 'Belum Ditentukan');

    const payload: BantuanItem = {
      id: formData.id!,
      namaPenerima: formData.namaPenerima!,
      picAsesmen: formData.picAsesmen || actorName,
      kategoriInisiatif: (formData.kategoriInisiatif as KategoriSumberBantuan) || 'BI Driven',
      statusAsesmen: (formData.statusAsesmen as StatusAsesmen) || 'Disetujui',
      alamat: formData.alamat || '',
      kabupatenKota: formData.kabupatenKota || 'Kota Surabaya',
      latitude: Number(formData.latitude) || -7.2575,
      longitude: Number(formData.longitude) || 112.7521,
      noHp: formData.noHp || '',
      kategoriLembaga: (formData.kategoriLembaga as KategoriLembaga) || 'Sekolah / Pesantren',
      kategoriBantuan: (formData.kategoriBantuan as KategoriBantuan) || 'Edukasi',
      bentukBantuan: (formData.bentukBantuan as BentukBantuan) || 'Barang',
      jenisBarang: selectedJenisBarang[0] || 'Personal Computer / Laptop',
      daftarJenisBarang: selectedJenisBarang,
      spesifikasiBarangList: spesifikasiList,
      detailBantuan: combinedDetailBantuan,
      qty: totalQtyBantuan,
      satuan: (rekananVendors[0]?.items[0]?.satuan) || formData.satuan || 'Unit',
      vendorPenyedia: vendorSummary,
      daftarVendor: cleanedDaftarVendor,
      daftarBarangVendor: allVendorItems,
      hargaSatuan: allVendorItems[0]?.hargaSatuan || 0,
      nominalBantuan: totalNominalBantuan,
      statusTahap: (formData.statusTahap as StatusTahap) || 'Pengadaan',
      statusKondisiFisik: (formData.statusKondisiFisik as StatusKondisiFisik) || 'Belum Diterima / Tahap Asesmen',
      catatanKondisiFisik: formData.catatanKondisiFisik || '',
      tanggalPenyaluran: formData.tanggalPenyaluran || new Date().toISOString().slice(0, 10),
      tanggalJadwalMonitoring: formData.tanggalJadwalMonitoring || '',
      triwulan: (formData.triwulan as 'Q1' | 'Q2' | 'Q3' | 'Q4') || 'Q2',
      tahun: Number(formData.tahun) || new Date().getFullYear(),
      fotoPenerimaUrl: fotoPenerimaList[0] || formData.fotoPenerimaUrl || '',
      fotoPenerimaList: fotoPenerimaList,
      buktiPenyaluranVendorUrl: buktiPenyaluranVendorList[0] || formData.buktiPenyaluranVendorUrl || '',
      buktiPenyaluranVendorList: buktiPenyaluranVendorList,
      buktiSerahTerimaBastUrl: buktiSerahTerimaBastList[0] || formData.buktiSerahTerimaBastUrl || '',
      buktiSerahTerimaBastList: buktiSerahTerimaBastList,
      fotoMonitoringUrl: fotoMonitoringList[0] || formData.fotoMonitoringUrl || '',
      fotoMonitoringList: fotoMonitoringList,
      driveYearFolderId: initialItem?.driveYearFolderId || formData.driveYearFolderId,
      driveYearFolderName: initialItem?.driveYearFolderName || formData.driveYearFolderName,
      driveRecipientFolderId: initialItem?.driveRecipientFolderId || formData.driveRecipientFolderId,
      driveRecipientFolderName: initialItem?.driveRecipientFolderName || formData.driveRecipientFolderName,
      driveRecipientFolderUrl: initialItem?.driveRecipientFolderUrl || formData.driveRecipientFolderUrl,
      driveUploadedPhotoMap: initialItem?.driveUploadedPhotoMap || formData.driveUploadedPhotoMap || {},
      driveLastSyncedAt: initialItem?.driveLastSyncedAt || formData.driveLastSyncedAt,
      kondisiPerItem: initialItem?.kondisiPerItem,
      riwayatAktivitas: initialItem?.riwayatAktivitas || [],
      createdAt: initialItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const finalizeSave = async () => {
      setIsSyncingDrive(true);
      try {
        // Automatically create folder "EPML {tahun}" -> "{namaPenerima}" in Google Drive & upload all photos
        try {
          const driveRes = await syncRecipientPhotosToGoogleDrive(
            payload,
            msg => setDriveSyncStatus(msg),
            true
          );
          if (driveRes.synced) {
            payload.driveYearFolderId = driveRes.yearFolderId;
            payload.driveYearFolderName = driveRes.yearFolderName;
            payload.driveRecipientFolderId = driveRes.recipientFolderId;
            payload.driveRecipientFolderName = driveRes.recipientFolderName;
            payload.driveRecipientFolderUrl = driveRes.recipientFolderUrl;
            payload.driveUploadedPhotoMap = driveRes.uploadedPhotoMap;
            payload.driveLastSyncedAt = new Date().toLocaleString('id-ID');
          }
        } catch (driveErr) {
          console.warn('Google Drive sync skipped or deferred:', driveErr);
        }

        const qrDataUrl = await StorageService.generateQrCodeDataUrl(payload);
        if (qrDataUrl) {
          payload.qrCodeDataUrl = qrDataUrl;
        }
        onSave(payload);
        onClose();
      } finally {
        setIsSyncingDrive(false);
        setDriveSyncStatus('');
      }
    };

    finalizeSave();
  };

  const JENIS_BARANG_OPTIONS: JenisBarang[] = [
    'Elektronik',
    'Furniture',
    'Gadget',
    'Personal Computer / Laptop',
    'Inventaris',
    'Alat Percetakan',
    'Alat Pembelajaran',
    'Mesin',
    'Alat Kesehatan',
    'Kendaraan Operasional',
    'Peralatan Lainnya'
  ];

  const TAHAP_OPTIONS: StatusTahap[] = [
    'Asesmen',
    'Usulan',
    'Pengadaan',
    'Pengiriman',
    'Selesai Dikirim',
    'Barang Diterima',
    'Penjadwalan Monitoring Bantuan'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {initialItem ? 'Edit Data Penyaluran Bantuan EPML' : 'Form Input Penerima Bantuan EPML Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pencatatan data penerima, geo-tagging, rincian vendor, dan tahapan distribusi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* SECTION 1: IDENTITAS & ASESMEN */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400 pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
              1. Identitas Bantuan & Status Asesmen
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor / ID Bantuan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lembaga / Penerima *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Koperasi Tani Kopi Ijen Makmur"
                  value={formData.namaPenerima}
                  onChange={e => setFormData({ ...formData, namaPenerima: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PIC Asesmen Bantuan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.picAsesmen}
                  onChange={e => setFormData({ ...formData, picAsesmen: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Bantuan (BI Driven / Eksternal) *
                </label>
                <select
                  value={formData.kategoriInisiatif || 'BI Driven'}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      kategoriInisiatif: e.target.value as KategoriSumberBantuan
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="BI Driven">BI Driven</option>
                  <option value="Eksternal">Eksternal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Asesmen
                </label>
                <select
                  value={formData.statusAsesmen}
                  onChange={e => setFormData({ ...formData, statusAsesmen: e.target.value as StatusAsesmen })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Asesmen">Asesmen</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                  <option value="Menunggu Tindak Lanjut">Menunggu Tindak Lanjut</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Lembaga
                </label>
                <select
                  value={formData.kategoriLembaga}
                  onChange={e => setFormData({ ...formData, kategoriLembaga: e.target.value as KategoriLembaga })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Sekolah / Pesantren">Sekolah / Pesantren</option>
                  <option value="UMKM / Koperasi">UMKM / Koperasi</option>
                  <option value="Kelompok Tani / Nelayan">Kelompok Tani / Nelayan</option>
                  <option value="Komunitas Lingkungan">Komunitas Lingkungan</option>
                  <option value="Yayasan Sosial">Yayasan Sosial</option>
                  <option value="Lembaga Keagamaan">Lembaga Keagamaan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No. HP Penerima (WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="081234567890"
                  value={formData.noHp}
                  onChange={e => setFormData({ ...formData, noHp: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: LOKASI & GEO-TAGGING PRESISI */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400 pb-2 mb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>2. Lokasi & Geo-Tagging Presisi Jawa Timur</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kabupaten / Kota *
                </label>
                <select
                  value={formData.kabupatenKota}
                  onChange={e => handleKabupatenChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <optgroup label="13 Wilayah Kerja KPw Bank Indonesia Prov. Jatim">
                    {WILAYAH_KERJA_KPW_JATIM.map(nama => (
                      <option key={nama} value={nama}>
                        {nama}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Wilayah Jawa Timur Lainnya">
                    {WILAYAH_JAWA_TIMUR.filter(w => !WILAYAH_KERJA_KPW_JATIM.includes(w.nama as any)).map(w => (
                      <option key={w.nama} value={w.nama}>
                        {w.nama}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap Penerima *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama jalan, nomor, RT/RW, Dusun, Desa/Kelurahan, Kecamatan..."
                  value={formData.alamat}
                  onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: RINCIAN BANTUAN & VENDOR PENYEDIA */}
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>3. Rincian Bantuan, Spesifikasi Barang & Rekanan Vendor</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Dukungan Multi-Item & Multi-Vendor
              </span>
            </div>

            {/* Row 1: Kategori & Bentuk Bantuan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Bantuan EPML *
                </label>
                <select
                  value={formData.kategoriBantuan}
                  onChange={e => setFormData({ ...formData, kategoriBantuan: e.target.value as KategoriBantuan })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Edukasi">Edukasi</option>
                  <option value="Pemberdayaan Masyarakat">Pemberdayaan Masyarakat</option>
                  <option value="Lingkungan">Lingkungan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bentuk Bantuan *
                </label>
                <select
                  value={formData.bentukBantuan}
                  onChange={e => setFormData({ ...formData, bentukBantuan: e.target.value as BentukBantuan })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Barang">Barang (Fisik)</option>
                  <option value="Jasa">Jasa (Pelatihan / Pendampingan / Konsultasi)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Jenis Barang (Multiple Choice) or Durasi Jasa */}
            {formData.bentukBantuan === 'Barang' ? (
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                      Jenis Barang (Bisa Dipilih Lebih Dari 1 / Multiple Choice) *
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pilih satu atau beberapa jenis barang bantuan. Setiap jenis barang akan memiliki kolom deskripsi spesifikasinya tersendiri.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300">
                    {selectedJenisBarang.length} Jenis Barang Dipilih
                  </span>
                </div>

                {/* Multiple Choice Chips / Checkbox Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                  {JENIS_BARANG_OPTIONS.map(opt => {
                    const isSelected = selectedJenisBarang.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => handleToggleJenisBarang(opt)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 shrink-0 text-white" />
                        ) : (
                          <Square className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Durasi / Lingkup Jasa
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 6 Bulan / 12 Sesi Pelatihan"
                  value={formData.satuan}
                  onChange={e => setFormData({ ...formData, satuan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {/* Row 3: Dedicated Description Field for EACH Selected Item Type */}
            {formData.bentukBantuan === 'Barang' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
                    <span>Kolom Deskripsi & Spesifikasi Tersendiri Per Jenis Barang ({selectedJenisBarang.length} Item)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Wajib diisi untuk verifikasi teknis bantuan
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedJenisBarang.map((jenis, idx) => {
                    const itemSpec = spesifikasiList.find(s => s.jenisBarang === jenis) || {
                      jenisBarang: jenis,
                      deskripsi: ''
                    };

                    return (
                      <div
                        key={jenis}
                        className="p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 transition-all"
                      >
                        {/* Header Item */}
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                          <span className="w-5 h-5 rounded-md bg-blue-900 text-white font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-blue-950 dark:text-blue-300">
                            {jenis}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            (Deskripsi & Spesifikasi Teknis Bantuan)
                          </span>
                        </div>

                        {/* Dedicated Textarea for this item */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Kolom Deskripsi & Spesifikasi Lengkap ({jenis}) *
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder={`Tuliskan rincian spesifikasi untuk ${jenis}: merek, seri, tipe processor/RAM, spesifikasi mesin, kapasitas, dimensi atau nomor seri...`}
                            value={itemSpec.deskripsi}
                            onChange={e => handleUpdateSpesifikasi(jenis, e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Singkat Pelayanan Jasa *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Materi pelatihan, kurikulum pembinaan, sasaran penerima manfaat, dan modul pendampingan..."
                  value={formData.detailBantuan}
                  onChange={e => setFormData({ ...formData, detailBantuan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {/* Row 4: Multi-Vendor Section with Category Matching */}
            <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                    <span>Vendor / Rekanan Penyedia (Dapat Menggunakan Beberapa Vendor)</span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Satu penerima bantuan bisa menggunakan beberapa vendor dengan keterangan kategori barang/jasa masing-masing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddVendor}
                  className="px-3 py-1.5 text-xs bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Vendor Baru</span>
                </button>
              </div>

              {/* Vendor Cards List */}
              <div className="space-y-3 pt-1">
                {rekananVendors.map((vendor, vIdx) => (
                  <div
                    key={vendor.id || vIdx}
                    className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    {/* Header Vendor Card */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
                          Vendor Rekanan #{vIdx + 1}
                        </span>
                        {registeredVendors.length > 0 && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <span>Pilih Rekanan Terdaftar:</span>
                            <select
                              value={registeredVendors.some(v => v.namaVendor === vendor.namaVendor) ? vendor.namaVendor : ''}
                              onChange={e => {
                                if (e.target.value) {
                                  handleSelectRegisteredVendor(vIdx, e.target.value);
                                }
                              }}
                              className="px-2 py-0.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            >
                              <option value="">-- Cari Vendor di Database BI --</option>
                              {registeredVendors.map(rv => (
                                <option key={rv.id} value={rv.namaVendor}>
                                  {rv.namaVendor} ({rv.kategoriVendor}) - {rv.barangJasa.slice(0, 30)}...
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {rekananVendors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVendor(vIdx)}
                          title="Hapus Rekanan Vendor Ini"
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Vendor</span>
                        </button>
                      )}
                    </div>

                    {/* Inputs Row: Nama, Kontak/PIC, Kategori Pajak */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Nama Perusahaan / CV Vendor *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: PT Surya Mandiri Solusindo"
                          value={vendor.namaVendor}
                          onChange={e => handleUpdateVendor(vIdx, 'namaVendor', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          No. Kontak / WhatsApp Vendor
                        </label>
                        <input
                          type="text"
                          placeholder="0812-xxxx-xxxx"
                          value={vendor.kontak || ''}
                          onChange={e => handleUpdateVendor(vIdx, 'kontak', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Kategori Pajak Vendor (Dropdown)
                        </label>
                        <select
                          value={vendor.kategoriPajak || 'PKP'}
                          onChange={e => handleUpdateVendor(vIdx, 'kategoriPajak', e.target.value as 'PKP' | 'Non-PKP')}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                        >
                          <option value="PKP">PKP (Pengusaha Kena Pajak)</option>
                          <option value="Non-PKP">Non-PKP</option>
                        </select>
                      </div>
                    </div>

                    {/* Daftar Item Barang / Jasa Yang Disediakan Vendor Ini */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            Rincian Item Barang & Anggaran Pengadaan (Vendor #{vIdx + 1})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({(vendor.items || []).length} Item)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddItemToVendor(vIdx)}
                          className="px-2.5 py-1 text-[11px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-300 font-semibold rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Tambah Item Barang Vendor</span>
                        </button>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2">
                        {(vendor.items || []).map((item, iIdx) => {
                          const itemQty = typeof item.qty === 'number' ? item.qty : parseInt(String(item.qty), 10) || 0;
                          const itemHarga = typeof item.hargaSatuan === 'number' ? item.hargaSatuan : parseInt(String(item.hargaSatuan), 10) || 0;
                          const subtotal = itemQty * itemHarga;

                          return (
                            <div
                              key={item.id || iIdx}
                              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-2"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                {/* Item Name / Jenis */}
                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Nama / Jenis Barang *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Laptop Core i5 / Mesin Roaster"
                                    value={item.namaBarang}
                                    onChange={e => handleUpdateVendorItem(vIdx, iIdx, 'namaBarang', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                                  />
                                </div>

                                {/* Spesifikasi Ringkas */}
                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Spesifikasi / Merek
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Merek, tipe, dimensi..."
                                    value={item.spesifikasi || ''}
                                    onChange={e => handleUpdateVendorItem(vIdx, iIdx, 'spesifikasi', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                                  />
                                </div>

                                {/* QTY - Overlay placeholder, no sticky 1 */}
                                <div className="sm:col-span-1">
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                                    QTY *
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="1"
                                    value={item.qty === '' ? '' : item.qty}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      handleUpdateVendorItem(vIdx, iIdx, 'qty', raw === '' ? '' : Number(raw));
                                    }}
                                    className="w-full px-2 py-1.5 text-xs text-center font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800"
                                  />
                                </div>

                                {/* Satuan */}
                                <div className="sm:col-span-1">
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Satuan
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Unit"
                                    value={item.satuan || ''}
                                    onChange={e => handleUpdateVendorItem(vIdx, iIdx, 'satuan', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                                  />
                                </div>

                                {/* Harga Satuan - Overlay placeholder, no sticky 0 */}
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Harga Satuan (Rp) *
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={item.hargaSatuan === '' ? '' : item.hargaSatuan}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      handleUpdateVendorItem(vIdx, iIdx, 'hargaSatuan', raw === '' ? '' : Number(raw));
                                    }}
                                    className="w-full px-2 py-1.5 text-xs text-right font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800 tabular-nums"
                                  />
                                </div>

                                {/* Subtotal & Delete */}
                                <div className="sm:col-span-2 flex items-center justify-between gap-1 pt-3 sm:pt-0">
                                  <div className="text-right">
                                    <span className="block text-[9px] text-slate-400">Subtotal Item</span>
                                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300 tabular-nums">
                                      Rp {subtotal.toLocaleString('id-ID')}
                                    </span>
                                  </div>

                                  {(vendor.items || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItemFromVendor(vIdx, iIdx)}
                                      title="Hapus Item Ini"
                                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Subtotal Vendor Card Footer */}
                      <div className="flex items-center justify-between px-3 py-2 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Subtotal Alokasi Vendor #{vIdx + 1} ({vendor.namaVendor || 'Vendor Belum Dinamai'}):
                        </span>
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 tabular-nums">
                          Rp {(vendor.items || []).reduce((acc, itm) => {
                            const q = typeof itm.qty === 'number' ? itm.qty : parseInt(String(itm.qty), 10) || 0;
                            const h = typeof itm.hargaSatuan === 'number' ? itm.hargaSatuan : parseInt(String(itm.hargaSatuan), 10) || 0;
                            return acc + (q * h);
                          }, 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTAL NOMINAL BANTUAN EPML (HANYA TOTAL NOMINAL DI BAGIAN BAWAH) */}
            <div className="p-4 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white rounded-xl shadow-md border border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                  <Coins className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                      Total Nominal Bantuan EPML
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-800/80 text-blue-100">
                      {rekananVendors.filter(v => v.namaVendor.trim()).length || 1} Rekanan Terlibat • {totalQtyBantuan} Total QTY
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 mt-0.5">
                    Dihitung otomatis dari akumulasi seluruh item barang dan pengadaan yang disediakan oleh rekanan vendor di atas.
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-blue-200 block">Akumulasi Anggaran EPML</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight tabular-nums">
                  Rp {totalNominalBantuan.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: PROGRESS 7 TAHAP, KONDISI FISIK & WAKTU */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400 pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
              4. Tahap Distribusi & Pemantauan Fisik
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Progres Tahapan Penyaluran *
                </label>
                <select
                  value={formData.statusTahap}
                  onChange={e => setFormData({ ...formData, statusTahap: e.target.value as StatusTahap })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {TAHAP_OPTIONS.map((thp, i) => (
                    <option key={thp} value={thp}>
                      {i + 1}. {thp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Kondisi Fisik Barang *
                </label>
                <select
                  value={formData.statusKondisiFisik}
                  onChange={e => setFormData({ ...formData, statusKondisiFisik: e.target.value as StatusKondisiFisik })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Baik & Lengkap">Baik & Lengkap</option>
                  <option value="Perlu Perbaikan Ringan">Perlu Perbaikan Ringan</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                  <option value="Kurang Jumlah">Kurang Jumlah</option>
                  <option value="Belum Diterima / Tahap Asesmen">Belum Diterima / Tahap Asesmen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Penyaluran
                </label>
                <input
                  type="date"
                  value={formData.tanggalPenyaluran}
                  onChange={e => setFormData({ ...formData, tanggalPenyaluran: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jadwal Monitoring Bantuan
                </label>
                <input
                  type="date"
                  value={formData.tanggalJadwalMonitoring || ''}
                  onChange={e => setFormData({ ...formData, tanggalJadwalMonitoring: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Triwulan Penyaluran
                </label>
                <select
                  value={formData.triwulan}
                  onChange={e => setFormData({ ...formData, triwulan: e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4' })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Q1">Triwulan I (Q1)</option>
                  <option value="Q2">Triwulan II (Q2)</option>
                  <option value="Q3">Triwulan III (Q3)</option>
                  <option value="Q4">Triwulan IV (Q4)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tahun Anggaran (Otomatis Buat Folder Drive)
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextYr = (formData.tahun || getActiveBudgetYear()) + 1;
                      setActiveBudgetYear(nextYr);
                      const updatedId =
                        !initialItem && formData.id
                          ? formData.id.replace(/EPML-JTM-\d{4}-/, `EPML-JTM-${nextYr}-`)
                          : formData.id;
                      setFormData(prev => ({
                        ...prev,
                        tahun: nextYr,
                        id: updatedId
                      }));
                      const token = await getAccessToken();
                      if (token) {
                        ensureYearlyArchiveFoldersForYear(nextYr, token).catch(() => {});
                      }
                    }}
                    className="text-[10px] font-bold text-blue-900 dark:text-blue-300 hover:underline cursor-pointer"
                    title="Tambah / beralih ke tahun anggaran berikutnya & buat folder otomatis"
                  >
                    + Tahun Berikutnya
                  </button>
                </div>
                <select
                  value={formData.tahun || getActiveBudgetYear()}
                  onChange={async e => {
                    const selectedYr = parseInt(e.target.value, 10) || getActiveBudgetYear();
                    setActiveBudgetYear(selectedYr);
                    const updatedId =
                      !initialItem && formData.id
                        ? formData.id.replace(/EPML-JTM-\d{4}-/, `EPML-JTM-${selectedYr}-`)
                        : formData.id;
                    setFormData(prev => ({
                      ...prev,
                      tahun: selectedYr,
                      id: updatedId
                    }));
                    const token = await getAccessToken();
                    if (token) {
                      ensureYearlyArchiveFoldersForYear(selectedYr, token).catch(() => {});
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {Array.from(
                    new Set([
                      2024,
                      2025,
                      2026,
                      2027,
                      2028,
                      2029,
                      2030,
                      getActiveBudgetYear(),
                      formData.tahun || getActiveBudgetYear(),
                      ...getYearlyFoldersRegistry().map(y => y.tahun)
                    ])
                  )
                    .sort((a, b) => a - b)
                    .map(yr => (
                      <option key={yr} value={yr}>
                        Tahun Anggaran {yr} (Folder Drive: EPML {yr})
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Kondisi Fisik Lapangan
                </label>
                <input
                  type="text"
                  placeholder="Catatan hasil pengecekan kelengkapan, nomor seri barang, atau laporan kendala..."
                  value={formData.catatanKondisiFisik || ''}
                  onChange={e => setFormData({ ...formData, catatanKondisiFisik: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: UPLOAD FOTO & DOKUMENTASI KE GOOGLE DRIVE (EPML TAHUN -> NAMA PENERIMA) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>5. Upload Foto & Arsip Dokumentasi ke Google Drive</span>
              </h4>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Maksimal 7 foto per tahapan &bull; Otomatis tersimpan di Google Drive
              </span>
            </div>

            {/* Google Drive Auto-Folder Hierarchy Info Banner */}
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-900 text-white">
                    <FolderOpen className="w-3 h-3 text-amber-300" />
                    <span>Struktur Folder Otomatis Google Drive</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-950 dark:text-blue-200 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    EPML {formData.tahun || new Date().getFullYear()} /{' '}
                    {formData.namaPenerima?.trim() || '[Nama Penerima Bantuan]'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Saat menyimpan data penerima, sistem langsung membuat folder tahun input{' '}
                  <strong>&ldquo;EPML {formData.tahun || new Date().getFullYear()}&rdquo;</strong> dan subfolder{' '}
                  <strong>&ldquo;{formData.namaPenerima?.trim() || 'Nama Penerima Bantuan'}&rdquo;</strong> di Google Drive, lalu mengunggah seluruh foto lokasi, bukti penyerahan, BAST, dan monitoring ke folder tersebut.{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    Apabila data penerima dihapus di menu Pencatatan, arsip foto di Google Drive tetap aman dan tidak dihapus.
                  </strong>
                </p>
                {formData.driveRecipientFolderUrl && (
                  <a
                    href={formData.driveRecipientFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>
                      Buka Folder Khusus Penerima Ini ({formData.driveYearFolderName || `EPML ${formData.tahun}`} / {formData.driveRecipientFolderName || formData.namaPenerima})
                    </span>
                  </a>
                )}
              </div>

              <div className="shrink-0">
                <GoogleDriveConnectButton
                  folderUrl={formData.driveRecipientFolderUrl || DRIVE_PHOTO_ARCHIVE_ROOT_URL}
                  folderLabel={
                    formData.driveRecipientFolderUrl
                      ? 'Folder Drive Penerima'
                      : 'Folder Induk Arsip Foto'
                  }
                />
              </div>
            </div>

            {driveSyncStatus && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                <span>{driveSyncStatus}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MultiPhotoUploader
                label="Foto Lokasi / Penerima"
                subtitle="Survei lokasi, kondisi fisik & serah dokumen"
                photos={fotoPenerimaList}
                onChange={setFotoPenerimaList}
                onEnlarge={(url, cap) => setLightboxState({ isOpen: true, url, caption: cap || 'Foto Lokasi / Penerima' })}
                maxPhotos={7}
              />

              <MultiPhotoUploader
                label="Bukti Penyaluran Vendor"
                subtitle="Armada pengiriman, packing & serah rekanan"
                photos={buktiPenyaluranVendorList}
                onChange={setBuktiPenyaluranVendorList}
                onEnlarge={(url, cap) => setLightboxState({ isOpen: true, url, caption: cap || 'Bukti Penyaluran Vendor' })}
                maxPhotos={7}
              />

              <MultiPhotoUploader
                label="Bukti Serah Terima (BAST)"
                subtitle="Tanda tangan BAST & serah terima fisik"
                photos={buktiSerahTerimaBastList}
                onChange={setBuktiSerahTerimaBastList}
                onEnlarge={(url, cap) => setLightboxState({ isOpen: true, url, caption: cap || 'Bukti Serah Terima (BAST)' })}
                maxPhotos={7}
              />

              <MultiPhotoUploader
                label="Foto Monitoring Lapangan"
                subtitle="Evaluasi pemanfaatan & operasional barang"
                photos={fotoMonitoringList}
                onChange={setFotoMonitoringList}
                onEnlarge={(url, cap) => setLightboxState({ isOpen: true, url, caption: cap || 'Foto Monitoring Lapangan' })}
                maxPhotos={7}
              />
            </div>
          </div>

          {/* Section 6: Auto-Generated QR Sticker Preview */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-2 gap-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>6. Generate Otomatis Label Stiker QR Informasi Penerima Bantuan</span>
              </h4>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Otomatis ter-generate & siap cetak ukuran A4 Potrait (3×6)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-5">
              <div className="w-full max-w-[350px] h-[175px] shrink-0">
                <QrStickerDesignCard
                  item={{
                    id: formData.id || 'EPML-JTM-2025-NEW',
                    namaPenerima: formData.namaPenerima || 'Nama Lembaga Penerima EPML',
                    picAsesmen: formData.picAsesmen || actorName,
                    statusAsesmen: (formData.statusAsesmen as StatusAsesmen) || 'Disetujui',
                    alamat: formData.alamat || '-',
                    kabupatenKota: formData.kabupatenKota || 'Kota Surabaya',
                    latitude: Number(formData.latitude) || -7.2575,
                    longitude: Number(formData.longitude) || 112.7521,
                    noHp: formData.noHp || '-',
                    kategoriLembaga: (formData.kategoriLembaga as KategoriLembaga) || 'Sekolah / Pesantren',
                    kategoriBantuan: (formData.kategoriBantuan as KategoriBantuan) || 'Edukasi',
                    bentukBantuan: (formData.bentukBantuan as BentukBantuan) || 'Barang',
                    jenisBarang: selectedJenisBarang[0] || 'Personal Computer / Laptop',
                    detailBantuan: formData.detailBantuan || selectedJenisBarang.join(', ') || 'Paket Bantuan EPML',
                    qty: totalQtyBantuan || 1,
                    satuan: (rekananVendors[0]?.items[0]?.satuan) || formData.satuan || 'Unit',
                    vendorPenyedia: rekananVendors[0]?.namaVendor || formData.vendorPenyedia || 'Rekanan Vendor BI',
                    hargaSatuan: 0,
                    nominalBantuan: totalNominalBantuan || 0,
                    statusTahap: (formData.statusTahap as StatusTahap) || 'Pengadaan',
                    statusKondisiFisik: (formData.statusKondisiFisik as StatusKondisiFisik) || 'Baik & Lengkap',
                    catatanKondisiFisik: '',
                    tanggalPenyaluran: formData.tanggalPenyaluran || new Date().toISOString().slice(0, 10),
                    triwulan: (formData.triwulan as 'Q1' | 'Q2' | 'Q3' | 'Q4') || 'Q2',
                    tahun: Number(formData.tahun) || 2025,
                    riwayatAktivitas: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }}
                  compact={false}
                />
              </div>

              <div className="flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">
                  QR Code Penerima Bantuan Ter-Generate Secara Instan
                </p>
                <p className="leading-relaxed">
                  Begitu Anda menekan tombol <strong>Simpan Data Bantuan EPML</strong>, sistem otomatis menyimpan gambar QR Code resmi berlabel <strong>&ldquo;Bantuan EPML dari Bank Indonesia&rdquo;</strong> (kombinasi warna Biru, Putih, dan Hijau) ke dalam menu <strong>QR Code &amp; Tracking Fisik</strong> dan siap dicetak dalam format lembar A4 Potrait (3×6 stiker).
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncingDrive}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSyncingDrive}
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSyncingDrive ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan & Sinkron ke Google Drive...</span>
                </>
              ) : (
                <span>Simpan Data, Buat Folder Drive & Generate QR</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lightbox Preview Modal for Enlarged Photo */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        imageUrl={lightboxState.url}
        caption={lightboxState.caption}
        onClose={() => setLightboxState({ isOpen: false, url: '', caption: '' })}
      />
    </div>
  );
};
