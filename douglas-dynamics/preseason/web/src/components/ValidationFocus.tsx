import { useEffect } from 'react';
import { useOrder } from '../context/OrderContext';
import { scrollToValidationIssue } from '../lib/orderValidation';

/** Scrolls to the first validation issue after the target step renders. */
export function ValidationFocus() {
  const { validationIssues } = useOrder();

  useEffect(() => {
    if (validationIssues.length === 0) return;
    const timer = window.setTimeout(() => {
      scrollToValidationIssue(validationIssues[0]);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [validationIssues]);

  return null;
}
