import { AlertTriangle } from 'lucide-react';
import { useOrder } from '../context/OrderContext';

export function MountRatioBanner() {
  const { summary } = useOrder();
  if (!summary.mountRatioWarning) return null;

  return (
    <div className="alert alert-warning mount-ratio-banner">
      <AlertTriangle size={18} />
      <div>
        <strong>Mount ratio exceeds 150%</strong>
        <p>Mounts exceed 150% of plow equivalents. Volume discount may not qualify per program rules.</p>
      </div>
    </div>
  );
}
