import { cn } from '../../utils/cn';

const STEPS = [
  { id: 'basic', label: 'Basics', icon: 'User' },
  { id: 'skills', label: 'Skills', icon: 'Briefcase' },
  { id: 'rates', label: 'Rates', icon: 'Currency' },
  { id: 'review', label: 'Review', icon: 'CheckCircle' },
];

export function StepProgress({ currentStep, className }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const completedSteps = STEPS.slice(0, currentIndex);

  return (
    <div className={cn('relative', className)}>
      <div className="absolute top-3 left-0 right-0 h-1.5 bg-zinc-200 overflow-hidden">
        <div
          className="h-full bg-primary-900 transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>

      <div className="relative flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  'relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted
                    ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/25'
                    : isCurrent
                    ? 'bg-primary-900 text-white ring-4 ring-primary-900/20 shadow-lg shadow-primary-900/25'
                    : 'bg-zinc-100 text-zinc-400'
                )}
              >
                {isCompleted ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              <p className={cn(
                'mt-2 text-xs font-medium text-center max-w-[70px]',
                isCurrent ? 'text-primary-900' : 'text-zinc-500'
              )}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StepIndicator({ steps, currentStep, className }) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  isCompleted
                    ? 'bg-primary-900 text-white'
                    : isCurrent
                    ? 'bg-primary-900 text-white ring-3 ring-primary-900/20'
                    : 'bg-zinc-100 text-zinc-400'
                )}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-1.5 flex-1 max-w-24 transition-all duration-300',
                    isCompleted ? 'bg-primary-900' : 'bg-zinc-200'
                  )}
                />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default StepProgress;