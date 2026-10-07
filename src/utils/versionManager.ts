/**
 * MedCards Version & Auto-Update Manager
 * Garante detecção em tempo real de novas versões no Vercel e invalidação agressiva de cache nos dispositivos.
 */

export interface VersionInfo {
  version: string;
  buildTime: string;
  buildDateFormatted: string;
  releaseNotes?: string;
}

export const CURRENT_APP_VERSION = '2.5.0';
export const CURRENT_BUILD_TIMESTAMP = typeof __APP_BUILD_TIMESTAMP__ !== 'undefined' ? __APP_BUILD_TIMESTAMP__ : '2026-09-23T15:30:00.000Z';
export const CURRENT_BUILD_LABEL = typeof __APP_BUILD_LABEL__ !== 'undefined' ? __APP_BUILD_LABEL__ : '23/09/2026 às 12:30';

// Invalida e limpa qualquer cache do navegador e Service Worker, forçando recarga imediata
export async function forceAppUpdate(): Promise<void> {
  try {
    // 1. Limpa todas as instâncias de Cache Storage do navegador
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 2. Desregistra Service Workers legados ou ativos
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // 3. Limpa sessionStorage temporário
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (err) {
    console.warn('Erro ao limpar caches durante atualização:', err);
  }

  // 4. Força reload com timestamp único para quebrar qualquer cache de CDN/Edge/Browser
  const separator = window.location.href.includes('?') ? '&' : '?';
  const cleanUrl = window.location.href.split('?')[0];
  window.location.href = `${cleanUrl}${separator}updated=${Date.now()}`;
}

// Verifica se há uma versão mais nova disponível no servidor Vercel
export async function checkServerVersion(): Promise<{ hasUpdate: boolean; serverInfo?: VersionInfo }> {
  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!res.ok) {
      return { hasUpdate: false };
    }

    const data: VersionInfo = await res.json();
    if (data && data.buildTime && data.buildTime !== CURRENT_BUILD_TIMESTAMP) {
      return { hasUpdate: true, serverInfo: data };
    }

    return { hasUpdate: false, serverInfo: data };
  } catch (err) {
    // Falha de rede ou modo offline
    return { hasUpdate: false };
  }
}
