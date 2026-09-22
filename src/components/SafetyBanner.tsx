import { AlertTriangle, Info } from 'lucide-react';

export function SafetyBanner({ variant = 'info' }: { variant?: 'info' | 'warning' }) {
  if (variant === 'warning') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold mb-1">Symptoms require clinician review</p>
          <p>
            Your reported symptoms have been flagged for your doctor&apos;s attention. This app
            does not change your treatment plan. If symptoms are urgent, contact your healthcare
            provider directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-medical-50 border border-medical-200 rounded-lg p-4 flex gap-3">
      <Info className="w-5 h-5 text-medical-600 shrink-0 mt-0.5" />
      <div className="text-sm text-medical-900">
        <p className="font-semibold mb-1">Human-in-the-Loop Safety</p>
        <p>
          Your doctor creates and manages your rehabilitation plan. AI analyzes your data to
          support monitoring — it does not diagnose, prescribe, or make medical decisions.
          Alerts require clinician review.
        </p>
      </div>
    </div>
  );
}
