import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, User, Briefcase, IndianRupee, Star, Phone, Mail, Info } from 'lucide-react';
import { CloudinaryImageUpload } from '../../../components/ui/CloudinaryImageUpload';
import GeoLocationAutocomplete from '../../../components/ui/GeoLocationAutocomplete';
import { PremiumInput, PremiumSelect, PremiumTextarea } from '../../../components/ui/PremiumFields';
import { freelancerApi } from '../../../services/freelancerApi';
import { BRANDS } from '../../../constants';
import { CURRENCIES, RATE_BASES, SERVICE_OPTIONS } from '../freelancerCatalog';

const BRAND_LABELS = {
  panigrahna: 'Panigrahna',
  aghori: 'Aghori',
  house_of_joggi: 'House of Joggi',
  damrru: 'Damrru',
  tandavs: 'Tandavs',
  kapaalik: 'Kapaalik',
  kalyannam: 'Kalyannam',
  storage_media_solution: 'Storage Media Solution',
};

const FREELANCER_TYPES = [
  { value: 'individual', label: 'Individual Freelancer' },
  { value: 'team', label: 'Team / Duo' },
  { value: 'agency', label: 'Agency' },
  { value: 'vendor', label: 'Vendor / Partner' },
];

const SKILL_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid (2-5 years)' },
  { value: 'senior', label: 'Senior (5-8 years)' },
  { value: 'specialist', label: 'Specialist (8+ years)' },
  { value: 'lead', label: 'Lead / Principal' },
];

const CONTACT_CHANNELS = [
  { value: 'phone', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

const LANGUAGES = [
  { value: 'hindi', label: 'Hindi' },
  { value: 'english', label: 'English' },
  { value: 'marathi', label: 'Marathi' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'punjabi', label: 'Punjabi' },
  { value: 'urdu', label: 'Urdu' },
  { value: 'odia', label: 'Odia' },
  { value: 'assamese', label: 'Assamese' },
  { value: 'sindhi', label: 'Sindhi' },
  { value: 'other', label: 'Other' },
];

const STEPS = [
  { id: 'basic', label: 'Identity', icon: User },
  { id: 'skills', label: 'Skills', icon: Briefcase },
  { id: 'rates', label: 'Rates', icon: IndianRupee },
  { id: 'review', label: 'Review', icon: Check },
];

const stepVariants = {
  enter: (direction) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 100 : -100, opacity: 0 }),
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const initialBasic = {
  profilePhoto: '',
  fullName: '',
  displayName: '',
  phone: '',
  email: '',
  whatsappNumber: '',
  city: '',
  freelancerType: 'individual',
  experienceYears: '',
  languages: [],
  preferredContactChannel: 'phone',
};

const initialSkills = {
  bio: '',
  portfolioLinks: '',
};

const initialVenture = {
  venture: '',
  serviceCategories: [],
  skillLevel: 'mid',
  rateBasis: 'per_day',
  amount: '',
  currency: 'INR',
};

const initialEmergency = {
  contactName: '',
  contactPhone: '',
  contactRelationship: '',
};

export default function FreelancerPortalForm() {
  const navigate = useNavigate();
  const [createFreelancer] = freelancerApi.useCreateFreelancerPublicMutation();

  const [step, setStep] = useState('basic');
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [basic, setBasic] = useState(initialBasic);
  const [skills, setSkills] = useState(initialSkills);
  const [venture, setVenture] = useState(initialVenture);
  const [emergency, setEmergency] = useState(initialEmergency);
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const updateBasic = useCallback((key, value) => {
    setBasic((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }, []);

  const updateSkills = useCallback((key, value) => {
    setSkills((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateVenture = useCallback((key, value) => {
    setVenture((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateEmergency = useCallback((key, value) => {
    setEmergency((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validateBasic = useCallback(() => {
    const newErrors = {};
    if (!basic.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!basic.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^[6-9]\d{9}$/.test(basic.phone.replace(/\s/g, '')))
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number';
    if (!basic.city.trim()) newErrors.city = 'City is required';
    if (basic.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basic.email))
      newErrors.email = 'Enter a valid email address';
    if (basic.experienceYears && (Number(basic.experienceYears) < 0 || Number(basic.experienceYears) > 80))
      newErrors.experienceYears = 'Experience must be between 0-80 years';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [basic]);

  const validateSkills = useCallback(() => {
    const newErrors = {};
    if (!skills.bio.trim()) newErrors.bio = 'Tell us about yourself';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [skills]);

  const validateVenture = useCallback(() => {
    const newErrors = {};
    if (!venture.venture) newErrors.venture = 'Select a venture';
    if (!venture.serviceCategories.length) newErrors.serviceCategories = 'Select at least one service';
    if (!venture.amount) newErrors.amount = 'Enter your rate';
    else if (Number(venture.amount) < 0) newErrors.amount = 'Rate must be positive';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [venture]);

  // Validate on intent, not during render. Calling setErrors from useMemo made
  // the CTA stale and could trigger render loops while the form was incomplete.
  const canProceed = true;

  const handleNext = useCallback(() => {
    const valid = step === 'basic'
      ? validateBasic()
      : step === 'skills'
        ? validateSkills()
        : step === 'rates'
          ? validateVenture()
          : true;
    if (!valid) return;
    setDirection(1);
    const nextIndex = Math.min(stepIndex + 1, STEPS.length - 1);
    setStep(STEPS[nextIndex].id);
    setErrors({});
  }, [step, stepIndex, validateBasic, validateSkills, validateVenture]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    const prevIndex = Math.max(stepIndex - 1, 0);
    setStep(STEPS[prevIndex].id);
    setErrors({});
  }, [stepIndex]);

  const handleSubmit = async () => {
    setSubmitting(true);

    const body = {
      fullName: basic.fullName.trim(),
      displayName: basic.displayName.trim() || basic.fullName.trim(),
      profilePhoto: basic.profilePhoto,
      phone: basic.phone.replace(/\s/g, ''),
      email: basic.email.trim().toLowerCase(),
      whatsappNumber: basic.whatsappNumber,
      preferredContactChannel: basic.preferredContactChannel,
      city: basic.city,
      freelancerType: basic.freelancerType,
      experienceYears: Number(basic.experienceYears) || 0,
      languages: basic.languages,
      bio: skills.bio,
      portfolioLinks: skills.portfolioLinks.split('\n').map((l) => l.trim()).filter(Boolean),
      emergencyContact: {
        name: emergency.contactName,
        phone: emergency.contactPhone,
        relationship: emergency.contactRelationship,
      },
      ventureProfiles: [{
        venture: venture.venture,
        skillLevel: venture.skillLevel,
        serviceCategories: venture.serviceCategories,
        rateCards: [{
          rateBasis: venture.rateBasis,
          amount: Number(venture.amount),
          currency: venture.currency,
          effectiveFrom: new Date().toISOString().slice(0, 10),
        }],
      }],
    };

    try {
      await createFreelancer(body).unwrap();
      toast.success('Application submitted successfully!');
      navigate('/freelancer-portal/success');
    } catch (err) {
      toast.error(err?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLanguage = (lang) => {
    setBasic((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const toggleService = (svc) => {
    setVenture((prev) => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(svc)
        ? prev.serviceCategories.filter((s) => s !== svc)
        : [...prev.serviceCategories, svc],
    }));
  };

  const selectedBrand = BRANDS.find((b) => b.value === venture.venture);
  const availableServices = SERVICE_OPTIONS[venture.venture] || [
    'General freelance services',
    'On-ground support',
    'Consulting / specialist support',
  ];

  const reviewFields = useMemo(() => [
    { label: 'Full Name', value: basic.fullName },
    { label: 'Phone', value: basic.phone },
    { label: 'Email', value: basic.email || 'Not provided' },
    { label: 'City', value: basic.city },
    { label: 'Type', value: FREELANCER_TYPES.find((t) => t.value === basic.freelancerType)?.label },
    { label: 'Experience', value: basic.experienceYears ? `${basic.experienceYears} years` : 'Not specified' },
    { label: 'Languages', value: basic.languages.join(', ') || 'Not selected' },
    { label: 'Venture', value: selectedBrand?.label || 'Not selected' },
    { label: 'Services', value: venture.serviceCategories.join(', ') || 'Not selected' },
    { label: 'Skill Level', value: SKILL_LEVELS.find((s) => s.value === venture.skillLevel)?.label },
    { label: 'Rate', value: venture.amount ? `₹${Number(venture.amount).toLocaleString('en-IN')}/${RATE_BASES.find((r) => r[0] === venture.rateBasis)?.[1] || venture.rateBasis}` : 'Not set' },
    { label: 'Bio', value: skills.bio.length > 80 ? skills.bio.slice(0, 80) + '...' : skills.bio },
  ].filter((f) => f.value), [basic, skills, venture, selectedBrand]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/freelancer-portal')}
              className="flex items-center gap-2 text-zinc-600 hover:text-primary-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Freelancer Portal
            </span>
            <div className="w-20" />
          </div>

          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 flex items-center gap-2">
                <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                  i <= stepIndex ? 'bg-primary-900' : 'bg-zinc-200'
                }`} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  i === stepIndex ? 'text-primary-900' : i < stepIndex ? 'text-primary-600' : 'text-zinc-400'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < stepIndex ? 'bg-primary-900 text-white' : i === stepIndex ? 'bg-primary-900 text-white' : 'bg-zinc-200 text-zinc-500'
                }`}>
                  {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 pb-10 sm:py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {step === 'basic' && (
              <BasicStep
                basic={basic}
                update={updateBasic}
                errors={errors}
                toggleLanguage={toggleLanguage}
              />
            )}

            {step === 'skills' && (
              <SkillsStep
                skills={skills}
                update={updateSkills}
                errors={errors}
              />
            )}

            {step === 'rates' && (
              <RatesStep
                venture={venture}
                update={updateVenture}
                errors={errors}
                selectedBrand={selectedBrand}
                availableServices={availableServices}
                toggleService={toggleService}
                emergency={emergency}
                updateEmergency={updateEmergency}
              />
            )}

            {step === 'review' && (
              <ReviewStep
                fields={reviewFields}
                basic={basic}
                venture={venture}
                skills={skills}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 z-40 border-t border-zinc-100 bg-white/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          {!isFirst ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-3 text-zinc-600 hover:text-primary-900 transition-colors font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary-900 text-white rounded-2xl font-semibold hover:bg-primary-800 active:bg-primary-950 transition-all duration-200 shadow-lg shadow-primary-900/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <Check className="h-5 w-5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary-900 text-white rounded-2xl font-semibold hover:bg-primary-800 active:bg-primary-950 transition-all duration-200 shadow-lg shadow-primary-900/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BasicStep({ basic, update, errors, toggleLanguage }) {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeUp} className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-primary-900">Let's get to know you</h1>
        <p className="text-zinc-500 mt-2">Tell us the essentials to get started</p>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <CloudinaryImageUpload
          value={basic.profilePhoto}
          onChange={(url) => update('profilePhoto', url)}
          label="Profile Photo"
          helperText="Optional · A clear photo helps clients connect with you"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <User className="h-4 w-4" />
          Personal Details
        </div>

        <PremiumInput
          label="Full Name"
          placeholder="Rohan Mehta"
          value={basic.fullName}
          onChange={(e) => update('fullName', e.target.value.replace(/[^a-zA-Z\s.-]/g, ''))}
          error={errors.fullName}
          required
          inputMode="text"
          autoComplete="name"
          icon={<User className="h-5 w-5" />}
        />

        <PremiumInput
          label="Display Name"
          placeholder="Professional name (optional)"
          value={basic.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          inputMode="text"
          autoComplete="nickname"
          icon={<Star className="h-5 w-5" />}
        />

        <PremiumInput
          label="Phone Number"
          placeholder="9876543210"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          autoComplete="tel"
          value={basic.phone}
          onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          error={errors.phone}
          required
          icon={<Phone className="h-5 w-5" />}
          helperText="10-digit Indian mobile number"
        />

        <PremiumInput
          label="WhatsApp Number"
          placeholder="If different from phone"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          autoComplete="tel"
          value={basic.whatsappNumber}
          onChange={(e) => update('whatsappNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
          icon={<Phone className="h-5 w-5" />}
        />

        <PremiumInput
          label="Email Address"
          placeholder="you@example.com"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={basic.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
          icon={<Mail className="h-5 w-5" />}
          helperText="For professional communication"
        />

        <GeoLocationAutocomplete
          label="Base City"
          placeholder="Start typing your city..."
          value={basic.city}
          onChange={(val) => update('city', val)}
          error={errors.city}
          required
          helperText="Helps us match you with local opportunities"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Briefcase className="h-4 w-4" />
          Professional Info
        </div>

        <PremiumSelect
          label="Freelancer Type"
          value={basic.freelancerType}
          onChange={(e) => update('freelancerType', e.target.value)}
          options={FREELANCER_TYPES}
        />

        <PremiumInput
          label="Years of Experience"
          placeholder="e.g. 5"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={basic.experienceYears}
          onChange={(e) => update('experienceYears', e.target.value.replace(/\D/g, '').slice(0, 2))}
          error={errors.experienceYears}
        />

        <PremiumSelect
          label="Preferred Contact Method"
          value={basic.preferredContactChannel}
          onChange={(e) => update('preferredContactChannel', e.target.value)}
          options={CONTACT_CHANNELS}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Info className="h-4 w-4" />
          Languages
        </div>

        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => toggleLanguage(lang.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                basic.languages.includes(lang.value)
                  ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/25'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {basic.languages.length > 0 && (
          <p className="text-xs text-zinc-500">
            Selected: {basic.languages.length} language{basic.languages.length > 1 ? 's' : ''}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

function SkillsStep({ skills, update, errors }) {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeUp} className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-primary-900">Showcase your expertise</h1>
        <p className="text-zinc-500 mt-2">Help clients understand what you bring to the table</p>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
        <PremiumTextarea
          label="About You"
          placeholder="Share your professional journey, expertise, and what sets you apart..."
          value={skills.bio}
          onChange={(e) => update('bio', e.target.value)}
          error={errors.bio}
          required
          rows={5}
          maxLength={1000}
          helperText="This is your chance to make a great first impression"
        />

        <PremiumTextarea
          label="Portfolio Links"
          placeholder={"https://your-portfolio.com\nhttps://instagram.com/yourwork"}
          value={skills.portfolioLinks}
          onChange={(e) => update('portfolioLinks', e.target.value)}
          rows={3}
          helperText="One link per line. Include your website, Instagram, Behance, etc."
        />
      </motion.div>
    </motion.div>
  );
}

function RatesStep({ venture, update, errors, selectedBrand, availableServices, toggleService, emergency, updateEmergency }) {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeUp} className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-primary-900">Set your rates</h1>
        <p className="text-zinc-500 mt-2">Choose your venture and how you'd like to be compensated</p>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Briefcase className="h-4 w-4" />
          Venture Selection
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BRANDS.map((brand) => (
            <button
              key={brand.value}
              type="button"
              onClick={() => update('venture', brand.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                venture.venture === brand.value
                  ? 'border-primary-900 bg-primary-50 shadow-lg shadow-primary-900/10'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                venture.venture === brand.value ? 'bg-primary-900 text-white' : 'bg-zinc-100 text-zinc-500'
              }`}>
                <Briefcase className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">{brand.label}</p>
            </button>
          ))}
        </div>

        {errors.venture && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.venture}
          </p>
        )}
      </motion.div>

      {venture.venture && (
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Star className="h-4 w-4" />
            Services & Skill Level
          </div>

          <PremiumSelect
            label="Skill Level"
            value={venture.skillLevel}
            onChange={(e) => update('skillLevel', e.target.value)}
            options={SKILL_LEVELS}
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Services <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availableServices.map((svc) => (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleService(svc)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    venture.serviceCategories.includes(svc)
                      ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/25'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {svc}
                </button>
              ))}
            </div>
            {errors.serviceCategories && (
              <p className="mt-2 text-xs text-red-600">{errors.serviceCategories}</p>
            )}
          </div>
        </motion.div>
      )}

      {venture.venture && (
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <IndianRupee className="h-4 w-4" />
            Rate Card
          </div>

          <PremiumSelect
            label="Rate Basis"
            value={venture.rateBasis}
            onChange={(e) => update('rateBasis', e.target.value)}
            options={RATE_BASES.map(([value, label]) => ({ value, label }))}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
            <PremiumInput
              label="Amount"
              placeholder="e.g. 5000"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={venture.amount}
              onChange={(e) => update('amount', e.target.value.replace(/\D/g, ''))}
              error={errors.amount}
              required
              icon={<span className="text-zinc-500 font-semibold">₹</span>}
            />

            <PremiumSelect
              label="Currency"
              value={venture.currency}
              onChange={(e) => update('currency', e.target.value)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Phone className="h-4 w-4" />
          Emergency Contact (Optional)
        </div>

        <PremiumInput
          label="Contact Name"
          placeholder="Name of emergency contact"
          value={emergency.contactName}
          onChange={(e) => updateEmergency('contactName', e.target.value)}
          inputMode="text"
          autoComplete="name"
        />

        <PremiumInput
          label="Contact Phone"
          placeholder="10-digit number"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          autoComplete="tel"
          value={emergency.contactPhone}
          onChange={(e) => updateEmergency('contactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
        />

        <PremiumInput
          label="Relationship"
          placeholder="e.g. Spouse, Parent, Sibling"
          value={emergency.contactRelationship}
          onChange={(e) => updateEmergency('contactRelationship', e.target.value)}
          inputMode="text"
        />
      </motion.div>
    </motion.div>
  );
}

function ReviewStep({ fields, basic, venture, skills }) {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeUp} className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-primary-900">Review your application</h1>
        <p className="text-zinc-500 mt-2">Double-check everything looks right before submitting</p>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        {basic.profilePhoto && (
          <div className="relative h-48 bg-zinc-100">
            <img
              src={basic.profilePhoto}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-bold text-xl">{basic.fullName}</p>
              <p className="text-white/80 text-sm">
                {basic.city && `${basic.city} \u2022 `}
                {venture.venture && BRAND_LABELS[venture.venture]}
              </p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.label} className="flex items-start justify-between py-2 border-b border-zinc-100 last:border-0">
              <span className="text-sm text-zinc-500">{field.label}</span>
              <span className="text-sm font-medium text-zinc-900 text-right max-w-[60%]">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Info className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">What happens next?</p>
            <p className="text-sm text-amber-700 mt-1">
              Our team will review your application and keep your details in our secure records.
              If your profile matches our requirements for any upcoming projects, we will reach out to you directly.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
