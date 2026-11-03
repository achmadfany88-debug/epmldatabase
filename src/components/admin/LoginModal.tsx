/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { UserAccount } from '../../types';
import { ShieldCheck, Lock, User, KeyRound, AlertCircle, X, CheckCircle, Info } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [step, setStep] = useState<'CREDENTIALS' | '2FA'>('CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [showDemoOtp, setShowDemoOtp] = useState(false);

  if (!isOpen) return null;

  const currentGeneratedOtp = StorageService.generateCurrentOtpCode();

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = StorageService.login(username, password);
    if (!res.success) {
      if (res.require2FA && res.user) {
        setPendingUser(res.user);
        setStep('2FA');
        setOtpCode(currentGeneratedOtp);
      } else {
        setErrorMsg(res.error || 'Autentikasi gagal. Silakan periksa kembali data Anda.');
      }
    } else if (res.user) {
      onLoginSuccess(res.user);
      onClose();
    }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pendingUser) return;
    const res = StorageService.verify2FA(pendingUser, otpCode);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
      onClose();
    } else {
      setErrorMsg(res.error || 'Kode verifikasi dua faktor salah.');
    }
  };

  const resetState = () => {
    setStep('CREDENTIALS');
    setErrorMsg('');
    setUsername('');
    setPassword('');
    setOtpCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={() => {
            resetState();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Autentikasi Administrator EPML
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{errorMsg}</p>
          </div>
        )}

        {step === 'CREDENTIALS' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username Akun
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan Username"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan Password"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Masuk ke Dashboard Admin</span>
                <span>&rarr;</span>
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: TWO-FACTOR AUTHENTICATION (2FA) */
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Otentikasi Dua Faktor (2FA) Aktif</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Masukkan 6-digit kode OTP authenticator untuk akun <span className="font-semibold">{pendingUser?.namaLengkap}</span> demi menjamin keamanan data perbankan.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode 6-Digit Authenticator (OTP)
                </label>
                <button
                  type="button"
                  onClick={() => setShowDemoOtp(!showDemoOtp)}
                  className="text-[10px] text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {showDemoOtp ? 'Sembunyikan Token Demo' : 'Tampilkan Token Aktif'}
                </button>
              </div>

              {showDemoOtp && (
                <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-center text-xs font-mono font-bold tracking-widest text-blue-900 dark:text-blue-300">
                  KODE SAAT INI: {currentGeneratedOtp} (atau 882026)
                </div>
              )}

              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit angka OTP"
                className="w-full text-center tracking-[0.3em] font-mono text-lg py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('CREDENTIALS')}
                className="w-1/3 py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="w-2/3 py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Verifikasi & Masuk Dashboard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
