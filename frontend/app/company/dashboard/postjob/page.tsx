import { redirect } from "next/navigation";

// The standalone post-job mockup has been consolidated into the canonical
// "My Jobs" flow (jobManagement), where CreateJobWizardModal creates real jobs
// via POST /api/v1/jobs. This route now redirects there so no dead-end remains.
export default function PostJobPage() {
  redirect("/company/dashboard/jobManagement");
}
