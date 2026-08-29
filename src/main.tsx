
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { queryClient } from './lib/queryClient'
import './index.css'
import App from './App.tsx'
import { UpdatePrompt } from './monapp/UpdatePrompt.tsx'

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

createRoot(document.getElementById('root')!).render(
  <PersistQueryClientProvider 
    client={queryClient}
    persistOptions={{ persister }}
  >
    <App />
    <UpdatePrompt />
  </PersistQueryClientProvider>,
)
