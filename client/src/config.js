// Configuration centralisée pour l'application

const DEFAULT_BACKEND_URL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3001'
    : 'https://uman-production.up.railway.app';

const isLegacyRenderUrl = (value) =>
  typeof value === 'string' && value.includes('uman.onrender.com');

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// URL du backend (sans /api)
export const BACKEND_URL = isLegacyRenderUrl(rawBackendUrl)
  ? DEFAULT_BACKEND_URL
  : rawBackendUrl;

// URL de base pour l'API backend
export const API_BASE_URL =
  !rawApiBaseUrl || isLegacyRenderUrl(rawApiBaseUrl)
    ? `${BACKEND_URL}/api`
    : rawApiBaseUrl;

// Worldcoin App ID
export const WORLDCOIN_APP_ID = import.meta.env.VITE_WORLDCOIN_APP_ID || '';

// Token contract address
export const TOKEN_CONTRACT_ADDRESS = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || '0x41Da2F787e0122E2e6A72fEa5d3a4e84263511a8';

// Vérifier si on est en production
export const IS_PRODUCTION = import.meta.env.MODE === 'production';

// Vérifier si on est en développement
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';

console.log('🔧 Configuration:', {
  mode: import.meta.env.MODE,
  apiBaseUrl: API_BASE_URL,
  backendUrl: BACKEND_URL,
  isProduction: IS_PRODUCTION
});
