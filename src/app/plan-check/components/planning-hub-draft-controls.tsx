import { RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react";

import {
  countPlanningHubDraftCourseCodes,
  formatPlanningHubDraftTruncation,
  PLANNING_HUB_DRAFT_TTL_DAYS,
  type PlanningHubDeviceDraft,
} from "@/lib/plan/planning-hub-device-draft";

const actionButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dd550c]/20 disabled:cursor-not-allowed disabled:opacity-45";

export function PlanningHubDraftControls({
  draft,
  onDelete,
  onRestore,
  onSave,
  saveIncludesManualPlan,
  status,
}: {
  draft: PlanningHubDeviceDraft | null;
  onDelete: () => void;
  onRestore: () => void;
  onSave: () => void;
  saveIncludesManualPlan: boolean;
  status: string | null;
}) {
  const courseCodeCount = draft ? countPlanningHubDraftCourseCodes(draft) : 0;
  const savedManualPlan = Boolean(draft?.manualPlan);
  const truncationMessage = formatPlanningHubDraftTruncation(draft?.truncation);

  return (
    <section
      aria-labelledby="device-draft-heading"
      className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6"
    >
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="shrink-0 text-[#03244d]" size={18} />
              <h2 className="text-[14px] font-semibold leading-5 text-slate-950" id="device-draft-heading">
                Planning draft on this device
              </h2>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-slate-600">
              {draft
                ? savedManualPlan
                  ? `${courseCodeCount} recognized planned course${courseCodeCount === 1 ? "" : "s"} saved ${formatDraftDate(draft.savedAt)}. This draft expires ${formatDraftDate(draft.expiresAt)}.`
                  : `Path settings saved ${formatDraftDate(draft.savedAt)} and available until ${formatDraftDate(draft.expiresAt)}. Re-upload Current Progress to rebuild an analysis.`
                : `Nothing is saved automatically. Current Progress can save path settings only; Paste courses can also save recognized course codes and term labels for ${PLANNING_HUB_DRAFT_TTL_DAYS} days.`}
            </p>
            <p className="text-[12px] leading-5 text-slate-500">
              PDFs, source filenames, extracted audit evidence, and analysis results are never included.
            </p>
            {truncationMessage ? (
              <p className="mt-1 text-[12px] font-medium leading-5 text-[#9b3900]">
                Saved with limits: {truncationMessage}. Shorten the original plan and save again to keep every recognized item.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className={`${actionButtonClass} bg-[#03244d] text-white hover:bg-[#021b3a]`}
              onClick={onSave}
              type="button"
            >
              <Save aria-hidden="true" size={15} />
              {saveIncludesManualPlan
                ? "Save manual plan on this device"
                : "Save path settings only"}
            </button>
            <button
              className={`${actionButtonClass} border border-slate-300 bg-white text-slate-700 hover:border-[#dd550c] hover:text-[#03244d]`}
              disabled={!draft}
              onClick={onRestore}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={15} />
              {savedManualPlan ? "Restore plan" : "Restore settings"}
            </button>
            <button
              className={`${actionButtonClass} text-slate-600 hover:bg-red-50 hover:text-red-700`}
              disabled={!draft}
              onClick={onDelete}
              type="button"
            >
              <Trash2 aria-hidden="true" size={15} />
              Delete saved draft
            </button>
          </div>
        </div>
        {status ? (
          <p className="mt-2 text-[12px] font-medium leading-5 text-slate-700" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function formatDraftDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}
