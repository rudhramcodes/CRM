import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { CheckCircle, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { ONBOARDING_STEPS, GUIDE_SECTIONS } from '../data/onboardingContent';
import { useGetClientMeQuery } from '../../../services/clientApi';
import { completeOnboarding } from '../../../app/store/authSlice';
import { cn } from '../../../utils/cn';

export default function OnboardingWizard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { data: me } = useGetClientMeQuery(undefined, { skip: user?.role !== 'client' });
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);

  const client = me?.data?.client || {};
  const total = ONBOARDING_STEPS.length;

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);
    const result = await dispatch(completeOnboarding());
    if (completeOnboarding.fulfilled.match(result)) {
      navigate('/portal', { replace: true });
    } else {
      setError(result.payload?.message || 'Something went wrong. Please try again.');
      setCompleting(false);
    }
  };

  const handleSkip = () => {
    navigate('/portal', { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-8 py-6">
          <div className="mb-6">
            <h1 className="font-heading text-xl font-semibold text-primary-900">
              {ONBOARDING_STEPS[step].title}
            </h1>
            <p className="text-sm text-zinc-500 mt-1 leading-relaxed max-w-lg">
              {ONBOARDING_STEPS[step].body}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors',
                    i < step
                      ? 'bg-green-500 text-white'
                      : i === step
                        ? 'bg-primary-900 text-white'
                        : 'bg-zinc-100 text-zinc-400',
                  )}
                >
                  {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < total - 1 && (
                  <div className={cn('h-0.5 flex-1 rounded', i < step ? 'bg-green-500' : 'bg-zinc-100')} />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {GUIDE_SECTIONS.map((section) => (
                <div key={section.key} className="rounded-xl border border-zinc-200 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-900/5 flex items-center justify-center mb-2">
                    <section.icon className="w-5 h-5 text-primary-900" />
                  </div>
                  <h3 className="text-sm font-semibold text-primary-900 mb-1">{section.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="rounded-xl border border-zinc-200 p-5 mb-6">
              <h3 className="text-sm font-semibold text-primary-900 mb-4">Your profile</h3>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-0.5">Company</p>
                  <p className="text-primary-900 font-medium">{client.companyName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-0.5">Contact person</p>
                  <p className="text-primary-900 font-medium">{client.contactPerson || user?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="text-primary-900 font-medium">{client.email || user?.email || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => (step === 0 ? handleSkip() : setStep((s) => s - 1))}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors px-2 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? 'Skip for now' : 'Back'}
            </button>

            {step < total - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 bg-primary-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary-800 transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={completing}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors',
                  completing
                    ? 'bg-primary-900/70 text-white/80 cursor-not-allowed'
                    : 'bg-primary-900 text-white hover:bg-primary-800',
                )}
              >
                {completing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start exploring
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}