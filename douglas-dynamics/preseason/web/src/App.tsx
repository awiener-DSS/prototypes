import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrder } from './context/OrderContext';
import { AdminCalcPanel, AdminToggle } from './components/AdminCalcPanel';
import { DealerInfoStep } from './components/DealerInfoStep';
import { FinalReview, OrderSummaryPanel } from './components/OrderSummary';
import { PartsStep, ProductStep, StepNav } from './components/Steps';
import { MobileSummaryBar } from './components/MobileSummaryBar';
import { MountRatioBanner } from './components/UsabilityBanners';
import { ValidationFocus } from './components/ValidationFocus';
import { TOTAL_STEPS } from './lib/stepConfig';
import configData from './data/config.json';
import './App.css';

function App() {
  const { step, setStep, program } = useOrder();

  const canGoNext = step < TOTAL_STEPS - 1;
  const canGoBack = step > 0;

  const programLabel =
    program === 'truck'
      ? `${configData.config.programYear} ${configData.config.programName}`
      : `${configData.config.programYear} ${configData.nonTruck.programName}`;

  const handleContinue = () => {
    setStep(step + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <img src={`${import.meta.env.BASE_URL}western-logo.svg`} alt="Western Products" className="header-logo" />
          <div className="header-text">
            <p className="header-eyebrow">{programLabel}</p>
            <h1>Preseason Order Form</h1>
          </div>
        </div>
        <div className="header-actions">
          <AdminToggle />
        </div>
      </header>

      <AdminCalcPanel />
      <ValidationFocus />
      <StepNav />

      <main className="app-main">
        <div className="form-area">
          {step === 0 && <DealerInfoStep />}
          {step === 1 && program === 'truck' && (
            <>
              <MountRatioBanner />
              <ProductStep
                catalogKeys={['blades', 'electrical']}
                title="Snowplows — Blades, Attachments, Mounts & Electrical"
                subtitle="Blades = ¼ unit · Attachments = ½ unit · Mounts = ¼ unit. Volume discounts at 75, 150, and 250+ units."
                showUnitEquiv
                showMountWarning
              />
            </>
          )}
          {step === 1 && program === 'nontruck' && (
            <ProductStep
              catalogKeys={['utvPlows', 'subcompactPlows', 'pusherPlows', 'tractorSkidSteerPlows']}
              title="Non-Truck Plows"
              subtitle="UTV, subcompact tractor, pusher, and tractor/skid-steer plows. Volume discounts based on total plow units."
              showUnitEquiv
            />
          )}
          {step === 2 && program === 'truck' && (
            <ProductStep
              catalogKeys={['hopper', 'tailgate']}
              title="Spreaders — Hopper & Tailgate"
              subtitle="Hopper volume: 5-34 (50% off list), 35-74 (53%), 75+ (55%). Tailgate: 10-29 (50%), 30+ (53%)."
            />
          )}
          {step === 2 && program === 'nontruck' && (
            <ProductStep
              catalogKeys={['hopper', 'tailgate', 'rotaryBroom']}
              title="Spreaders & Rotary Broom"
              subtitle="Hopper & drop spreaders, tailgate spreaders, and rotary broom products."
            />
          )}
          {step === 3 && <PartsStep />}
          {step === 4 && <FinalReview />}

          <div className="step-actions">
            {canGoBack && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={18} /> Back
              </button>
            )}
            {canGoNext && (
              <button type="button" className="btn btn-primary" onClick={handleContinue}>
                Continue <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        <aside className="sidebar">
          <OrderSummaryPanel />
        </aside>
      </main>

      <MobileSummaryBar />

      <footer className="app-footer">
        <p className="footer-tagline">MORE JOBS. <strong>DONE FASTER.</strong></p>
        <p className="footer-copy">© {new Date().getFullYear()} Douglas Dynamics, LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
