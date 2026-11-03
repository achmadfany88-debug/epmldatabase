/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';

interface FooterProps {
  officeAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  googleMapsEmbedUrl?: string;
}

export const Footer: React.FC<FooterProps> = ({
  officeAddress = 'Jl. Pahlawan No.105, Krembangan, Kota Surabaya, Jawa Timur 60174',
  contactEmail = 'humas_jatim@bi.go.id',
  contactPhone = '(031) 3530351',
  googleMapsEmbedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3957.9405629166827!2d112.73552087574312!3d-7.247596271190538!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7f9389e74ce91%3A0xe54b9cb7b640db05!2sKantor%20Perwakilan%20Bank%20Indonesia%20Provinsi%20Jawa%20Timur!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid'
}) => {
  return (
    <footer className="bg-slate-900 text-slate-200 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Institutional Identity */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/90">
                <img
                  src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
                  alt="Logo Bank Indonesia"
                  className="w-full h-full object-cover rounded-full scale-[1.22]"
                />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white tracking-tight">
                  KANTOR PERWAKILAN BANK INDONESIA
                </h4>
                <p className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
                  PROVINSI JAWA TIMUR
                </p>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{officeAddress}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Telepon: {contactPhone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Email Resmi: {contactEmail}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Pelayanan: Senin - Jumat (08.00 - 16.30 WIB)</span>
              </div>
            </div>
          </div>

          {/* Column 2: Interactive Google Maps Embed Location */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Lokasi Kantor Bank Indonesia Jatim
              </h5>
              <a
                href="https://maps.google.com/?q=Kantor+Perwakilan+Bank+Indonesia+Provinsi+Jawa+Timur"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-700 shadow-md">
              <iframe
                title="Google Maps Lokasi KPw Bank Indonesia Provinsi Jawa Timur"
                src={googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full"
              />
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Jl. Pahlawan No.105, Krembangan, Kota Surabaya (Sebelah Barat Tugu Pahlawan)
            </p>
          </div>
        </div>

        {/* Bottom Legal bar */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <div>
            &copy; {new Date().getFullYear()} Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur. Hak Cipta Dilindungi Undang-Undang.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Master Data EPML Jawa Timur</span>
            <span aria-hidden="true">&middot;</span>
            <span>Standar Keamanan Enkripsi Perbankan</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
