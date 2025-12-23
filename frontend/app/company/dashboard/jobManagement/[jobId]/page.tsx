import JobDetails from "@/src/components/company/dashboard/jobManagement/JobDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <JobDetails jobId={jobId} />;
}
