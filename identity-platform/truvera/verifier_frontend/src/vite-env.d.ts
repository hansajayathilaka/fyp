/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TRUVERA_API_URL: string
  readonly VITE_CUSTOM_INTEGRATION_ENABLED: string
  readonly VITE_DEFAULT_TIMEOUT_MINUTES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}