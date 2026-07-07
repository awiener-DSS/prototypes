import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OrderProvider, useOrder } from './context/OrderContext';
import { PartPreviewProvider } from './context/PartPreviewContext';
import { PartPreviewModal } from './components/PartPreview';
import App from './App';
import './index.css';

function AppRoot() {
  const { catalog } = useOrder();
  return (
    <PartPreviewProvider catalog={catalog}>
      <App />
      <PartPreviewModal />
    </PartPreviewProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OrderProvider>
      <AppRoot />
    </OrderProvider>
  </StrictMode>,
);
