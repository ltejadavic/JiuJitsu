'use client';

import React, { useState } from 'react';
import Cookies from 'js-cookie';
import { Database, Download, Loader2 } from 'lucide-react';

interface DatabaseBackupButtonProps {
  className?: string;
  variant?: 'header' | 'button' | 'menu';
}

export function DatabaseBackupButton({
  className = '',
  variant = 'button',
}: DatabaseBackupButtonProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleDownloadBackup = async () => {
    try {
      setIsBackingUp(true);
      const token = Cookies.get('token');
      const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const apiBase = rawApiBase.replace(/\/+$/, '');

      const response = await fetch(`${apiBase}/backup/export`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate database backup (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const disposition = response.headers.get('content-disposition');
      let filename = `bjj-academy-db-backup-${new Date().toISOString().split('T')[0]}.json`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Database backup error: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleDownloadBackup}
        disabled={isBackingUp}
        title="Download full database JSON backup"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-blue-700 hover:border-blue-200 shadow-xs disabled:opacity-60 cursor-pointer ${className}`}
      >
        {isBackingUp ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span className="hidden sm:inline">Backing up...</span>
          </>
        ) : (
          <>
            <Database className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Backup DB</span>
          </>
        )}
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleDownloadBackup}
        disabled={isBackingUp}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 cursor-pointer ${className}`}
      >
        {isBackingUp ? (
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        ) : (
          <Database className="h-5 w-5 text-blue-600" />
        )}
        <span>{isBackingUp ? 'Exporting Backup...' : 'Download DB Backup'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownloadBackup}
      disabled={isBackingUp}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-blue-700 hover:border-blue-200 disabled:opacity-60 transition cursor-pointer ${className}`}
    >
      {isBackingUp ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Generating DB Backup...</span>
        </>
      ) : (
        <>
          <Database className="h-4 w-4 text-blue-600" />
          <span>Backup Database (.json)</span>
        </>
      )}
    </button>
  );
}

