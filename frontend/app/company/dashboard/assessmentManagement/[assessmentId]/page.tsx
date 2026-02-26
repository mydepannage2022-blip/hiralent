import AssessmentDetails from "@/src/components/company/dashboard/assessmentManagement/AssessmentDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  return <AssessmentDetails assessmentId={assessmentId} />;
}