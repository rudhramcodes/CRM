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
    <div className="space-y-6 text-zinc-900">
      {/* 1. Deliverables Progress Hero */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <PackageCheck className="w-5 h-5 text-primary-900" />
              <h2 className="text-base font-bold text-zinc-900 font-heading">Deliverables & Asset Hub</h2>
              {project.projectCode && (
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                  {project.projectCode}
                </span>
              )}
              {project.location && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  📍 {project.location}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">
              Live tracking for photo albums, highlight films, reels, drive archives, and production masters.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
              {deliveredItems.length} of {totalItems} Delivered
            </span>
            <div className="w-48 h-2 bg-zinc-100 rounded-full mt-2 overflow-hidden border border-zinc-200">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Deliverables Checklist */}
        {totalItems === 0 ? (
          <div className="text-center py-10 text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-xl mt-6">
            Production deliverables are currently being organized by your project team.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Delivered Items */}
            {deliveredItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Ready for Download ({deliveredItems.length})
                </h3>
                <div className="divide-y divide-emerald-100 border border-emerald-200 rounded-2xl overflow-hidden bg-emerald-50/20">
                  {deliveredItems.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-emerald-50/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-sm font-bold text-zinc-900">{item.title}</span>
                          <span
                            className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded border ${
                              item.category === 'photo'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.category === 'video'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
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
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-900 hover:bg-primary-800 text-white text-xs font-semibold transition-colors shrink-0 shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open Drive Folder
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> In Production & Polish ({pendingItems.length})
                </h3>
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-50/50">
                  {pendingItems.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-sm font-semibold text-zinc-800">{item.title}</span>
                            <span
                              className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded border ${
                                item.category === 'photo'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : item.category === 'video'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
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

                      <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 capitalize shrink-0 self-start sm:self-auto">
                        {item.status === 'in_progress' ? 'Color grading & edit' : 'Scheduled in queue'}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inward Raw Assets Status */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-zinc-900 font-heading">Raw Footage Vault</h3>
            </div>
            <span
              className={`text-[11px] font-mono px-3 py-0.5 rounded-full font-semibold capitalize border ${
                inward.status === 'received' || inward.status === 'verified'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {inward.status?.replace('_', ' ') || 'Pending'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div
              className={`p-3.5 rounded-xl border text-center ${
                inward.photo
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500'
              }`}
            >
              <Camera className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
              <span className="text-xs font-semibold block text-zinc-800">Raw Photos</span>
              <span className="text-[10px] font-mono uppercase font-medium">
                {inward.photo ? 'Backed Up' : 'Awaiting Ingestion'}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border text-center ${
                inward.video
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500'
              }`}
            >
              <Video className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
              <span className="text-xs font-semibold block text-zinc-800">Raw Cinema Footage</span>
              <span className="text-[10px] font-mono uppercase font-medium">
                {inward.video ? 'Backed Up' : 'Awaiting Ingestion'}
              </span>
            </div>
          </div>

          {inward.notes && (
            <div className="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-600 border border-zinc-200">
              <span className="font-semibold text-zinc-800">Ingestion Notes:</span> {inward.notes}
            </div>
          )}
        </div>

        {/* Team Deployed on Site */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-zinc-900 font-heading">Event Production Crew</h3>
            </div>
            {totalCrewDeployed > 0 && (
              <span className="text-[11px] font-mono bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold px-2.5 py-0.5 rounded-full">
                {totalCrewDeployed} Specialists
              </span>
            )}
          </div>

          {totalCrewDeployed > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {counts.photographers > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                  <Camera className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block font-heading">
                    {counts.photographers}
                  </span>
                  <span className="text-[11px] text-zinc-500">Photographers</span>
                </div>
              )}
              {counts.videographers > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                  <Video className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block font-heading">
                    {counts.videographers}
                  </span>
                  <span className="text-[11px] text-zinc-500">Videographers</span>
                </div>
              )}
              {counts.cinematographers > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                  <Film className="w-4 h-4 mx-auto text-purple-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block font-heading">
                    {counts.cinematographers}
                  </span>
                  <span className="text-[11px] text-zinc-500">Cinematographers</span>
                </div>
              )}
              {counts.dronePilots > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                  <Sparkles className="w-4 h-4 mx-auto text-cyan-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block font-heading">
                    {counts.dronePilots}
                  </span>
                  <span className="text-[11px] text-zinc-500">Drone Pilots</span>
                </div>
              )}
              {counts.sameDayEditors > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                  <Layers className="w-4 h-4 mx-auto text-pink-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block font-heading">{counts.sameDayEditors}</span>
                  <span className="text-[11px] text-zinc-500">Same Day Edit</span>
                </div>
              )}
              {counts.editors > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                  <Layers className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                  <span className="text-base font-bold text-zinc-900 block font-heading">{counts.editors}</span>
                  <span className="text-[11px] text-zinc-500">Lead Editors</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-4 text-center">
              Crew roster will synchronize prior to call-time.
            </p>
          )}

          {crewMembers.length > 0 && (
            <div className="pt-2 border-t border-zinc-100">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                Lead Crew Assigned:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {crewMembers.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-medium"
                  >
                    <span className="font-semibold">{m.name}</span>
                    {m.role && <span className="text-zinc-500">({m.role})</span>}
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
