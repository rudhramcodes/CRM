import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Camera,
  Video,
  Film,
  Sparkles,
  Layers,
  Users,
  HardDrive,
  PackageCheck,
  Calendar,
} from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

export default function PortalDeliverablesCard({ project }) {
  const deliverables = project.deliverables || [];
  const inward = project.inwardData || {};
  const team = project.teamDeployment || {};
  const counts = team.counts || {};
  const crewMembers = team.crewMembers || [];

  const deliveredItems = deliverables.filter((d) => d.status === 'delivered');
  const pendingItems = deliverables.filter((d) => d.status !== 'delivered');
  const totalItems = deliverables.length;
  const progressPercent = totalItems > 0 ? Math.round((deliveredItems.length / totalItems) * 100) : 0;

  const totalCrewDeployed =
    (counts.photographers || 0) +
    (counts.videographers || 0) +
    (counts.cinematographers || 0) +
    (counts.dronePilots || 0) +
    (counts.sameDayEditors || 0) +
    (counts.editors || 0) +
    (counts.others || 0);

  return (
    <div className="space-y-6">
      {/* 1. Deliverables Progress Hero */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-zinc-900">Project Deliverables Status</h2>
              {project.projectCode && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
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
              Track real-time delivery status for photos, highlight videos, albums, and digital assets.
            </p>
          </div>

          <div className="text-right">
            <span className="text-sm font-bold text-zinc-900">
              {deliveredItems.length} of {totalItems} Completed
            </span>
            <div className="w-40 h-2.5 bg-zinc-100 rounded-full mt-1.5 overflow-hidden border border-zinc-200">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Deliverables Checklist */}
        {totalItems === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs">
            Deliverable items are being prepared by the production team.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Delivered Items */}
            {deliveredItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Ready & Delivered ({deliveredItems.length})
                </h3>
                <div className="divide-y divide-zinc-100 border border-emerald-100 bg-emerald-50/20 rounded-xl overflow-hidden">
                  {deliveredItems.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-emerald-50/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-sm font-semibold text-zinc-900">{item.title}</span>
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
                          <p className="text-xs text-zinc-600 mt-1 pl-6">{item.details}</p>
                        )}
                        {item.deliveredAt && (
                          <p className="text-[11px] text-zinc-400 mt-1 pl-6 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Delivered on {formatDate(item.deliveredAt)}
                          </p>
                        )}
                      </div>

                      {item.driveUrl && (
                        <a
                          href={item.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shrink-0 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Download / View Drive
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Pending / In Production ({pendingItems.length})
                </h3>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white">
                  {pendingItems.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-800">{item.title}</span>
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
                            <p className="text-xs text-zinc-500 mt-1">{item.details}</p>
                          )}
                        </div>
                      </div>

                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 capitalize shrink-0 self-start sm:self-auto">
                        {item.status === 'in_progress' ? 'Editing in progress' : 'Awaiting production'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Inward Data Status & On-Ground Team Deployed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Inward Raw Assets Status */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-zinc-900">Raw Footage & Inward Status</h3>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                inward.status === 'received' || inward.status === 'verified'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {inward.status?.replace('_', ' ') || 'Pending'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div
              className={`p-3 rounded-lg border text-center ${
                inward.photo
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500'
              }`}
            >
              <Camera className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs font-semibold block">Raw Photos</span>
              <span className="text-[10px] uppercase font-bold">
                {inward.photo ? 'Received' : 'Pending'}
              </span>
            </div>

            <div
              className={`p-3 rounded-lg border text-center ${
                inward.video
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500'
              }`}
            >
              <Video className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs font-semibold block">Raw Video Footage</span>
              <span className="text-[10px] uppercase font-bold">
                {inward.video ? 'Received' : 'Pending'}
              </span>
            </div>
          </div>

          {inward.notes && (
            <div className="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-600 border border-zinc-100">
              <span className="font-semibold text-zinc-700">Remarks:</span> {inward.notes}
            </div>
          )}
        </div>

        {/* Team Deployed on Site */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-bold text-zinc-900">Crew Deployed on Event</h3>
            </div>
            {totalCrewDeployed > 0 && (
              <span className="text-xs bg-zinc-100 text-zinc-700 font-semibold px-2 py-0.5 rounded">
                {totalCrewDeployed} Specialists
              </span>
            )}
          </div>

          {totalCrewDeployed > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {counts.photographers > 0 && (
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                  <Camera className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block">
                    {counts.photographers}
                  </span>
                  <span className="text-[11px] text-zinc-500">Photographers</span>
                </div>
              )}
              {counts.videographers > 0 && (
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                  <Video className="w-4 h-4 mx-auto text-indigo-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block">
                    {counts.videographers}
                  </span>
                  <span className="text-[11px] text-zinc-500">Videographers</span>
                </div>
              )}
              {counts.cinematographers > 0 && (
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                  <Film className="w-4 h-4 mx-auto text-purple-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block">
                    {counts.cinematographers}
                  </span>
                  <span className="text-[11px] text-zinc-500">Cinematographers</span>
                </div>
              )}
              {counts.dronePilots > 0 && (
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                  <Sparkles className="w-4 h-4 mx-auto text-cyan-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block">
                    {counts.dronePilots}
                  </span>
                  <span className="text-[11px] text-zinc-500">Drone Pilots</span>
                </div>
              )}
              {counts.sameDayEditors > 0 && (
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                  <Layers className="w-4 h-4 mx-auto text-pink-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block">{counts.sameDayEditors}</span>
                  <span className="text-[11px] text-zinc-500">Same Day Edit</span>
                </div>
              )}
              {counts.editors > 0 && (
                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                  <Layers className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block">{counts.editors}</span>
                  <span className="text-[11px] text-zinc-500">Editors</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-3 text-center">
              Crew deployment details will be shared prior to the shoot.
            </p>
          )}

          {crewMembers.length > 0 && (
            <div className="pt-2 border-t border-zinc-100">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                On-Site Lead Crew:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {crewMembers.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium"
                  >
                    <span className="font-semibold">{m.name}</span>
                    {m.role && <span className="text-zinc-400">({m.role})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
