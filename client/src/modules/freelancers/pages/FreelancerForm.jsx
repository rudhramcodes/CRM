import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, BriefcaseBusiness, Plus, Save, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useCreateFreelancerMutation, useGetFreelancerByIdQuery, useUpdateFreelancerMutation } from '../../../services/freelancerApi';
import { BRANDS } from '../../../constants';
import { CURRENCIES, RATE_BASES, SERVICE_OPTIONS } from '../freelancerCatalog';

const initialRate = () => ({ rateBasis: 'per_day', amount: '', currency: 'INR', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveUntil: '', notes: '' });
const initialProfile = (venture = 'panigrahna') => ({ venture, internalTitle: '', serviceCategories: [], skillLevel: 'mid', experienceSummary: '', active: true, notes: '', rateCards: [] });
const initialForm = { fullName: '', displayName: '', profilePhoto: '', phone: '', alternatePhone: '', email: '', whatsappNumber: '', preferredContactChannel: 'phone', city: '', address: { street: '', city: '', state: '', pincode: '', country: 'India' }, emergencyContact: { name: '', relationship: '', phone: '' }, freelancerType: 'individual', experienceYears: 0, bio: '', languages: '', serviceAreas: '', portfolioLinks: '', internalTags: '', ventureProfiles: [initialProfile()] };

export default function FreelancerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const { data, isLoading: loadingProfile } = useGetFreelancerByIdQuery(id, { skip: !id });
  const [createFreelancer, { isLoading: isCreating }] = useCreateFreelancerMutation();
  const [updateFreelancer, { isLoading: isUpdating }] = useUpdateFreelancerMutation();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const saving = isCreating || isUpdating;

  useEffect(() => {
    const freelancer = data?.data?.freelancer;
    if (!freelancer) return;
    setForm({
      ...initialForm,
      ...freelancer,
      profilePhoto: freelancer.profilePhoto || '',
      address: { ...initialForm.address, ...(freelancer.address || {}) },
      emergencyContact: { ...initialForm.emergencyContact, ...(freelancer.emergencyContact || {}) },
      languages: (freelancer.languages || []).join(', '),
      serviceAreas: (freelancer.serviceAreas || []).join(', '),
      portfolioLinks: (freelancer.portfolioLinks || []).join('\n'),
      internalTags: (freelancer.internalTags || []).join(', '),
      ventureProfiles: freelancer.ventureProfiles?.length ? freelancer.ventureProfiles : [initialProfile()],
    });
  }, [data]);

  const update = (key, value) => { setForm((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, [key]: '' })); };
  const updateProfile = (index, key, value) => setForm((previous) => ({ ...previous, ventureProfiles: previous.ventureProfiles.map((profile, profileIndex) => profileIndex === index ? { ...profile, [key]: value } : profile) }));
  const updateNested = (section, key, value) => setForm((previous) => ({ ...previous, [section]: { ...previous[section], [key]: value } }));
  const addProfile = () => setForm((previous) => ({ ...previous, ventureProfiles: [...previous.ventureProfiles, initialProfile(previous.ventureProfiles.some((profile) => profile.venture === 'panigrahna') ? 'aghori' : 'panigrahna')] }));
  const removeProfile = (index) => setForm((previous) => ({ ...previous, ventureProfiles: previous.ventureProfiles.filter((_, profileIndex) => profileIndex !== index) }));
  const availableVentures = useMemo(() => BRANDS.filter((brand) => !form.ventureProfiles.some((profile) => profile.venture === brand.value)), [form.ventureProfiles]);

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required';
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required';
    if (!form.ventureProfiles.length) nextErrors.ventureProfiles = 'Add at least one venture profile';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    const body = {
      ...form,
      profilePhoto: form.profilePhoto.trim(),
      experienceYears: Number(form.experienceYears || 0),
      languages: split(form.languages),
      serviceAreas: split(form.serviceAreas),
      portfolioLinks: form.portfolioLinks.split('\n').map((item) => item.trim()).filter(Boolean),
      internalTags: split(form.internalTags),
      ventureProfiles: form.ventureProfiles.map((profile) => ({ ...profile, serviceCategories: profile.serviceCategories || [], rateCards: (profile.rateCards || []).filter((rate) => rate.amount !== '' && rate.effectiveFrom).map((rate) => ({ ...rate, amount: Number(rate.amount), effectiveUntil: rate.effectiveUntil || null })), })),
    };
    try {
      const result = editing ? await updateFreelancer({ id, ...body }).unwrap() : await createFreelancer(body).unwrap();
      const saved = result?.data?.freelancer;
      toast.success(editing ? 'Freelancer updated' : 'Freelancer added');
      navigate(saved?._id ? `/freelancers/${saved._id}` : '/freelancers');
    } catch (err) { toast.error(err?.data?.message || 'Unable to save freelancer'); }
  };

  if (editing && loadingProfile) return <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">Loading freelancer profile…</div>;

  return <div className="mx-auto max-w-4xl space-y-6"><button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-primary-900"><ArrowLeft className="h-4 w-4" /> Back to freelancers</button><header><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600"><BriefcaseBusiness className="h-3.5 w-3.5" /> Crew profile</div><h1 className="font-heading text-2xl font-semibold text-primary-900">{editing ? 'Edit freelancer' : 'Add freelancer'}</h1><p className="mt-1 text-sm text-zinc-500">Capture the essentials now. Venture-specific operational details can grow with the profile.</p></header><form onSubmit={submit} className="space-y-5"><Section title="Identity and contact" description="How the team should identify and reach this freelancer."><div className="grid gap-4 sm:grid-cols-2"><Input label="Profile photo URL" value={form.profilePhoto} onChange={(event) => update('profilePhoto', event.target.value)} placeholder="https://…" /><Input label="Full name *" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} error={errors.fullName} placeholder="e.g. Rohan Mehta" /><Input label="Display name" value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Professional or preferred name" /><Input label="Phone *" value={form.phone} onChange={(event) => update('phone', event.target.value)} error={errors.phone} placeholder="Primary phone number" /><Input label="WhatsApp number" value={form.whatsappNumber} onChange={(event) => update('whatsappNumber', event.target.value)} placeholder="If different from phone" /><Input label="Email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@example.com" /><Input label="City" value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="Base city" /><label className="space-y-1.5 text-sm font-medium text-zinc-700">Preferred contact channel<select value={form.preferredContactChannel} onChange={(event) => update('preferredContactChannel', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-normal outline-none focus:border-primary-900"><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label><label className="space-y-1.5 text-sm font-medium text-zinc-700">Freelancer type<select value={form.freelancerType} onChange={(event) => update('freelancerType', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-normal outline-none focus:border-primary-900"><option value="individual">Individual</option><option value="team">Team</option><option value="agency">Agency</option><option value="vendor">Vendor</option></select></label></div><div className="mt-5 border-t border-zinc-100 pt-5"><p className="mb-3 text-sm font-semibold text-zinc-800">Address</p><div className="grid gap-4 sm:grid-cols-2"><Input label="Street / address" value={form.address.street} onChange={(event) => updateNested('address', 'street', event.target.value)} placeholder="Street, building, area" /><Input label="Address city" value={form.address.city} onChange={(event) => updateNested('address', 'city', event.target.value)} placeholder="City" /><Input label="State" value={form.address.state} onChange={(event) => updateNested('address', 'state', event.target.value)} placeholder="State" /><Input label="Pincode" value={form.address.pincode} onChange={(event) => updateNested('address', 'pincode', event.target.value)} placeholder="Pincode" /></div></div><div className="mt-5 border-t border-zinc-100 pt-5"><p className="mb-3 text-sm font-semibold text-zinc-800">Emergency contact</p><div className="grid gap-4 sm:grid-cols-3"><Input label="Name" value={form.emergencyContact.name} onChange={(event) => updateNested('emergencyContact', 'name', event.target.value)} /><Input label="Relationship" value={form.emergencyContact.relationship} onChange={(event) => updateNested('emergencyContact', 'relationship', event.target.value)} /><Input label="Phone" value={form.emergencyContact.phone} onChange={(event) => updateNested('emergencyContact', 'phone', event.target.value)} /></div></div></Section><Section title="Professional profile" description="Make the directory useful for quick crew decisions."><div className="grid gap-4 sm:grid-cols-2"><Input label="Experience years" type="number" min="0" value={form.experienceYears} onChange={(event) => update('experienceYears', event.target.value)} /><Input label="Languages" value={form.languages} onChange={(event) => update('languages', event.target.value)} placeholder="Hindi, English" helperText="Separate multiple values with commas" /><Input label="Service areas" value={form.serviceAreas} onChange={(event) => update('serviceAreas', event.target.value)} placeholder="Mumbai, Pune, Nashik" /><Input label="Internal tags" value={form.internalTags} onChange={(event) => update('internalTags', event.target.value)} placeholder="Reliable, backup, premium" /></div><label className="mt-4 block text-sm font-medium text-zinc-700">Bio<textarea value={form.bio} onChange={(event) => update('bio', event.target.value)} rows={4} maxLength={2000} className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-primary-900" placeholder="Short internal profile summary" /></label><label className="mt-4 block text-sm font-medium text-zinc-700">Portfolio links<textarea value={form.portfolioLinks} onChange={(event) => update('portfolioLinks', event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-primary-900" placeholder="One URL per line" /></label></Section><Section title="Ventures and services" description="A freelancer can work with different ventures in different roles.">{errors.ventureProfiles && <p className="mb-3 text-sm text-rose-600">{errors.ventureProfiles}</p>}<div className="space-y-4">{form.ventureProfiles.map((profile, index) => <VentureCard key={`${profile.venture}-${index}`} profile={profile} index={index} onChange={updateProfile} onRemove={() => removeProfile(index)} canRemove={form.ventureProfiles.length > 1} />)}</div>{availableVentures.length > 0 && <button type="button" onClick={addProfile} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"><Plus className="h-4 w-4" /> Add another venture</button>}</Section><div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button><Button type="submit" disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving…' : editing ? 'Save changes' : 'Create freelancer'}</Button></div></form></div>;
}

function VentureCard({ profile, index, onChange, onRemove, canRemove }) {
  const options = SERVICE_OPTIONS[profile.venture] || [];
  const selectedServices = profile.serviceCategories || [];
  const customServices = selectedServices.filter((service) => !options.includes(service)).join(', ');
  const rates = profile.rateCards || [];
  const updateRate = (rateIndex, key, value) => onChange(index, 'rateCards', rates.map((rate, itemIndex) => itemIndex === rateIndex ? { ...rate, [key]: value } : rate));
  const addRate = () => onChange(index, 'rateCards', [...rates, initialRate()]);
  const removeRate = (rateIndex) => onChange(index, 'rateCards', rates.filter((_, itemIndex) => itemIndex !== rateIndex));
  return (
    <div className="rounded-xl border border-zinc-200 bg-[#fcfcfb] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Venture profile {index + 1}</p><h3 className="mt-1 font-semibold text-zinc-900">{BRANDS.find((brand) => brand.value === profile.venture)?.label || profile.venture}</h3></div>
        {canRemove && <button type="button" onClick={onRemove} className="rounded-lg p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600" title="Remove venture"><Trash2 className="h-4 w-4" /></button>}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-zinc-700">Venture<select value={profile.venture} onChange={(event) => { onChange(index, 'serviceCategories', []); onChange(index, 'rateCards', []); onChange(index, 'venture', event.target.value); }} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-primary-900">{BRANDS.map((brand) => <option key={brand.value} value={brand.value}>{brand.label}</option>)}</select></label>
        <Input label="Internal title" value={profile.internalTitle} onChange={(event) => onChange(index, 'internalTitle', event.target.value)} placeholder="e.g. Wedding Cinematographer" />
        <label className="space-y-1.5 text-sm font-medium text-zinc-700">Skill level<select value={profile.skillLevel} onChange={(event) => onChange(index, 'skillLevel', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-primary-900"><option value="junior">Junior</option><option value="mid">Mid</option><option value="senior">Senior</option><option value="specialist">Specialist</option><option value="lead">Lead</option></select></label>
        <div><p className="mb-1.5 text-sm font-medium text-zinc-700">Services</p><div className="flex flex-wrap gap-2">{options.map((option) => <button type="button" key={option} onClick={() => onChange(index, 'serviceCategories', selectedServices.includes(option) ? selectedServices.filter((service) => service !== option) : [...selectedServices, option])} className={`rounded-full border px-2.5 py-1.5 text-xs font-medium ${selectedServices.includes(option) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300'}`}>{option}</button>)}</div><Input label="Other services" value={customServices} onChange={(event) => { const custom = split(event.target.value); onChange(index, 'serviceCategories', [...selectedServices.filter((service) => options.includes(service)), ...custom]); }} placeholder="Add services separated by commas" helperText="Use this for custom services" /></div>
      </div>
      <div className="mt-5 border-t border-zinc-200 pt-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-zinc-800">Rate card history</p><p className="mt-1 text-xs text-zinc-500">Add a new rate instead of overwriting an old agreement.</p></div><button type="button" onClick={addRate} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><Plus className="h-3.5 w-3.5" /> Add rate</button></div>
        {rates.length === 0 ? <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">No rate added yet.</p> : <div className="mt-3 space-y-3">{rates.map((rate, rateIndex) => <div key={rate._id || rateIndex} className="rounded-lg border border-zinc-200 bg-white p-3"><div className="grid gap-3 sm:grid-cols-4"><label className="text-xs font-medium text-zinc-600">Rate basis<select value={rate.rateBasis} onChange={(event) => updateRate(rateIndex, 'rateBasis', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm">{RATE_BASES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Input label="Amount" type="number" min="0" value={rate.amount} onChange={(event) => updateRate(rateIndex, 'amount', event.target.value)} placeholder="0" /><label className="text-xs font-medium text-zinc-600">Currency<select value={rate.currency || 'INR'} onChange={(event) => updateRate(rateIndex, 'currency', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm">{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></label><Input label="Effective from" type="date" value={String(rate.effectiveFrom || '').slice(0, 10)} onChange={(event) => updateRate(rateIndex, 'effectiveFrom', event.target.value)} /></div><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><Input label="Effective until (optional)" type="date" value={String(rate.effectiveUntil || '').slice(0, 10)} onChange={(event) => updateRate(rateIndex, 'effectiveUntil', event.target.value)} /><button type="button" onClick={() => removeRate(rateIndex)} className="mt-6 inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div><label className="mt-3 block text-xs font-medium text-zinc-600">Rate notes<textarea value={rate.notes || ''} onChange={(event) => updateRate(rateIndex, 'notes', event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm" placeholder="Includes travel, overtime, deliverables…" /></label></div>)}</div>}
      </div>
      <label className="mt-4 block text-sm font-medium text-zinc-700">Experience summary<textarea value={profile.experienceSummary} onChange={(event) => onChange(index, 'experienceSummary', event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-900" placeholder="Relevant experience for this venture" /></label>
      <label className="mt-4 block text-sm font-medium text-zinc-700">Venture notes<textarea value={profile.notes} onChange={(event) => onChange(index, 'notes', event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-900" placeholder="Experience, preferences, or internal notes" /></label>
    </div>
  );
}
function Section({ title, description, children }) { return <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-heading text-lg font-semibold text-primary-900">{title}</h2><p className="mt-1 text-sm text-zinc-500">{description}</p><div className="mt-5">{children}</div></section>; }
function split(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
