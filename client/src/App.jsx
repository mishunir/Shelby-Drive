import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWalletContext } from './contexts/WalletContext';
import { Buffer } from 'buffer';
// import { VideoPlayer } from '@shelby-protocol/player';
import {
  ShelbyBlobClient,
  ShelbyClient,
  createDefaultErasureCodingProvider,
  expectedTotalChunksets,
  generateCommitments,
} from '@shelby-protocol/sdk/browser';
import { Hex, Network, AccountAddress } from '@aptos-labs/ts-sdk';
import {
  Search,
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  ChevronRight,
  Globe,
  Shield,
  Zap,
  HardDrive,
  File,
  FileText,
  Video,
  Music,
  Image,
  Copy,
  ExternalLink,
  Share2,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  BarChart3,
  Lock,
  Unlock,
  Key,
  Database,
  Wifi,
  Cpu,
  Package,
  Layers,
  GitBranch,
  Terminal,
  Code,
  FileQuestion,
  FileX,
  FolderOpen,
  FilePlus,
  FileDown,
  FileUp,
  Filter,
  Grid,
  List,
  Eye,
  EyeOff,
  RefreshCw,
  MoreVertical,
  Edit,
  Save,
  Archive,
  Trash,
  Link2,
  Wallet,
} from 'lucide-react';

// Buffer polyfill for browser
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

const ensureWebCrypto = () => {
  if (typeof window === 'undefined') return;
  if (window.crypto?.subtle?.digest) return;
  throw new Error('WebCrypto is not available. Please open the app over HTTPS and accept the certificate warning.');
};

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'tiff', 'ico']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'm4v', 'mov', 'avi', 'mkv', 'm3u8', 'mpd', 'flv', 'wmv', '3gp', 'ogv', 'ts', 'mts']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus']);
const PDF_EXTENSIONS = new Set(['pdf']);

const getFileExtension = (value) => {
  if (!value) return '';
  const name = String(value).toLowerCase();
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const getPreviewType = (file) => {
  const rawType = String(file?.type || '').toLowerCase();
  const baseType = rawType.split('/')[0];
  const ext = getFileExtension(file?.name || file?.blobName || file?.fullName);
  const name = String(file?.name || file?.blobName || file?.fullName || '').toLowerCase();

  // Fallback: check if name contains media keywords when no extension
  const hasVideoKeyword = name.includes('video') || name.includes('clip') || name.includes('movie') || name.includes('mp4') || name.includes('avi') || name.includes('mov');
  const hasAudioKeyword = name.includes('mp3') || name.includes('audio') || name.includes('music') || name.includes('sound') || name.includes('wav');
  const hasPdfKeyword = name.includes('pdf');

  if (baseType === 'image' || IMAGE_EXTENSIONS.has(rawType) || IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (baseType === 'video' || VIDEO_EXTENSIONS.has(rawType) || VIDEO_EXTENSIONS.has(ext) || hasVideoKeyword) return 'video';
  if (baseType === 'audio' || AUDIO_EXTENSIONS.has(rawType) || AUDIO_EXTENSIONS.has(ext) || hasAudioKeyword) return 'audio';
  if (rawType.includes('pdf') || PDF_EXTENSIONS.has(ext) || hasPdfKeyword) return 'pdf';
  return null;
};

export default function App() {
  const {
    account,
    wallet,
    wallets,
    connect: connectAptos,
    disconnect: disconnectAptos,
    signAndSubmitTransaction,
    aptos,
  } = useWalletContext();

  const normalizeAptosAddress = (addr) => {
    if (!addr) return null;
    if (typeof addr === 'string') return addr;
    if (typeof addr?.toString === 'function') return addr.toString();
    if (addr?.address) return normalizeAptosAddress(addr.address);
    if (addr?.data) return normalizeAptosAddress(addr.data);
    return String(addr);
  };

  const aptosAddress = normalizeAptosAddress(account?.address);

  const fetchBlobsViaRpc = async (accountAddr) => {
    const headers = {
      'content-type': 'application/json',
    };
    if (shelbyApiKey) headers['x-api-key'] = shelbyApiKey;

    const tryUrls = [
      `${shelbyEndpoint}/blobs/${accountAddr}`,
      `${shelbyEndpoint}/blobs?owner=${encodeURIComponent(accountAddr)}&limit=200`,
      `${shelbyEndpoint}/blobs?owner=${encodeURIComponent(accountAddr)}`,
    ];

    let lastError = null;
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const blobs = Array.isArray(data)
          ? data
          : Array.isArray(data?.blobs)
            ? data.blobs
            : Array.isArray(data?.data)
              ? data.data
              : [];
        if (blobs.length > 0) return blobs;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Unable to list blobs via RPC');
  };

  const dedupeFiles = (items) => {
    const map = new Map();
    items.forEach((f) => {
      const key = `${f.accountAddr || ''}/${f.blobName || f.blobNameSuffix || f.fullName || f.name || f.id}`;
      if (!map.has(key)) {
        map.set(key, {
          ...f,
          id: key,
        });
      }
    });
    return Array.from(map.values());
  };

  const normalizeCachedFile = (f) => {
    const next = { ...f };
    if (!next.accountAddr && aptosAddress) next.accountAddr = aptosAddress;
    if (!next.fullName && typeof next.name === 'string' && next.name.startsWith('@')) next.fullName = next.name;
    if (next.hash) next.hash = cleanHash(next);
    if (!next.fullName && typeof next.name === 'string' && next.name.startsWith('@')) next.fullName = next.name;
    if (!next.blobName && typeof next.fullName === 'string' && next.fullName.startsWith('@')) {
      next.blobName = next.fullName.split('/').slice(1).join('/');
    }
    if (next.blobName && typeof next.blobName === 'string' && next.blobName.startsWith('@')) {
      next.blobName = next.blobName.split('/').slice(1).join('/');
    }
    if (next.hash && typeof next.hash !== 'string') {
      next.hash = String(next.hash);
    }
    if (!next.fullName && next.accountAddr && next.blobName) {
      next.fullName = `@${next.accountAddr}/${next.blobName}`;
    }
    if (!next.url && next.accountAddr && next.blobName && shelbyEndpoint) {
      next.url = `${shelbyEndpoint}/blobs/${next.accountAddr}/${encodeURIComponent(next.blobName)}`;
    }
    if (next.name && typeof next.name === 'string' && next.name.startsWith('@')) {
      next.name = next.name.split('/').pop() || next.name;
    }
    return next;
  };

  const shelbyApiKey = (import.meta.env.REACT_APP_SHELBY_API_KEY || '').trim();
  const shelbyEndpoint = (import.meta.env.REACT_APP_SHELBY_ENDPOINT || 'https://api.shelbynet.shelby.xyz/shelby').trim();
  const shelbyRpcBase = (shelbyEndpoint || '').replace(/\/v1\/?$/, '');
  const aptosNetwork = (import.meta.env.REACT_APP_APTOS_NETWORK || 'shelbynet').trim();
  const aptosNodeUrl = (import.meta.env.REACT_APP_APTOS_NODE_URL || 'https://api.shelbynet.shelby.xyz/v1').trim();
  const aptosIndexerUrl = (import.meta.env.REACT_APP_APTOS_INDEXER_URL || 'https://api.shelbynet.shelby.xyz/v1/graphql').trim();
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();

  // console.log('[Shelby][Config]', {
  //   hasApiKey: !!shelbyApiKey,
  //   endpoint: shelbyEndpoint,
  //   network: aptosNetwork,
  //   aptosNode: aptosNodeUrl,
  //   aptosIndexer: aptosIndexerUrl,
  //   backendUrl,
  // });

  const shelbyClient = useMemo(() => {
    // console.log('[Shelby][Init] Creating client...', {
  //   hasKey: !!shelbyApiKey,
  //   endpoint: shelbyEndpoint,
  //   network: aptosNetwork,
  //   nodeUrl: aptosNodeUrl,
  //   indexerUrl: aptosIndexerUrl,
  // });

    if (!shelbyApiKey || !shelbyEndpoint) {
      console.warn('[Shelby][Init] Missing apiKey or endpoint');
      return null;
    }

    try {
      const client = new ShelbyClient({
        network: Network.SHELBYNET,
        apiKey: shelbyApiKey,
        rpc: { baseUrl: shelbyRpcBase, apiKey: shelbyApiKey },
        indexer: { baseUrl: aptosIndexerUrl, apiKey: shelbyApiKey },
        aptos: {
          network: Network.SHELBYNET,
          fullnode: aptosNodeUrl,
        },
      });
      // console.log('[Shelby][Init] Client created');
      return client;
    } catch (error) {
      console.error('[Shelby][Init] Failed to create client', error);
      return null;
    }
  }, [shelbyApiKey, shelbyEndpoint, aptosNetwork, aptosNodeUrl, aptosIndexerUrl]);

  // console.log('[Shelby][Client] Initialized', {
  //   endpoint: shelbyEndpoint,
  //   network: Network.SHELBYNET,
  //   nodeUrl: aptosNodeUrl,
  //   hasClient: !!shelbyClient,
  // });

  const erasureProviderRef = useRef(null);
  const previewAbortRef = useRef(null);
  const getErasureProvider = async () => {
    if (erasureProviderRef.current) return erasureProviderRef.current;
    const provider = await createDefaultErasureCodingProvider();
    erasureProviderRef.current = provider;
    return provider;
  };

  const initialRoute = (() => {
    if (typeof window === 'undefined') return { view: 'landing', shareId: null };
    const path = window.location.pathname || '/';
    if (path.startsWith('/share/')) {
      const parts = path.split('/').filter(Boolean);
      const shareId = parts.length > 1 ? decodeURIComponent(parts[parts.length - 1]) : null;
      return { view: 'share', shareId };
    }
    if (path === '/upload') return { view: 'upload', shareId: null };
    if (path === '/settings') return { view: 'settings', shareId: null };
    if (path === '/about') return { view: 'about', shareId: null };
    if (path === '/dashboard') return { view: 'dashboard', shareId: null };
    if (path === '/' || path === '') return { view: 'landing', shareId: null };
    // any non-reserved path is treated as detail
    return { view: 'detail', shareId: null };
  })();

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notification, setNotification] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareHash, setShareHash] = useState(initialRoute.shareId); // For /share/:hash routing
  const [page, setPage] = useState(1);
  const [recentFilter, setRecentFilter] = useState('all'); // all | video | image | other
  const deletedKeysRef = useRef(new Set());

  const filteredRecent = useMemo(() => {
    const matchFilter = (file) => {
      const t = getPreviewType(file) || file.type || '';
      if (recentFilter === 'all') return true;
      if (recentFilter === 'video') return (t || '').toLowerCase().includes('video');
      if (recentFilter === 'image') return (t || '').toLowerCase().includes('image');
      // other = not image/video
      return !(t || '').toLowerCase().includes('image') && !(t || '').toLowerCase().includes('video');
    };
    const matchSearch = (file) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      return (
        String(file.name || '').toLowerCase().includes(term) ||
        String(file.blobName || '').toLowerCase().includes(term) ||
        String(file.hash || '').toLowerCase().includes(term)
      );
    };
    return files.filter((f) => matchFilter(f) && matchSearch(f));
  }, [files, recentFilter, searchTerm]);

  const recentSorted = useMemo(() => {
    return [...filteredRecent].sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });
  }, [filteredRecent]);

  useEffect(() => () => {
    if (preview?.url && preview.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url);
    }
  }, [preview?.url]);

  // Clamp page when files change
  useEffect(() => {
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(((recentSorted || []).length || 0) / pageSize));
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [files, recentSorted]);

  useEffect(() => {
    setPage(1);
  }, [recentFilter]);

  // Handle URL routing for share pages
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const shareId = parseShareId();
      const detailId = parseDetailId();

      if (shareId) {
        setShareHash(shareId);
        setCurrentView((v) => (v === 'share' ? v : 'share'));
      } else if (path === '/upload') {
        setCurrentView('upload');
      } else if (path === '/settings') {
        setCurrentView('settings');
      } else if (path === '/about') {
        setCurrentView('about');
      } else if (path === '/' || path === '') {
        setCurrentView('landing');
      } else if (path === '/dashboard') {
        setCurrentView('dashboard');
      } else if (detailId) {
        const f = findFileById(detailId);
        if (f) {
          setSelectedFile(f);
          setCurrentView((v) => (v === 'detail' ? v : 'detail'));
        } else if (files.length > 0) {
          setSelectedFile(null);
          setCurrentView('landing');
        }
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // After files load, re-evaluate current URL to stay on same page after reload
  useEffect(() => {
    const shareId = parseShareId();
    const detailId = parseDetailId();

    if (shareId) {
      const f = findFileById(shareId);
      if (f) {
        setSelectedFile(f);
        setCurrentView((v) => (v === 'share' ? v : 'share'));
        return;
      }
      if (files.length === 0) return; // wait for files before deciding
    }

    if (detailId) {
      const f = findFileById(detailId);
      if (f) {
        setSelectedFile(f);
        setCurrentView((v) => (v === 'detail' ? v : 'detail'));
      } else {
        // If detailId contains account/blobName, build placeholder so preview can load without wallet
        const derived = deriveAccountBlobFromPath();
        if (derived?.accountAddr && derived?.blobName) {
          // Persist last account so dashboard/share can load without wallet
          localStorage.setItem(LAST_ACCOUNT_KEY, derived.accountAddr);
          const placeholder = {
            id: detailId,
            name: derived.blobName.split('/').pop() || derived.blobName,
            blobName: derived.blobName,
            accountAddr: derived.accountAddr,
            fullName: `@${derived.accountAddr}/${derived.blobName}`,
            url: `${shelbyEndpoint}/blobs/${derived.accountAddr}/${encodeURIComponent(derived.blobName)}`,
            type: derived.blobName.split('.').pop() || 'unknown',
            size: 'unknown',
            status: 'success',
            date: '',
          };
          setSelectedFile(placeholder);
          setCurrentView((v) => (v === 'detail' ? v : 'detail'));
          openPreview(placeholder);
          loadOnChainBlobs({ accountOverride: derived.accountAddr, keepCache: true }).catch(() => {});
        }
        if (files.length === 0) return; // wait for files before deciding
      }
    }
  }, [files]);

  // Find file by ID for share page
  const findFileById = (id) => {
    return files.find((f) => f.id === id || f.hash === id || f.blobName === id || f.name === id);
  };

  // Load cached files on mount
  const getCacheKey = (addr) => `shelby_files_${addr || 'none'}`;
  const LAST_ACCOUNT_KEY = 'shelby_last_account';
  const getSkipKey = (addr) => `${getCacheKey(addr)}_skip_once`;

  const parseShareId = () => {
    const path = window.location.pathname;
    if (!path.startsWith('/share/')) return null;
    const parts = path.split('/').filter(Boolean); // ['share','slug','id']
    return parts.length > 1 ? decodeURIComponent(parts[parts.length - 1]) : null;
  };

  const parseDetailId = () => {
    const path = window.location.pathname;
    const reserved = new Set(['share', 'upload', 'settings', 'about', 'dashboard', '']);
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    if (reserved.has(parts[0])) return null;
    return decodeURIComponent(parts[parts.length - 1]);
  };

  const deriveAccountBlobFromPath = () => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    // Prefer last segment if it encodes account/blobName
    const lastDecoded = decodeURIComponent(parts[parts.length - 1]);
    if (lastDecoded.includes('/')) {
      const [accountAddr, ...rest] = lastDecoded.split('/');
      const blobName = rest.join('/');
      if (accountAddr && blobName) return { accountAddr, blobName };
    }
    // Fallback: use last two segments as account / blob
    if (parts.length >= 2) {
      const accountAddr = decodeURIComponent(parts[parts.length - 2]);
      const blobName = decodeURIComponent(parts[parts.length - 1]);
      if (accountAddr && blobName) return { accountAddr, blobName };
    }
    return null;
  };

  // Load cached files for current account
  useEffect(() => {
    if (aptosAddress) {
      localStorage.setItem(LAST_ACCOUNT_KEY, aptosAddress);
    }
    const effectiveAddr = aptosAddress || localStorage.getItem(LAST_ACCOUNT_KEY) || null;
    const key = getCacheKey(effectiveAddr);
    const skipKey = getSkipKey(effectiveAddr);
    if (localStorage.getItem(skipKey)) {
      localStorage.removeItem(skipKey);
      setFiles([]);
      return;
    }
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const normalized = (Array.isArray(parsed) ? parsed : []).map(normalizeCachedFile);
        setFiles(dedupeFiles(normalized));
      } catch {
        localStorage.removeItem(key);
        setFiles([]);
      }
    } else {
      setFiles([]);
    }
  }, [aptosAddress]);

  // Save files to localStorage whenever they change for current account
  useEffect(() => {
    const effectiveAddr = aptosAddress || localStorage.getItem(LAST_ACCOUNT_KEY) || null;
    const key = getCacheKey(effectiveAddr);
    if (!effectiveAddr) {
      localStorage.removeItem(key);
      return;
    }
    const currentAccountFiles = files.filter((f) => f.accountAddr === effectiveAddr);
    if (currentAccountFiles.length > 0) {
      localStorage.setItem(key, JSON.stringify(dedupeFiles(currentAccountFiles)));
    } else {
      localStorage.removeItem(key);
    }
  }, [files, aptosAddress]);

  // Load on-chain blobs (reusable)
  const loadOnChainBlobs = useCallback(async (options = {}) => {
    const { flush = false, keepCache = false, accountOverride = null } = options;
    const effectiveAddr = accountOverride || aptosAddress || localStorage.getItem(LAST_ACCOUNT_KEY) || null;
    if (!shelbyClient || !effectiveAddr) return;
    if (flush) {
      setFiles((prev) => prev.filter((f) => f.accountAddr && f.accountAddr !== effectiveAddr));
      if (!keepCache) {
        const key = getCacheKey(effectiveAddr);
        const skipKey = getSkipKey(effectiveAddr);
        localStorage.removeItem(key);
        localStorage.setItem(skipKey, '1');
      }
    }
    const applyOnChainUpdate = (freshList) => {
      const deduped = dedupeFiles(freshList);
      const filtered = deduped.filter((f) => !deletedKeysRef.current.has(`${f.accountAddr}/${f.blobName}`));
      if (flush) {
        setFiles(filtered);
        const key = getCacheKey(effectiveAddr);
        const skipKey = getSkipKey(effectiveAddr);
        localStorage.setItem(key, JSON.stringify(filtered));
        if (!keepCache) localStorage.removeItem(skipKey);
        return;
      }
      setFiles((prev) => {
        const others = prev.filter((f) => f.accountAddr && f.accountAddr !== effectiveAddr);
        const next = dedupeFiles([...others, ...filtered]);
        const key = getCacheKey(effectiveAddr);
        const skipKey = getSkipKey(effectiveAddr);
        const currentAccountFiles = next.filter((f) => f.accountAddr === effectiveAddr);
        if (currentAccountFiles.length > 0) {
          localStorage.setItem(key, JSON.stringify(currentAccountFiles));
          if (!keepCache) localStorage.removeItem(skipKey);
        }
        return next;
      });
    };
    try {
      // 1) Try backend if configured
      if (backendUrl) {
        try {
          const res = await fetch(`${backendUrl}/api/blobs/${effectiveAddr}`, {
            headers: shelbyApiKey ? { 'x-api-key': shelbyApiKey } : undefined,
          });
          if (res.ok) {
            const data = await res.json();
            const blobsFromBackend = Array.isArray(data?.blobs) ? data.blobs : [];
            const mappedBackend = blobsFromBackend.map((b, i) => {
              const blobNameSuffix = String(b?.name || b?.blobName || b?.blob_name || '').trim();
              const fullName = `@${effectiveAddr}/${blobNameSuffix}`;
              const displayName = blobNameSuffix.split('/').pop() || blobNameSuffix;
              return {
                id: `${effectiveAddr}/${blobNameSuffix || i}`,
                name: displayName,
                size: typeof b.sizeBytes === 'number' ? formatBytes(b.sizeBytes) : String(b.size || ''),
                sizeBytes: b.sizeBytes || null,
                type: (displayName || '').split('.').pop() || 'unknown',
                date: b.expires || b.uploadedAt || b.created_at || new Date().toISOString().split('T')[0],
                hash: b.hash || b.blobMerkleRoot || b.blob_commitment || '(unknown)',
                url: `${shelbyEndpoint}/blobs/${effectiveAddr}/${encodeURIComponent(blobNameSuffix)}`,
                accountAddr: effectiveAddr,
                blobName: blobNameSuffix,
                fullName,
                status: 'success',
              };
            });

            applyOnChainUpdate(mappedBackend);
            return; // success via backend, stop here
          }
        } catch (be) {
          console.warn('[Shelby][OnChain] backend list failed, continue to SDK', be);
        }
      }

      // 2) Try SDK (client -> coordination)
      let blobs;
      const accountArg = AccountAddress.fromString(effectiveAddr);
      try {
        if (typeof shelbyClient.getAccountBlobs === 'function') {
          blobs = await shelbyClient.getAccountBlobs({ account: accountArg });
        } else {
          throw new Error('shelbyClient.getAccountBlobs is not available');
        }
      } catch (clientErr) {
        try {
          blobs = await shelbyClient.coordination.getAccountBlobs({ account: accountArg });
        } catch (coordErr) {
          console.warn('[Shelby][OnChain] coordination list failed, fallback to RPC list', {
            message: coordErr?.message,
            name: coordErr?.name,
          });
          blobs = await fetchBlobsViaRpc(effectiveAddr);
        }
      }

      const mapped = blobs.map((b, i) => {
        const blobNameSuffix = String(b?.blobNameSuffix || b?.blobName || '').trim() || String(b?.name || '').split('/').slice(1).join('/');
        const fullName = String(b?.name || (blobNameSuffix ? `@${effectiveAddr}/${blobNameSuffix}` : '')).trim();
        const displayName = (blobNameSuffix || '').split('/').pop() || blobNameSuffix || fullName;
        // According to docs: blobMerkleRoot is the merkle root of the blob (string)
        // Use blobMerkleRoot as primary hash, fallback to other fields
        const hashStr = cleanHash(b);
        // Create unique ID to avoid collisions
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`;
        const cleanName = displayName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const fileUniqueId = `${cleanName}_${uniqueId}`;
        return {
          id: fileUniqueId,
          name: displayName,
          size: formatBytes(b.size),
          sizeBytes: b.size,
          type: (displayName || '').split('.').pop() || 'unknown',
          date: b.creationMicros ? new Date(Number(b.creationMicros) / 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          hash: String(hashStr || ''),
          url: `${shelbyEndpoint}/blobs/${effectiveAddr}/${encodeURIComponent(blobNameSuffix)}`,
          accountAddr: effectiveAddr,
          blobName: blobNameSuffix,
          fullName,
          status: 'success',
        };
      });

      applyOnChainUpdate(mapped);
    } catch (e) {
      console.warn('[Shelby][OnChain] load blobs failed', {
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
      });
      if (flush) {
        // ensure stale files for this account are cleared when refresh fails
        setFiles((prev) => prev.filter((f) => f.accountAddr && f.accountAddr !== effectiveAddr));
      }
    }
  }, [shelbyClient, aptosAddress, shelbyEndpoint, backendUrl, shelbyApiKey]);

  // Load on-chain blobs on mount and when account changes
  useEffect(() => {
    loadOnChainBlobs();
  }, [loadOnChainBlobs]);

  const findWalletName = (preferred) => {
    const preferredLower = String(preferred || '').toLowerCase();
    const exact = wallets?.find((w) => String(w?.name || '').toLowerCase() === preferredLower);
    if (exact?.name) return exact.name;
    const partial = wallets?.find((w) => String(w?.name || '').toLowerCase().includes(preferredLower));
    return partial?.name || null;
  };

  const buildFileUrl = (file) => {
    if (file?.url) return file.url;
    if (!file?.accountAddr || !file?.blobName) return null;
    return `${shelbyEndpoint}/blobs/${file.accountAddr}/${encodeURIComponent(file.blobName)}`;
  };

  // Unique share link per file (no shared URL)
  const getShareLink = (file) => {
    if (!file?.id) return null;
    const baseUrl = window.location.origin;
    const rawName = file.name || file.blobName || file.fullName || 'file';
    // keep only filename part for slug
    const namePart = String(rawName).split('/').pop();
    const slug = String(namePart).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase();
    return `${baseUrl}/share/${slug}/${encodeURIComponent(file.id)}`;
  };

  const getDetailLink = (file) => {
    if (!file?.id) return null;
    const baseUrl = window.location.origin;
    const rawName = file.blobName || file.name || file.fullName || 'file';
    // Preserve path segments, but encode each safely
    const namePath = String(rawName)
      .split('/')
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    return `${baseUrl}/${namePath}/${encodeURIComponent(file.id)}`;
  };

  const closePreview = () => {
    if (previewAbortRef.current) {
      previewAbortRef.current.abort();
      previewAbortRef.current = null;
    }
    if (preview?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
  };

  const openPreview = async (file) => {
    const type = getPreviewType(file);
    if (!type) {
      setPreview({ file, type: null, url: null, loading: false, error: 'Preview not supported for this file type.' });
      return;
    }

    const fileUrl = buildFileUrl(file);
    if (!fileUrl) {
      setPreview({ file, type, url: null, loading: false, error: 'Missing file URL.' });
      return;
    }

    if (previewAbortRef.current) {
      previewAbortRef.current.abort();
      previewAbortRef.current = null;
    }

    if (preview?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url);
    }

    const controller = new AbortController();
    previewAbortRef.current = controller;
    setPreview({ file, type, url: null, loading: true, error: null });

    try {
      const res = await fetch(fileUrl, {
        method: 'GET',
        headers: shelbyApiKey ? { 'x-api-key': shelbyApiKey } : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Preview failed (HTTP ${res.status}).`);
      }
      const blob = await res.blob();
      if (controller.signal.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      previewAbortRef.current = null;
      setPreview({ file, type, url: objectUrl, loading: false, error: null });
    } catch (error) {
      if (controller.signal.aborted) return;
      previewAbortRef.current = null;
      setPreview({ file, type, url: null, loading: false, error: error?.message || 'Preview failed.' });
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const navigateTo = (view, file = null) => {
    if (file) {
      setSelectedFile(file);
      openPreview(file);
    } else {
      setSelectedFile(null);
      closePreview();
    }
    setCurrentView(view);
    // Update URL without hash
    let newPath = view === 'landing' ? '/' : `/${view}`;
    if (view === 'detail' && file) {
      const link = getDetailLink(file);
      if (link) newPath = link.replace(window.location.origin, '');
    }
    window.history.pushState({}, '', newPath);
    window.scrollTo(0, 0);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard!');
  };

  const connectPetra = async () => {
    if (!wallets?.length) {
      alert('No Petra wallet found. Please install Petra wallet.');
      window.open('https://petra.app/', '_blank');
      return;
    }
    const petraWallet = findWalletName('Petra');
    if (!petraWallet) {
      const available = wallets?.map((w) => w?.name).filter(Boolean).join(', ') || '(none)';
      alert(`Petra not found in Aptos Wallet Adapter. Available wallets: ${available}`);
      return;
    }
    
    // Check if wallet is on correct network
    const walletInfo = wallets.find(w => w.name === 'Petra');
    if (walletInfo?.networks?.length > 0) {
      const shelbynet = walletInfo.networks.find(n => 
        n.name?.toLowerCase().includes('shelby') || 
        n.chainId?.toString() === '5'
      );
      if (!shelbynet) {
        alert('Please switch your Petra wallet to Shelbynet network first.');
        return;
      }
    }
    
    try {
      await connectAptos(petraWallet);
      showNotification('Wallet Connected Successfully');
      if (currentView === 'landing') navigateTo('dashboard');
    } catch (error) {
      console.error('Petra connection error:', error);
      showNotification('Connection Failed', 'error');
    }
  };

  const disconnectWallet = (type) => {
    if (type === 'aptos') {
      try {
        disconnectAptos();
      } catch {
        // ignore
      }
    }
    navigateTo('landing');
    showNotification('Wallet Disconnected');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!aptosAddress) {
      showNotification('Please connect your wallet first!', 'error');
      connectPetra();
      return;
    }
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    if (!aptosAddress) {
      showNotification('Please connect your wallet first!', 'error');
      connectPetra();
      return;
    }
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = async (newFiles) => {
    if (!shelbyClient) {
      alert('Shelby client not initialized. Please check API key and endpoint, then reload.');
      return;
    }

    if (!aptosAddress) {
      const active = wallet?.name ? `Selected: ${wallet.name}. ` : '';
      alert(`${active}Aptos address required to upload. Please connect Petra wallet to create Aptos account.`);
      return;
    }

    if (!signAndSubmitTransaction) {
      alert('Aptos wallet does not support signing transactions. Please try Petra and ensure Wallet Standard is enabled.');
      return;
    }

    // Validate API key & signer before processing
    if (!shelbyApiKey) {
      alert('Missing SHELBY API key. Please set REACT_APP_SHELBY_API_KEY in .env and restart dev server.');
      setUploading(false);
      return;
    }
    if (!signAndSubmitTransaction) {
      alert('Aptos wallet does not support signing transactions. Please try Petra and ensure Wallet Standard is enabled.');
      setUploading(false);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Show helper alert for Petra simulation warning
    if (wallet?.name?.toLowerCase().includes('petra')) {
      const helper = document.createElement('div');
      helper.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;
        padding: 12px 16px; max-width: 320px; font-size: 14px; line-height: 1.5;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      `;
      helper.innerHTML = `
        <strong>⚠️ Petra Simulation Warning</strong><br>
        If you see "Type mismatch" simulation error, still click <strong>Approve</strong>.<br>
        Transaction will succeed and file will be uploaded.
      `;
      document.body.appendChild(helper);
      setTimeout(() => helper.remove(), 8000);
    }

    let successCount = 0;

    for (let index = 0; index < newFiles.length; index += 1) {
      const file = newFiles[index];
      // Create unique ID for uploaded files
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`;
      const cleanName = String(file?.name || 'file').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileUniqueId = `${cleanName}_${id}`;
      const safeOriginalName = String(file?.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const lastDot = safeOriginalName.lastIndexOf('.');
      const base = lastDot > 0 ? safeOriginalName.slice(0, lastDot) : safeOriginalName;
      const ext = lastDot > 0 ? safeOriginalName.slice(lastDot) : '';
      const sanitizedName = `${base.substring(0, 120) || 'file'}${ext}`;
      const blobName = sanitizedName;
      const accountAddr = aptosAddress;
      const getUrl = `${shelbyEndpoint}/blobs/${accountAddr}/${encodeURIComponent(blobName)}`;
      const fullName = `@${accountAddr}/${blobName}`;

      const entryBase = {
        id: fileUniqueId,
        name: file.name,
        size: formatBytes(file.size),
        sizeBytes: file.size,
        type: file.type.split('/')[0],
        date: new Date().toISOString().split('T')[0],
        hash: '(pending)',
        url: getUrl,
        accountAddr,
        blobName,
        fullName,
        status: 'uploading',
      };

      setFiles((prev) => [entryBase, ...prev]);

      try {
        const arrayBuffer = await file.arrayBuffer();
        ensureWebCrypto();
        const bufferData = Buffer.from(arrayBuffer);

        const provider = await getErasureProvider();
        let commitments;
        try {
          commitments = await generateCommitments(provider, bufferData);
        } catch (e) {
          console.error('[Shelby][Commitments] Failed to generate commitments', {
            error: e?.message,
            name: e?.name,
            stack: e?.stack,
            fileName: file.name,
            dataSize: bufferData.length,
          });
          throw e;
        }

        const expirationMicros = (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000;

        const payload = ShelbyBlobClient.createRegisterBlobPayload({
          account: aptosAddress,
          blobName: sanitizedName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros,
          blobSize: file.size,
        });

        const transactionSubmitted = await signAndSubmitTransaction({ data: payload });
        await aptos.waitForTransaction({ transactionHash: transactionSubmitted.hash });

        await shelbyClient.rpc.putBlob({
          account: aptosAddress,
          blobName: sanitizedName,
          blobData: new Uint8Array(arrayBuffer),
        });

        const next = {
          ...entryBase,
          status: 'success',
          hash: commitments.blob_merkle_root || 'OK',
        };

        setFiles((prev) => prev.map((f) => (f.id === id ? next : f)));
        successCount += 1;
      } catch (error) {
        console.error('[Shelby][Upload] Exception', {
          file: file.name,
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
          errorName: error?.name,
        });
        // Remove failed upload from the list
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }

      const progress = Math.round(((index + 1) / newFiles.length) * 100);
      setUploadProgress(progress);
    }

    if (successCount > 0) {
      const message = successCount === newFiles.length
        ? 'Files uploaded successfully'
        : `Uploaded ${successCount} of ${newFiles.length} files`;
      showNotification(message);
    } else if (newFiles.length > 0) {
      showNotification('Upload failed. Please try again.', 'error');
    }

    try {
      await loadOnChainBlobs({ flush: true, keepCache: true });
      // Retry once shortly after to capture eventual consistency
      setTimeout(() => {
        loadOnChainBlobs({ flush: true, keepCache: true }).catch(() => {});
      }, 2000);
    } catch (e) {
      console.warn('[Shelby][Upload] refresh on-chain failed', e);
    }

    navigateTo('dashboard');

    setUploading(false);
  };

  const openFileFromShelby = async (file) => {
    if (!file?.accountAddr || !file?.blobName) return;

    try {
      const url = `${shelbyEndpoint}/blobs/${file.accountAddr}/${encodeURIComponent(file.blobName)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...(shelbyApiKey ? { 'x-api-key': shelbyApiKey } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[Shelby][Download] Failed', { name: file.name, status: res.status, body: text });
        alert(`Download failed (HTTP ${res.status}).`);
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error('[Shelby][Download] Exception', { name: file?.name, error });
      alert('Error downloading file. Check console for details.');
    }
  };

  const deleteFile = async (file) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    if (!file?.blobName) return;
    if (!aptosAddress || !signAndSubmitTransaction) {
      alert('Please connect your Petra wallet to delete files.');
      return;
    }

    try {
      const payload = ShelbyBlobClient.createDeleteBlobPayload({
        blobNameSuffix: String(file.blobName),
      });
      const transactionSubmitted = await signAndSubmitTransaction({ data: payload });
      await aptos.waitForTransaction({ transactionHash: transactionSubmitted.hash });
      setFiles((prev) => prev.filter((f) => `${f.accountAddr}/${f.blobName}` !== `${file.accountAddr}/${file.blobName}`));
      deletedKeysRef.current.add(`${file.accountAddr}/${file.blobName}`);
      setSelectedFile(null);
      closePreview();
      await loadOnChainBlobs({ flush: true });
      navigateTo('dashboard');
    } catch (error) {
      console.error('[Shelby][Delete] Exception', { file: file?.name, error });
      alert(`Delete failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const getFileIcon = (fileOrType, size = 24) => {
    const typeValue = typeof fileOrType === 'string' ? fileOrType : getPreviewType(fileOrType) || fileOrType?.type;
    const raw = String(typeValue || '').toLowerCase();
    const base = raw.includes('/') ? raw.split('/')[0] : raw;

    if (base === 'image' || IMAGE_EXTENSIONS.has(raw)) {
      return <Image size={size} className="text-pink-400" />;
    }
    if (base === 'audio' || AUDIO_EXTENSIONS.has(raw)) {
      return <Music size={size} className="text-fuchsia-400" />;
    }
    if (base === 'video' || VIDEO_EXTENSIONS.has(raw)) {
      return <Video size={size} className="text-rose-400" />;
    }
    if (base === 'pdf' || raw.includes('pdf') || PDF_EXTENSIONS.has(raw)) {
      return <FileText size={size} className="text-purple-400" />;
    }
    return <File size={size} className="text-zinc-400" />;
  };

  const formatBytes = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const toHexMaybe = (val) => {
    try {
      return Hex.fromHexInput(val).toString();
    } catch {
      return null;
    }
  };

  const cleanHash = (bOrHash) => {
    const b = bOrHash || {};
    // blobMerkleRoot is primary according to specs
    if (b?.blobMerkleRoot) {
      return toHexMaybe(b.blobMerkleRoot) || String(b.blobMerkleRoot);
    }
    // blob_commitment (string or bytes)
    if (b?.blob_commitment) {
      const bc = b.blob_commitment;
      if (typeof bc === 'string') return bc;
      if (bc?.bytes) return toHexMaybe(bc.bytes) || String(bc.bytes);
    }
    // fallback to hash field
    const hash = b?.hash ?? b;
    if (!hash) return '(unknown)';
    if (typeof hash === 'string') return hash;
    if (Array.isArray(hash)) {
      const vals = hash.map((v) => (v == null ? '' : String(v))).join('');
      if (vals) return vals;
    }
    // Typed arrays / ArrayBuffer
    if (typeof ArrayBuffer !== 'undefined') {
      if (hash instanceof Uint8Array) {
        return toHexMaybe(hash) || Array.from(hash).join(',');
      }
      if (ArrayBuffer.isView && ArrayBuffer.isView(hash) && hash.buffer) {
        const ua = new Uint8Array(hash.buffer);
        return toHexMaybe(ua) || Array.from(ua).join(',');
      }
      if (hash instanceof ArrayBuffer) {
        const ua = new Uint8Array(hash);
        return toHexMaybe(ua) || Array.from(ua).join(',');
      }
    }
    if (typeof hash === 'object') {
      if (hash.data) return String(hash.data);
      if (hash.bytes) return toHexMaybe(hash.bytes) || String(hash.bytes);
      if (hash.hash) return String(hash.hash);
      if (hash.value) return String(hash.value);
      if (hash.hex) return String(hash.hex);
      if (hash.inner) return String(hash.inner);
      if (hash.vec && Array.isArray(hash.vec) && hash.vec[0]) return String(hash.vec[0]);
      if (hash.uint128) return String(hash.uint128);
      if (hash.uint64) return String(hash.uint64);
      // object with numeric keys (e.g. {0:...,1:...})
      const keys = Object.keys(hash);
      if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
        const vals = keys
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => (hash[k] == null ? '' : String(hash[k])))
          .join('');
        if (vals) return vals;
      }
    }
    return String(hash);
  };

  const shortenAddress = (addr) => {
    if (!addr) return '';
    const s = typeof addr === 'string' ? addr : String(addr || '');
    if (s.length <= 10) return s;
    return `${s.substring(0, 6)}...${s.substring(s.length - 4)}`;
  };

  const shortenUrl = (url) => {
    if (!url) return '';
    const s = String(url);
    if (s.length <= 38) return s;
    const [base, query] = s.split('?');
    const q = query ? `?${query}` : '';
    const shortBase = base.length > 22 ? `${base.slice(0, 14)}...${base.slice(-6)}` : base;
    const shortQuery = q.length > 14 ? `${q.slice(0, 10)}...${q.slice(-4)}` : q;
    const combined = `${shortBase}${shortQuery}`;
    return combined.length > 42 ? `${combined.slice(0, 20)}...${combined.slice(-8)}` : combined;
  };

  const totalBytes = files.reduce((acc, f) => acc + (Number(f.sizeBytes) || 0), 0);

  // Get current network name for display
  const getNetworkStatus = () => {
    const walletInfo = wallets.find(w => w.name === wallet?.name);
    if (walletInfo?.networks?.length > 0) {
      const currentNetwork = walletInfo.networks.find(n => 
        n.name?.toLowerCase().includes('shelby') || 
        n.chainId?.toString() === '5'
      );
      if (currentNetwork) {
        return { label: 'Shelbynet', status: 'Online', isCorrect: true };
      }
      // Show actual network name if not Shelbynet
      const actualNetwork = walletInfo.networks[0];
      return { 
        label: actualNetwork?.name || 'Unknown', 
        status: 'Wrong Network', 
        isCorrect: false 
      };
    }
    return { label: 'Shelbynet', status: 'Online', isCorrect: true };
  };

  const networkInfo = getNetworkStatus();

  const NotificationToast = () => (
    notification ? (
      <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div
          className={`border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${
            notification.type === 'error'
              ? 'bg-red-950/90 border-red-800 text-white'
              : 'bg-zinc-900/90 border-zinc-800 text-white'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              notification.type === 'error' ? 'bg-red-500' : 'bg-pink-500'
            } animate-pulse`}
          ></div>
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      </div>
    ) : null
  );

  const LandingPage = () => (
    <div className="animate-in fade-in duration-700">
      <div className="relative overflow-hidden pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 text-pink-400 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-sm shadow-xl">
            <span className="flex h-1.5 w-1.5 rounded-full bg-pink-500 animate-ping"></span>
            SH.Storage
          </div>

          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tight mb-8 leading-[1.1]">
            Store Data <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600">
              Beyond Limits
            </span>
          </h1>

          <p className="mt-6 text-xl text-zinc-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            Experience the next evolution of decentralized storage. Drag, drop, and secure your digital assets forever on
            the blockchain.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button
                onClick={() => navigateTo('dashboard')}
                className="group px-8 py-4 bg-white text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
              >
                Launch App <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            <button onClick={() => window.open('https://docs.shelby.xyz/', '_blank')} className="px-8 py-4 bg-zinc-900/50 backdrop-blur-md text-white border border-zinc-700 rounded-full font-bold text-lg hover:bg-zinc-800 transition-all">
              Documentation
            </button>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse animation-delay-2000"></div>
        </div>
      </div>

      <div className="border-t border-zinc-800 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Unbreakable Encryption',
                desc: 'Client-side AES-256 encryption ensures your data remains private before it even leaves your device.',
              },
              {
                icon: Zap,
                title: 'Fiber-Optic Speed',
                desc: "Powered by Shelby's dedicated high-performance network backbone for millisecond latency.",
              },
              {
                icon: Globe,
                title: 'Permanent Storage',
                desc: 'Data is erasure-coded and distributed across thousands of nodes, guaranteeing 99.999% availability.',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group p-10 bg-zinc-900/20 rounded-[2rem] border border-zinc-800 hover:border-pink-500/30 hover:bg-zinc-900/60 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-900/10"
              >
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 mb-8 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-pink-500 group-hover:to-purple-600 group-hover:text-white transition-all duration-300 shadow-lg">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed text-lg">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const Dashboard = () => {
    const stats = [
      {
        label: 'Storage Used',
        value: formatBytes(totalBytes),
        icon: HardDrive,
        style: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      },
      {
        label: 'Total Files',
        value: files.length,
        icon: File,
        style: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      },
      {
        label: networkInfo.label,
        value: networkInfo.status,
        icon: Globe,
        style: networkInfo.isCorrect 
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        extra: networkInfo.isCorrect,
      },
    ];

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900/40 backdrop-blur-md p-6 rounded-3xl border border-zinc-800/50 flex items-center gap-5 hover:bg-zinc-900/60 transition-colors"
            >
              <div className={`p-4 rounded-2xl border ${stat.style}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                  {stat.value}
                  {stat.extra && (
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      networkInfo.isCorrect 
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    }`}></span>
                  )}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">Upload Assets</h2>
            <span className="text-zinc-500 text-sm">Supported: PDF, IMG, MP4, MP3</span>
          </div>

          <div
            className={`relative group cursor-pointer transition-all duration-500 ease-out
              ${isDragging
                ? 'bg-zinc-900 border-pink-500 scale-[1.01] shadow-[0_0_30px_rgba(236,72,153,0.1)]'
                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
              }
              border-2 border-dashed rounded-[2rem] h-80 flex flex-col items-center justify-center text-center p-8 overflow-hidden`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!aptosAddress) {
                showNotification('Please connect your wallet first!', 'error');
                connectPetra();
                return;
              }
              document.getElementById('fileInput')?.click();
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <input type="file" id="fileInput" className="hidden" multiple onChange={handleFileSelect} />

            {uploading ? (
              <div className="flex flex-col items-center z-10 w-full max-w-md">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Encrypting & Uploading...</h3>
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-zinc-500 mt-2 text-sm">{uploadProgress}% Complete</p>
              </div>
            ) : (
              <div className="z-10 flex flex-col items-center">
                <div
                  className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 transition-all duration-300 ${
                    isDragging
                      ? 'bg-pink-500 text-white shadow-lg scale-110'
                      : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white group-hover:scale-105'
                  }`}
                >
                  <Upload size={32} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Drop files here</h3>
                <p className="text-zinc-400 text-base max-w-sm">or click to browse from your device</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-[2rem] border border-zinc-800 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-pink-500" /> Recent Files
              </h2>
              <div className="flex items-center gap-2 bg-zinc-900/60 px-2 py-1 rounded-xl border border-zinc-800">
                {['all', 'video', 'image', 'other'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setRecentFilter(f)}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                      recentFilter === f
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative group w-full md:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-pink-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by name, hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-80 pl-11 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/50 text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-950/30 text-zinc-500 text-xs uppercase font-bold tracking-wider border-b border-zinc-800">
                  <th className="p-6 pl-8">Name</th>
                  <th className="p-6">Timestamp</th>
                  <th className="p-6">Size</th>
                  <th className="p-6 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {recentSorted.slice((page - 1) * 10, page * 10).map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    onClick={() => navigateTo('detail', file)}
                  >
                    <td className="p-6 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 group-hover:border-pink-500/30 transition-colors">
                          {getFileIcon(file, 24)}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-200 group-hover:text-pink-400 transition-colors block mb-1 text-base">
                            {file.name || file.blobName || 'Unnamed file'}
                          </span>
                          <span className="text-xs text-zinc-500 flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/60">
                              {file.type || 'unknown'}
                            </span>
                            {(() => {
                              const account = file.accountAddr || '';
                              const name = file.blobName || file.name || '';
                              const hashText = cleanHash(file);
                              const explorerText = account && name
                                ? `https://explorer.shelby.xyz/shelbynet/account/${encodeURIComponent(account)}/blobs?name=${encodeURIComponent(name)}`
                                : hashText;
                              const shortName = name && name.length > 14 ? `${name.slice(0, 8)}...${name.slice(-4)}` : name;
                              const displayShort = account && name
                                ? `${shortenAddress(account)}/${shortName || '(unnamed)'}`
                                : hashText;
                              return (
                                <span className="truncate max-w-[260px] text-pink-400/70" title={explorerText}>
                                  CID: {displayShort}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 align-top text-zinc-300 whitespace-nowrap">{file.date || '-'}</td>
                    <td className="p-6 align-top text-zinc-300">{file.size}</td>
                    <td className="p-6 pr-8 text-right align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openFileFromShelby(file);
                          }}
                          className="p-2 text-zinc-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            const account = file.accountAddr || '';
                            const name = file.blobName || file.name || '';
                            const explorerUrl = account && name
                              ? `https://explorer.shelby.xyz/shelbynet/account/${encodeURIComponent(account)}/blobs?name=${encodeURIComponent(name)}`
                              : `https://explorer.shelby.xyz/shelbynet/hash/${encodeURIComponent(cleanHash(file) || '')}`;
                            window.open(explorerUrl, '_blank');
                          }}
                          className="p-2 text-zinc-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all"
                          title="View in Explorer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteFile(file);
                          }}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 text-sm text-zinc-400">
            <div>
              Page {page} / {Math.max(1, Math.ceil((recentSorted.length || 0) / 10))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`px-3 py-2 rounded-lg border ${page <= 1 ? 'border-zinc-800 text-zinc-600' : 'border-zinc-700 text-zinc-200 hover:border-pink-500 hover:text-white'} transition-colors`}
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => {
                  const total = Math.max(1, Math.ceil((recentSorted.length || 0) / 10));
                  return Math.min(total, p + 1);
                })}
                disabled={page >= Math.max(1, Math.ceil((recentSorted.length || 0) / 10))}
                className={`px-3 py-2 rounded-lg border ${page >= Math.max(1, Math.ceil((recentSorted.length || 0) / 10)) ? 'border-zinc-800 text-zinc-600' : 'border-zinc-700 text-zinc-200 hover:border-pink-500 hover:text-white'} transition-colors`}
              >
                Next
              </button>
            </div>
          </div>

          {recentSorted.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                <File size={32} className="text-zinc-600" />
              </div>
              <h3 className="text-zinc-300 font-bold text-lg">No files stored yet</h3>
              <p className="text-zinc-500 mt-2">Upload your first file to get started</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const UploadPage = () => {
    return (
      <div className="animate-in fade-in duration-500 pb-20">
        <button
          onClick={() => navigateTo('dashboard')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 font-medium transition-colors group"
        >
          <div className="p-2 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition-colors border border-zinc-800">
            <ArrowLeft size={18} />
          </div>
          Back to Dashboard
        </button>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Upload Files</h1>
            <p className="text-zinc-400 text-lg">Securely store your files on the blockchain</p>
          </div>

          <div
            className={`relative group cursor-pointer transition-all duration-500 ease-out
              ${isDragging
                ? 'bg-zinc-900 border-pink-500 scale-[1.01] shadow-[0_0_30px_rgba(236,72,153,0.1)]'
                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
              }
              border-2 border-dashed rounded-[2rem] h-96 flex flex-col items-center justify-center text-center p-8 overflow-hidden`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!aptosAddress) {
                showNotification('Please connect your wallet first!', 'error');
                connectPetra();
                return;
              }
              document.getElementById('fileInput')?.click();
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <input type="file" id="fileInput" className="hidden" multiple onChange={handleFileSelect} />

            {uploading ? (
              <div className="flex flex-col items-center z-10 w-full max-w-md">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Encrypting & Uploading...</h3>
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-zinc-500 mt-2 text-sm">{uploadProgress}% Complete</p>
              </div>
            ) : (
              <div className="z-10 flex flex-col items-center">
                <div
                  className={`w-24 h-24 rounded-[1.5rem] flex items-center justify-center mb-8 transition-all duration-300 ${
                    isDragging
                      ? 'bg-pink-500 text-white shadow-lg scale-110'
                      : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white group-hover:scale-105'
                  }`}
                >
                  <Upload size={40} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Drop files here</h3>
                <p className="text-zinc-400 text-lg max-w-sm mb-4">or click to browse from your device</p>
                <div className="text-zinc-500 text-sm">
                  Supported formats: PDF, Images (JPG, PNG, GIF), Videos (MP4, WebM), Audio (MP3, WAV)
                </div>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Uploads</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {files.slice(0, 6).map((file) => (
                  <div key={file.id} className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-6 hover:border-pink-500/30 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-zinc-800 rounded-xl">
                        {getFileIcon(file, 24)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{file.name}</p>
                        <p className="text-zinc-500 text-sm">{file.size}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigateTo('detail', file)}
                        className="flex-1 px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          const url = getShareLink(file);
                          if (url) {
                            navigator.clipboard.writeText(url);
                            showNotification('Share link copied!');
                          }
                        }}
                        className="px-3 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SettingsPage = () => {
    return (
      <div className="animate-in fade-in duration-500 pb-20">
        <button
          onClick={() => navigateTo('dashboard')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 font-medium transition-colors group"
        >
          <div className="p-2 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition-colors border border-zinc-800">
            <ArrowLeft size={18} />
          </div>
          Back to Dashboard
        </button>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Settings</h1>
            <p className="text-zinc-400 text-lg">Manage your account and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Wallet Information</h2>
                
                {aptosAddress ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
                      <span className="text-zinc-400">Connected Address</span>
                      <div className="flex items-center gap-2">
                        <code className="text-pink-400 font-mono">{shortenAddress(aptosAddress)}</code>
                        <button
                          onClick={() => copyToClipboard(aptosAddress)}
                          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
                      <span className="text-zinc-400">Network</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        networkInfo.isCorrect 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {networkInfo.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
                      <span className="text-zinc-400">Storage Used</span>
                      <span className="text-white font-medium">{formatBytes(totalBytes)}</span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
                      <span className="text-zinc-400">Total Files</span>
                      <span className="text-white font-medium">{files.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wallet size={48} className="text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-4">No wallet connected</p>
                    <button
                      onClick={connectPetra}
                      className="px-6 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-colors"
                    >
                      Connect Wallet
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
                    <div>
                      <h3 className="text-white font-medium">Notifications</h3>
                      <p className="text-zinc-500 text-sm">Receive notifications for uploads and shares</p>
                    </div>
                    <button className="w-12 h-6 bg-pink-600 rounded-full relative transition-colors">
                      <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
                    <div>
                      <h3 className="text-white font-medium">Auto-preview</h3>
                      <p className="text-zinc-500 text-sm">Automatically preview supported file types</p>
                    </div>
                    <button className="w-12 h-6 bg-pink-600 rounded-full relative transition-colors">
                      <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
                    <div>
                      <h3 className="text-white font-medium">Dark Mode</h3>
                      <p className="text-zinc-500 text-sm">Use dark theme (always enabled)</p>
                    </div>
                    <button className="w-12 h-6 bg-zinc-700 rounded-full relative opacity-50" disabled>
                      <span className="absolute left-1 top-1 w-4 h-4 bg-zinc-500 rounded-full"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8">
                <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.hash = 'upload'}
                    className="w-full p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Upload size={20} className="text-pink-500" />
                      <span className="text-white group-hover:text-pink-400 transition-colors">Upload Files</span>
                    </div>
                  </button>

                  <button
                    onClick={() => window.location.hash = 'dashboard'}
                    className="w-full p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard size={20} className="text-purple-500" />
                      <span className="text-white group-hover:text-purple-400 transition-colors">View Dashboard</span>
                    </div>
                  </button>

                  <button
                    onClick={() => window.open('https://docs.shelby.xyz/', '_blank')}
                    className="w-full p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-zinc-500" />
                      <span className="text-white group-hover:text-zinc-400 transition-colors">Documentation</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8">
                <h2 className="text-xl font-bold text-white mb-6">About</h2>
                
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Version</span>
                    <span className="text-white">2.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Network</span>
                    <span className="text-white">Shelbynet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">API</span>
                    <span className="text-white">Shelby Protocol</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <button
                    onClick={() => disconnectWallet('aptos')}
                    className="w-full p-3 bg-red-500/10 text-red-400 rounded-xl font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AboutPage = () => {
    return (
      <div className="animate-in fade-in duration-500 pb-20">
        <button
          onClick={() => navigateTo('landing')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 font-medium transition-colors group"
        >
          <div className="p-2 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition-colors border border-zinc-800">
            <ArrowLeft size={18} />
          </div>
          Back to Home
        </button>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-6">About SH.Storage</h1>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
              Decentralized storage powered by Shelby Protocol. Store your data securely on the blockchain with military-grade encryption.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                We believe in a future where data ownership is fundamental. SH.Storage empowers individuals and businesses to take control of their digital assets through decentralized storage technology.
              </p>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Built on the Shelby Protocol, our platform ensures your files are encrypted, distributed, and permanently accessible without relying on centralized servers.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Key Features</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield size={24} className="text-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Military-Grade Encryption</h3>
                    <p className="text-zinc-400">Client-side AES-256 encryption ensures your data remains private before it leaves your device.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap size={24} className="text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
                    <p className="text-zinc-400">Optimized for speed with fiber-optic network backbone and intelligent caching.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Globe size={24} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Permanent Storage</h3>
                    <p className="text-zinc-400">Data is erasure-coded and distributed across thousands of nodes for 99.999% availability.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-800 p-12 mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Technology Stack</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HardDrive size={36} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Shelby Protocol</h3>
                <p className="text-zinc-400">Advanced decentralized storage protocol with built-in encryption and redundancy.</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wallet size={36} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Aptos Blockchain</h3>
                <p className="text-zinc-400">Secure, scalable blockchain for transaction validation and metadata storage.</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText size={36} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Smart Contracts</h3>
                <p className="text-zinc-400">Automated access control and file management through programmable contracts.</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-8">Get Started</h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => navigateTo('dashboard')}
                className="px-8 py-4 bg-pink-600 text-white rounded-full font-bold text-lg hover:bg-pink-700 transition-colors shadow-lg shadow-pink-900/20"
              >
                Launch App
              </button>
              <button
                onClick={() => window.open('https://docs.shelby.xyz/', '_blank')}
                className="px-8 py-4 bg-zinc-900/50 backdrop-blur-md text-white border border-zinc-700 rounded-full font-bold text-lg hover:bg-zinc-800 transition-all"
              >
                Read Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SharePage = () => {
    const file = shareHash ? findFileById(shareHash) : null;
    const shareNotifiedRef = useRef(false);
    
    useEffect(() => {
      if (!shareHash) return;
      if (!file && files.length > 0 && !shareNotifiedRef.current) {
        shareNotifiedRef.current = true;
        showNotification('File not found', 'error');
      }
      if (file) {
        shareNotifiedRef.current = true;
      }
    }, [shareHash, file, files]);

    if (!file) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <File size={32} className="text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">File not found</h2>
            <p className="text-zinc-400 mb-6">The file you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/share');
                setShareHash(null);
                setCurrentView('landing');
              }}
              className="px-6 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    // Set selectedFile for SharePage
    useEffect(() => {
      if (file && (!selectedFile || selectedFile.hash !== file.hash)) {
        setSelectedFile(file);
        openPreview(file);
      }
    }, [file]);

    return <FileDetail isSharePage={true} />;
  };

  const FileDetail = ({ isSharePage = false } = {}) => {
    if (!selectedFile) return null;

    // Ensure preview fetch kicks even when arriving via direct URL without wallet
    useEffect(() => {
      const matches =
        preview &&
        (preview.file?.id === selectedFile.id ||
          (preview.file?.blobName && preview.file?.blobName === selectedFile.blobName));
      if (!matches) {
        openPreview(selectedFile);
      }
    }, [selectedFile, preview]);

    const previewMatches = preview && (
      preview.file?.id === selectedFile.id ||
      (preview.file?.blobName && preview.file?.blobName === selectedFile.blobName)
    );
    const previewData = previewMatches ? preview : null;
    const fileTypeLabel = (() => {
      const rawType = String(selectedFile.type || '');
      if (rawType.includes('/')) return rawType.split('/')[1];
      const ext = getFileExtension(selectedFile.name || selectedFile.blobName || selectedFile.fullName);
      return ext || rawType || 'unknown';
    })();
    const shareUrl = buildFileUrl(selectedFile) || selectedFile.url;
    const synced = selectedFile.status === 'success' || !selectedFile.status;

    const renderPreview = () => {
      if (!previewData || previewData.loading) {
        return (
          <div className="flex flex-col items-center justify-center text-zinc-500 h-full">
            <div className="w-16 h-16 border-2 border-zinc-700 border-t-pink-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm">Loading preview...</p>
          </div>
        );
      }

      if (previewData.error) {
        return (
          <div className="flex flex-col items-center justify-center text-zinc-500 h-full px-6">
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={40} className="text-zinc-600" />
            </div>
            <p className="text-zinc-300 font-semibold">Preview unavailable</p>
            <p className="text-zinc-500 text-sm mt-2 text-center">{previewData.error}</p>
            <button
              onClick={() => openFileFromShelby(selectedFile)}
              className="mt-4 text-pink-500 hover:underline"
            >
              Download to view
            </button>
          </div>
        );
      }

      if (previewData.type === 'image') {
        return <img src={previewData.url} alt={selectedFile.name} className="w-full h-full object-contain" />;
      }

      if (previewData.type === 'video') {
        return (
          <video
            key={previewData.url}
            controls
            autoPlay
            muted
            playsInline
            className="w-full h-full rounded-2xl bg-black outline-none"
          >
            <source src={previewData.url} />
            Your browser does not support the video tag.
          </video>
        );
      }

      if (previewData.type === 'audio') {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
            <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
              <Music size={40} className="text-pink-500" />
            </div>
            <audio key={previewData.url} controls autoPlay className="w-full max-w-md">
              <source src={previewData.url} />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      }

      if (previewData.type === 'pdf') {
        return (
          <iframe
            src={previewData.url}
            className="w-full h-full rounded-2xl bg-white"
            title="PDF Preview"
          ></iframe>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center text-zinc-500 h-full">
          <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <FileText size={40} className="text-zinc-600" />
          </div>
          <p>Preview not supported for this file type.</p>
          <button
            onClick={() => openFileFromShelby(selectedFile)}
            className="mt-4 text-pink-500 hover:underline"
          >
            Download to view
          </button>
        </div>
      );
    };

    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-20">
        {!isSharePage && (
          <button
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 font-medium transition-colors group"
          >
            <div className="p-2 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition-colors border border-zinc-800">
              <ArrowLeft size={18} />
            </div>
            Back to Dashboard
          </button>
        )}

        <div className="bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl">
          <div className="flex flex-col lg:flex-row h-full lg:h-[80vh]">
            <div className="lg:w-2/3 bg-black/40 border-r border-zinc-800 p-6 flex flex-col">
              <div className="flex-1 rounded-2xl overflow-hidden bg-zinc-950/50 flex items-center justify-center relative border border-zinc-800/50 shadow-inner">
                {renderPreview()}
              </div>
              <div className="mt-4 flex justify-between items-center px-2">
                <p className="text-zinc-500 text-sm">Preview Mode • {fileTypeLabel}</p>
                <button
                  onClick={() => {
                    if (previewData?.url) window.open(previewData.url, '_blank');
                    else showNotification('Preview not ready yet', 'error');
                  }}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>

            <div className="lg:w-1/3 p-8 flex flex-col overflow-y-auto">
              <div className="mb-8">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider mb-4 ${
                    synced
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  }`}
                >
                  <CheckCircle2 size={12} /> {synced ? 'Synced on Chain' : 'Pending Upload'}
                </div>
                <h1 className="text-2xl font-bold text-white mb-2 leading-tight break-words">
                  {selectedFile.name || selectedFile.blobName}
                </h1>
                <p className="text-zinc-400 text-sm">{selectedFile.date}</p>
              </div>

              <div className="space-y-6 flex-1">
                <div className="p-5 bg-black/20 rounded-2xl border border-zinc-800">
                  <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wide">Description</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {selectedFile.description || 'No description provided for this file.'}
                  </p>
                </div>

                <div className="p-5 bg-black/20 rounded-2xl border border-zinc-800 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">File Details</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Size</span>
                    <span className="text-zinc-200 font-mono">{selectedFile.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Type</span>
                    <span className="text-zinc-200 font-mono uppercase truncate max-w-[150px]">{fileTypeLabel}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-sm block mb-1">CID/Hash</span>
                    {(() => {
                      const account = selectedFile.accountAddr || '';
                      const name = selectedFile.blobName || selectedFile.name || '';
                      const hashText = cleanHash(selectedFile);
                      const explorerText = account && name
                        ? `https://explorer.shelby.xyz/shelbynet/account/${encodeURIComponent(account)}/blobs?name=${encodeURIComponent(name)}`
                        : hashText;
                      const shortName = name && name.length > 14 ? `${name.slice(0, 8)}...${name.slice(-4)}` : name;
                      const displayShort = account && name
                        ? `${shortenAddress(account)}/${shortName || '(unnamed)'}`
                        : hashText;
                      return (
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 cursor-pointer hover:border-pink-500/30 group flex-1"
                            onClick={() => copyToClipboard(explorerText)}
                          >
                            <code className="text-xs text-pink-400 font-mono truncate flex-1" title={explorerText}>{displayShort}</code>
                            <Copy size={12} className="text-zinc-600 group-hover:text-white" />
                          </div>
                          <button
                            onClick={() => {
                              const explorerUrl = account && name
                                ? `https://explorer.shelby.xyz/shelbynet/account/${encodeURIComponent(account)}/blobs?name=${encodeURIComponent(name)}`
                                : `https://explorer.shelby.xyz/shelbynet/hash/${encodeURIComponent(hashText || '')}`;
                              window.open(explorerUrl, '_blank');
                            }}
                            className="p-2 text-zinc-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all"
                            title="View in Explorer"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4">
                <button
                  onClick={() => openFileFromShelby(selectedFile)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl font-bold hover:bg-pink-500 hover:text-white transition-all shadow-lg hover:shadow-pink-500/20"
                >
                  <Download size={18} /> Download
                </button>
                <button
                  onClick={() => {
                    const url = getShareLink(selectedFile);
                    if (url) {
                      navigator.clipboard.writeText(url);
                      showNotification('Share link copied!');
                    } else {
                      showNotification('No share link available', 'error');
                    }
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
                  title="Copy Share Link"
                >
                  <Link2 size={18} />
                </button>
                <button
                  onClick={() => deleteFile(selectedFile)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-bold border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={18} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (currentView === 'share' && selectedFile) {
      document.title = `${selectedFile.name || 'File'} - SH.Storage`;
    } else if (currentView === 'landing') {
      document.title = 'SH.Storage - Decentralized Storage Beyond Limits';
    } else if (currentView === 'dashboard') {
      document.title = 'Dashboard - SH.Storage';
    } else {
      document.title = 'SH.Storage';
    }
  }, [currentView, selectedFile]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-pink-500/30 selection:text-pink-200">
      <NotificationToast />

      {currentView !== 'share' && (
        <header className="fixed w-full top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('landing')}>
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.3)] z-10 relative group-hover:rotate-12 transition-transform duration-300">
                    <HardDrive className="text-white w-5 h-5" />
                  </div>
                  <div className="absolute inset-0 bg-pink-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                </div>
                <span className="font-bold text-2xl tracking-tight text-white">
                  SH<span className="text-zinc-600">.</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">Storage</span>
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1.5 rounded-full border border-zinc-800">
                <button
                  onClick={() => navigateTo('landing')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    currentView === 'landing' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => navigateTo('dashboard')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    currentView === 'dashboard' || currentView === 'detail'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
              </nav>

              <div className="hidden md:flex items-center gap-4">
                {aptosAddress ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 pl-1 pr-2 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Wallet size={14} className="text-teal-900" />
                      </div>
                      <span className="text-sm font-medium text-zinc-200">{shortenAddress(aptosAddress)}</span>
                      <button
                        onClick={() => disconnectWallet('aptos')}
                        className="p-1.5 rounded-full bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 transition-colors ml-1"
                      >
                        <LogOut size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={connectPetra}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full text-sm font-bold hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-500 hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)]"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>

              <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden bg-black border-t border-zinc-800 p-4 space-y-4 animate-in slide-in-from-top-10 fixed w-full z-40">
              <button
                onClick={() => {
                  navigateTo('landing');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left p-4 rounded-2xl hover:bg-zinc-900 font-medium text-white flex items-center gap-3 border border-transparent hover:border-zinc-800"
              >
                <Globe size={20} className="text-zinc-500" /> Home
              </button>
              <button
                onClick={() => {
                  navigateTo('dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left p-4 rounded-2xl hover:bg-zinc-900 font-medium text-white flex items-center gap-3 border border-transparent hover:border-zinc-800"
              >
                <LayoutDashboard size={20} className="text-zinc-500" /> Dashboard
              </button>
              <div className="h-px bg-zinc-800 my-2"></div>
              {aptosAddress ? (
                <button
                  onClick={() => disconnectWallet('aptos')}
                  className="w-full p-4 bg-red-500/10 text-red-400 rounded-2xl font-medium border border-red-500/20"
                >
                  Disconnect Wallet
                </button>
              ) : (
                <button
                  onClick={connectPetra}
                  className="w-full p-4 bg-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-pink-900/50"
                >
                  Connect Petra Wallet
                </button>
              )}
            </div>
          )}
        </header>
      )}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 min-h-screen ${currentView === 'share' ? 'pt-8' : ''}`}>
        {(currentView === 'detail' || currentView === 'share') && !selectedFile && files.length === 0 && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-zinc-500">
            <div className="w-16 h-16 border-2 border-zinc-700 border-t-pink-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm">Loading...</p>
          </div>
        )}
        {currentView === 'landing' && <LandingPage />}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'detail' && <FileDetail />}
        {currentView === 'upload' && <UploadPage />}
        {currentView === 'settings' && <SettingsPage />}
        {currentView === 'about' && <AboutPage />}
        {currentView === 'share' && <SharePage />}
      </main>

      <footer className="border-t border-zinc-900 bg-black py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-pink-500 border border-zinc-800">
              <HardDrive size={18} />
            </div>
            <span className="font-bold text-white tracking-tight text-lg">
              SH<span className="text-zinc-600">.</span>Storage
            </span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="https://docs.shelby.xyz/" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors">Docs</a>
            <a href="https://x.com/trungkts29" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors">Author</a>
            <a href="#" className="hover:text-pink-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-pink-500 transition-colors">Support</a>
          </div>
          <p className="text-zinc-600 text-sm">© 2026 SH.Storage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
