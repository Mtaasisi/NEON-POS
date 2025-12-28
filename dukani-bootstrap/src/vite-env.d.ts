/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATABASE_URL: string
  readonly VITE_APP_ENV?: string
  readonly VITE_ENABLE_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
