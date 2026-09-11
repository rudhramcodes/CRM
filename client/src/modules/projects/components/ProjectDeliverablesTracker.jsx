import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  HardDrive,
  Camera,
  Video,
  FileCheck2,
  Plus,
  Trash2,
  ExternalLink,
  Users,
  Film,
  Sparkles,
  Layers,
  Save,
  Check,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import FormInput from '../../../components/forms/FormInput';
import FormTextarea from '../../../components/forms/FormTextarea';

export default function ProjectDeliverablesTracker({ project, onUpdate, canManage }) {
  const [activeTab, setActiveTab] = useState('deliverables'); // 'deliverables' | 'inward' | 'team'

  // Deliverables State
  const [deliverables, setDeliverables] = useState(project.deliverables || []);
  const [showAddDeliverableModal, setShowAddDeliverableModal] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({
    title: '',
    category: 'video',
    details: '',
    status: 'pending',
    driveUrl: '',
  });

  // Inward Data State
  const [inward, setInward] = useState({
    photo: project.inwardData?.photo || false,
    video: project.inwardData?.video || false,
    source: project.inwardData?.source || '',
    storageLocation: project.inwardData?.storageLocation || '',
    status: project.inwardData?.status || 'pending',
    notes: project.inwardData?.notes || '',
    customFields: project.inwardData?.customFields || [],
  });
  const [newCustomField, setNewCustomField] = useState({ label: '', value: '' });

  // Team Deployment State
  const [teamCounts, setTeamCounts] = useState({
    photographers: project.teamDeployment?.counts?.photographers || 0,
    videographers: project.teamDeployment?.counts?.videographers || 0,
    cinematographers: project.teamDeployment?.counts?.cinematographers || 0,
    dronePilots: project.teamDeployment?.counts?.dronePilots || 0,
    sameDayEditors: project.teamDeployment?.counts?.sameDayEditors || 0,
    editors: project.teamDeployment?.counts?.editors || 0,
    others: project.teamDeployment?.counts?.others || 0,
  });
  const [crewMembers, setCrewMembers] = useState(project.teamDeployment?.crewMembers || []);
  const [newCrewMember, setNewCrewMember] = useState({
    name: '',
    role: '',
    contact: '',
    isFreelancer: false,
  });
  const [showAddCrewModal, setShowAddCrewModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Stats calculation
  const totalDeliverables = deliverables.length;
  const deliveredCount = deliverables.filter((d) => d.status === 'delivered').length;
  const progressPercent = totalDeliverables > 0 ? Math.round((deliveredCount / totalDeliverables) * 100) : 0;

  // Save Deliverables
  const handleToggleDeliverableStatus = async (index, newStatus) => {
    const updated = [...deliverables];
    updated[index] = {
      ...updated[index],
      status: newStatus,
      deliveredAt: newStatus === 'delivered' ? new Date() : null,
    };
    setDeliverables(updated);
    try {
      await onUpdate?.({ deliverables: updated });
      toast.success(
        newStatus === 'delivered' ? 'Deliverable marked as delivered!' : `Status updated to ${newStatus}`,
      );
    } catch {
      toast.error('Failed to update deliverable status');
    }
  };

  const handleAddDeliverable = async (e) => {
    e.preventDefault();
    if (!newDeliverable.title.trim()) {
      toast.error('Deliverable title is required');
      return;
    }
    const updated = [
      ...deliverables,
      {
        ...newDeliverable,
        deliveredAt: newDeliverable.status === 'delivered' ? new Date() : null,
      },
    ];
    setDeliverables(updated);
    setShowAddDeliverableModal(false);
    setNewDeliverable({
      title: '',
      category: 'video',
      details: '',
      status: 'pending',
      driveUrl: '',
    });

    try {
      await onUpdate?.({ deliverables: updated });
      toast.success('Deliverable added successfully');
    } catch {
      toast.error('Failed to save deliverable');
    }
  };

  const handleDeleteDeliverable = async (index) => {
    if (!window.confirm('Delete this deliverable?')) return;
    const updated = deliverables.filter((_, i) => i !== index);
    setDeliverables(updated);
    try {
      await onUpdate?.({ deliverables: updated });
      toast.success('Deliverable removed');
    } catch {
      toast.error('Failed to remove deliverable');
    }
  };

  // Save Inward Data
  const handleSaveInward = async () => {
    setIsSaving(true);
    try {
      await onUpdate?.({ inwardData: inward });
      toast.success('Inward Data saved successfully');
    } catch {
      toast.error('Failed to save inward data');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Team Deployment
  const handleSaveTeam = async () => {
    setIsSaving(true);
    try {
      await onUpdate?.({
        teamDeployment: {
          counts: teamCounts,
          crewMembers,
        },
      });
      toast.success('Team Deployment saved successfully');
    } catch {
      toast.error('Failed to save team deployment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCrewMember = (e) => {
    e.preventDefault();
    if (!newCrewMember.name.trim()) {
      toast.error('Crew member name is required');
      return;
    }
    setCrewMembers([...crewMembers, newCrewMember]);
    setNewCrewMember({ name: '', role: '', contact: '', isFreelancer: false });
    setShowAddCrewModal(false);
  };

  const handleDeleteCrewMember = (index) => {
    setCrewMembers(crewMembers.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Top Banner with Progress and Quick Status */}
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-zinc-900">
                Production Tracking: Inward & Deliverables
              </h2>
              {project.projectCode && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                  {project.projectCode}
                </span>
              )}
              {project.location && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  📍 {project.location}
                </span>
              )}
              {project.duration && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  ⏱ {project.duration}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Track raw footage received, on-ground crew deployed, and final output deliverables
              reflected to client.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-zinc-700">
                Deliverables: {deliveredCount} / {totalDeliverables}
              </div>
              <div className="w-32 h-2 bg-zinc-200 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-200" />
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${
                  inward.status === 'received' || inward.status === 'verified'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                Raw Data: {inward.status}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 pt-2 border-t border-zinc-200/60">
          {[
            {
              id: 'deliverables',
              label: `Outward Deliverables (${deliverables.length})`,
              icon: FileCheck2,
            },
            { id: 'inward', label: 'Inward Data & Sources', icon: HardDrive },
            { id: 'team', label: `Crew Deployed (${crewMembers.length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OUTWARD DELIVERABLES */}
      {activeTab === 'deliverables' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Deliverables Checklist</h3>
              <p className="text-xs text-zinc-500">
                Mark items as ready or delivered. The client can view this progress live in their
                portal.
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                onClick={() => setShowAddDeliverableModal(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Deliverable
              </Button>
            )}
          </div>

          {deliverables.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-zinc-200 rounded-xl">
              <FileCheck2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No deliverables added yet.</p>
              {canManage && (
                <button
                  onClick={() => setShowAddDeliverableModal(true)}
                  className="mt-2 text-xs font-semibold text-primary-600 hover:underline"
                >
                  + Add first deliverable
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
              {deliverables.map((item, index) => {
                const isDelivered = item.status === 'delivered';
                const isReady = item.status === 'ready';
                const isInProgress = item.status === 'in_progress';

                return (
                  <div
                    key={item._id || index}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isDelivered ? 'bg-emerald-50/30' : 'bg-white hover:bg-zinc-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Quick toggle checkmark */}
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleDeliverableStatus(
                              index,
                              isDelivered ? 'in_progress' : 'delivered',
                            )
                          }
                          className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors focus:outline-none"
                          title={isDelivered ? 'Mark as In Progress' : 'Mark as Delivered'}
                        >
                          {isDelivered ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5 hover:border-zinc-400" />
                          )}
                        </button>
                      ) : (
                        <div className="mt-0.5">
                          {isDelivered ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-300" />
                          )}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold ${
                              isDelivered ? 'text-zinc-800 line-through decoration-zinc-300' : 'text-zinc-900'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              item.category === 'photo'
                                ? 'bg-amber-100 text-amber-800'
                                : item.category === 'video'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        {item.details && (
                          <p className="text-xs text-zinc-600 mt-0.5">{item.details}</p>
                        )}
                        {item.driveUrl && (
                          <a
                            href={item.driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline mt-1 font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Drive / Deliverable Link
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Status Selector */}
                      {canManage ? (
                        <select
                          value={item.status}
                          onChange={(e) => handleToggleDeliverableStatus(index, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:ring-1 focus:outline-none ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isReady
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : isInProgress
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="ready">Ready</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {item.status?.replace('_', ' ')}
                        </span>
                      )}

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDeliverable(index)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete deliverable"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INWARD DATA */}
      {activeTab === 'inward' && (
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Inward Data Tracking</h3>
              <p className="text-xs text-zinc-500">
                Track raw footage, hard drive locations, person responsible, and verify ingested assets.
              </p>
            </div>
            {canManage && (
              <Button size="sm" onClick={handleSaveInward} loading={isSaving} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Photos & Videos checkboxes */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                Assets Received
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inward.photo}
                  disabled={!canManage}
                  onChange={(e) => setInward({ ...inward, photo: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <Camera className="w-4 h-4 text-zinc-500" />
                <span>Raw Photos Received</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inward.video}
                  disabled={!canManage}
                  onChange={(e) => setInward({ ...inward, video: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <Video className="w-4 h-4 text-zinc-500" />
                <span>Raw Videos / Footage Received</span>
              </label>
            </div>

            {/* Ingest Source & Storage */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                Source & Drive Location
              </label>
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Source / Handed By:</span>
                <input
                  type="text"
                  value={inward.source}
                  disabled={!canManage}
                  onChange={(e) => setInward({ ...inward, source: e.target.value })}
                  placeholder="e.g. Mayur, Preet, Client, Daman HDD"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white focus:ring-1 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Storage / External Drive:</span>
                <input
                  type="text"
                  value={inward.storageLocation}
                  disabled={!canManage}
                  onChange={(e) => setInward({ ...inward, storageLocation: e.target.value })}
                  placeholder="e.g. HDD 02, Server Bay 1, Google Drive"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white focus:ring-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Inward Overall Status */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                Verification Status
              </label>
              <select
                value={inward.status}
                disabled={!canManage}
                onChange={(e) => setInward({ ...inward, status: e.target.value })}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-zinc-300 bg-white focus:ring-1 focus:outline-none font-medium"
              >
                <option value="pending">Pending (Footage Awaited)</option>
                <option value="partially_received">Partially Received</option>
                <option value="received">Received</option>
                <option value="verified">Verified & Backed Up</option>
              </select>

              <div>
                <span className="text-xs text-zinc-500 block mb-1">Notes / Ingest Remarks:</span>
                <textarea
                  rows={2}
                  value={inward.notes}
                  disabled={!canManage}
                  onChange={(e) => setInward({ ...inward, notes: e.target.value })}
                  placeholder="e.g. 5 camera output received on hard drive"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Custom Inward Fields */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-white">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Custom Equipment / Ingest Fields
            </h4>
            {inward.customFields?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                {inward.customFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-zinc-700">{field.label}:</span>{' '}
                      <span className="text-zinc-600">{field.value}</span>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = inward.customFields.filter((_, i) => i !== idx);
                          setInward({ ...inward, customFields: updated });
                        }}
                        className="text-zinc-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 mb-3">No custom fields added.</p>
            )}

            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Field label (e.g. Cameras Used)"
                  value={newCustomField.label}
                  onChange={(e) =>
                    setNewCustomField({ ...newCustomField, label: e.target.value })
                  }
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. 5 Cam Sony FX3)"
                  value={newCustomField.value}
                  onChange={(e) =>
                    setNewCustomField({ ...newCustomField, value: e.target.value })
                  }
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 focus:outline-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!newCustomField.label.trim()) return;
                    setInward({
                      ...inward,
                      customFields: [...(inward.customFields || []), newCustomField],
                    });
                    setNewCustomField({ label: '', value: '' });
                  }}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM DEPLOYMENT */}
      {activeTab === 'team' && (
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">On-Ground Crew Deployed</h3>
              <p className="text-xs text-zinc-500">
                Track how many photographers, videographers, and editors were deployed for this
                project.
              </p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddCrewModal(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Member
                </Button>
                <Button size="sm" onClick={handleSaveTeam} loading={isSaving} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save Team
                </Button>
              </div>
            )}
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {[
              { key: 'photographers', label: 'Photographers', icon: Camera },
              { key: 'videographers', label: 'Videographers', icon: Video },
              { key: 'cinematographers', label: 'Cinematographers', icon: Film },
              { key: 'dronePilots', label: 'Drone Pilots', icon: Sparkles },
              { key: 'sameDayEditors', label: 'Same Day Editors', icon: Layers },
              { key: 'editors', label: 'Editors', icon: Layers },
              { key: 'others', label: 'Assistants / Other', icon: Users },
            ].map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.key}
                  className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-center"
                >
                  <Icon className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
                  <span className="text-[11px] font-medium text-zinc-600 block">
                    {role.label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    disabled={!canManage}
                    value={teamCounts[role.key] || 0}
                    onChange={(e) =>
                      setTeamCounts({
                        ...teamCounts,
                        [role.key]: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-16 mx-auto mt-1 text-center font-bold text-base rounded-lg border border-zinc-300 py-0.5 bg-white focus:outline-none"
                  />
                </div>
              );
            })}
          </div>

          {/* Crew Members List */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Assigned Crew & Freelancers
              </span>
              <span className="text-xs text-zinc-500">{crewMembers.length} members recorded</span>
            </div>

            {crewMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No specific crew member profiles linked. You can record names and roles here.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {crewMembers.map((member, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-800">{member.name}</span>
                        {member.isFreelancer && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                            Freelancer
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {member.role || 'Crew Member'}
                        {member.contact ? ` · ${member.contact}` : ''}
                      </p>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCrewMember(idx)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Deliverable */}
      <Modal
        open={showAddDeliverableModal}
        onClose={() => setShowAddDeliverableModal(false)}
        title="Add New Deliverable"
      >
        <form onSubmit={handleAddDeliverable} className="space-y-4">
          <FormInput
            label="Deliverable Title"
            required
            placeholder="e.g. 4 Reels, All Seva Photos, Highlight Video"
            value={newDeliverable.title}
            onChange={(e) => setNewDeliverable({ ...newDeliverable, title: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700">Category</label>
              <select
                value={newDeliverable.category}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, category: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="video">Video (Reel / Film / Highlight)</option>
                <option value="photo">Photo (Raw / Edited Photos)</option>
                <option value="others">Others (Album / Design / Website)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700">Initial Status</label>
              <select
                value={newDeliverable.status}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, status: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="ready">Ready for Delivery</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          <FormInput
            label="Google Drive / Cloud Delivery Link"
            placeholder="https://drive.google.com/..."
            value={newDeliverable.driveUrl}
            onChange={(e) => setNewDeliverable({ ...newDeliverable, driveUrl: e.target.value })}
          />

          <FormTextarea
            label="Details / Specifications"
            rows={2}
            placeholder="Notes about duration, resolution, song selection, revision count..."
            value={newDeliverable.details}
            onChange={(e) => setNewDeliverable({ ...newDeliverable, details: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddDeliverableModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Deliverable</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Crew Member */}
      <Modal
        open={showAddCrewModal}
        onClose={() => setShowAddCrewModal(false)}
        title="Add Crew Member / Freelancer"
      >
        <form onSubmit={handleAddCrewMember} className="space-y-4">
          <FormInput
            label="Full Name"
            required
            placeholder="e.g. Mayur, Preet, Rahul"
            value={newCrewMember.name}
            onChange={(e) => setNewCrewMember({ ...newCrewMember, name: e.target.value })}
          />
          <FormInput
            label="Role / Designation"
            placeholder="e.g. Candid Photographer, Drone Pilot, Lead Cinematographer"
            value={newCrewMember.role}
            onChange={(e) => setNewCrewMember({ ...newCrewMember, role: e.target.value })}
          />
          <FormInput
            label="Phone / Contact (Optional)"
            placeholder="+91 9876543210"
            value={newCrewMember.contact}
            onChange={(e) => setNewCrewMember({ ...newCrewMember, contact: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newCrewMember.isFreelancer}
              onChange={(e) =>
                setNewCrewMember({ ...newCrewMember, isFreelancer: e.target.checked })
              }
              className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span>External Freelancer / Contractor</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button type="button" variant="outline" onClick={() => setShowAddCrewModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Member</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
