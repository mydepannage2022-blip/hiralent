import { redirect } from "next/navigation";

// The "manage hiring" pipeline is delivered by the canonical "My Jobs" flow
// (jobManagement → JobApplicantsModal), which lists applicants and supports
// reject / invite-to-assessment against the real backend. This placeholder
// route now redirects there so no dead-end remains.
export default function ManageHiringPage() {
  redirect("/company/dashboard/jobManagement");
}
