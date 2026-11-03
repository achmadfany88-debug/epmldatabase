/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  googleSignIn,
  logoutGoogleDrive,
  subscribeGoogleDriveAuth,
  initAuth
} from '../../services/googleDriveService';
import { CheckCircle2, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleDriveConnectButtonProps {
  folderUrl?: string;
  folderLabel?: string;
  compact?: boolean;
  onConnected?: (accessToken: string, user: User) => void;
}

export const GoogleDriveConnectButton: React.FC<GoogleDriveConnectButtonProps> = ({
  folderUrl,
  folderLabel = 'Buka Folder Google Drive',
  compact = false,
  onConnected
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsubInit = initAuth();
    const unsubState = subscribeGoogleDriveAuth(state => {
      setIsConnected(state.isConnected);
      setGoogleUser(state.user);
    });
    return () => {
      unsubInit();
      unsubState();
    };
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      const res = await googleSignIn();
      if (res && onConnected) {
        onConnected(res.accessToken, res.user);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghubungkan Google Drive.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogleDrive();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isConnected ? (
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="gsi-material-button inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
        >
          <div className="gsi-material-button-state" />
          <div className="gsi-material-button-content-wrapper flex items-center gap-2">
            <div className="gsi-material-button-icon w-4 h-4 shrink-0">
              {isSigningIn ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  className="w-4 h-4 block"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              )}
            </div>
            <span className="gsi-material-button-contents">
              {isSigningIn ? 'Menghubungkan Google Drive...' : 'Sign in with Google'}
            </span>
          </div>
        </button>
      ) : (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-bold truncate max-w-[180px]">
            {compact
              ? 'Google Drive Aktif'
              : `Drive Terhubung: ${googleUser?.email || googleUser?.displayName || 'Akun Google'}`}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            title="Putuskan koneksi Google Drive"
            className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      )}

      {folderUrl && (
        <a
          href={folderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs font-bold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span>{folderLabel}</span>
        </a>
      )}

      {errorMsg && (
        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
          {errorMsg}
        </span>
      )}
    </div>
  );
};
