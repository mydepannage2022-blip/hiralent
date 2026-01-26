"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useInternalCandidateDetails } from "@/src/lib/company/candidates.queries";

export default function CandidateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = String(params?.candidateId ?? "");

  const q = useInternalCandidateDetails(candidateId);

  if (q.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (q.isError || !q.data) {
    return (
      <div className="p-6">
        <button
          className="mb-4 rounded-md border px-3 py-2 text-sm"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <div className="text-red-600 text-sm">Candidate not found.</div>
      </div>
    );
  }

  const data = q.data;
  const profile: any = data.candidateProfile ?? {};
  const about =
    profile.about ??
    profile.about_me ??
    profile.summary ??
    profile.bio ??
    profile.description ??
    "";

  const skills: string[] =
    profile.skills ??
    profile.skill_tags ??
    data.candidateSkills?.map((s: any) => s?.name ?? s?.skill ?? s)?.filter(Boolean) ??
    [];

  // Try to read "experience/education" from multiple possible shapes
  const experiences: any[] =
    profile.experiences ??
    profile.experience ??
    profile.work_experience ??
    profile.workExperiences ??
    [];

  const education: any[] =
    profile.education ?? profile.educations ?? profile.schools ?? [];

  const documents: any[] = data.candidateDocuments ?? [];

  const cityOrLocation =
    profile.city ??
    profile.location ??
    profile.address ??
    (profile.country ? `${profile.country}` : null);

  const linkedin =
    data.linkedin_url ??
    profile.linkedin_url ??
    profile.links?.linkedin ??
    profile.links?.linkedin_url ??
    null;

  return (
    <div className="p-6">
      <button
        className="mb-4 rounded-md border px-3 py-2 text-sm"
        onClick={() => router.back()}
      >
        ← Back
      </button>

      {/* Header card */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-2xl font-semibold">{data.full_name}</div>

        <div className="mt-1 text-sm text-muted-foreground">
          {profile.headline ?? profile.title ?? "—"}
        </div>

        <div className="mt-2 text-sm text-muted-foreground">
          {cityOrLocation ? cityOrLocation : "—"}
        </div>

        <div className="mt-4 text-sm space-y-1">
          <div>Email: {data.email ?? "—"}</div>
          <div>Phone: {data.phone_number ?? profile.phone ?? "—"}</div>
          <div>
            LinkedIn:{" "}
            {linkedin ? (
              <a
                href={linkedin}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {linkedin}
              </a>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold mb-2">About</div>
        {about ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {about}
          </p>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}
      </div>

      {/* Skills */}
      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold mb-2">Skills</div>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 30).map((s) => (
              <span
                key={String(s)}
                className="rounded-full border bg-gray-50 px-2 py-1 text-xs"
              >
                {String(s)}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No skills</div>
        )}
      </div>

      {/* Experience */}
      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold mb-2">Experience</div>

        {Array.isArray(experiences) && experiences.length > 0 ? (
          <div className="space-y-4">
            {experiences.slice(0, 10).map((exp, idx) => {
              const title =
                exp?.title ??
                exp?.position ??
                exp?.role ??
                exp?.job_title ??
                "—";
              const company = exp?.company ?? exp?.company_name ?? exp?.org ?? "";
              const from = exp?.start_date ?? exp?.from ?? exp?.start ?? "";
              const to = exp?.end_date ?? exp?.to ?? exp?.end ?? "Present";
              const desc = exp?.description ?? exp?.summary ?? "";

              return (
                <div key={idx} className="rounded-lg border p-4">
                  <div className="font-medium">
                    {title}
                    {company ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {company}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    {from || to ? `${from ?? ""}${from && to ? " → " : ""}${to ?? ""}` : "—"}
                  </div>

                  {desc ? (
                    <div className="text-sm text-muted-foreground mt-2">
                      {desc}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}
      </div>

      {/* Education */}
      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold mb-2">Education</div>

        {Array.isArray(education) && education.length > 0 ? (
          <div className="space-y-3">
            {education.slice(0, 10).map((ed, idx) => {
              const school = ed?.school ?? ed?.institution ?? ed?.name ?? "—";
              const degree = ed?.degree ?? ed?.diploma ?? "";
              const field = ed?.field ?? ed?.major ?? "";
              const from = ed?.start_date ?? ed?.from ?? "";
              const to = ed?.end_date ?? ed?.to ?? "";

              return (
                <div key={idx} className="rounded-lg border p-4">
                  <div className="font-medium">{school}</div>
                  {(degree || field) ? (
                    <div className="text-sm text-muted-foreground">
                      {[degree, field].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                  {(from || to) ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      {`${from ?? ""}${from && to ? " → " : ""}${to ?? ""}`}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}
      </div>

      {/* Documents (optional) */}
      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold mb-2">Documents</div>

        {Array.isArray(documents) && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.slice(0, 20).map((doc, idx) => {
              const name = doc?.name ?? doc?.file_name ?? doc?.type ?? "Document";
              const url = doc?.url ?? doc?.file_url ?? doc?.download_url ?? null;

              return (
                <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">{name}</div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline"
                    >
                      Open
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}
      </div>

      {/* Debug (optional) */}
      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold mb-2">Raw data (debug)</div>
        <pre className="text-xs overflow-auto bg-gray-50 border rounded-lg p-3">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
