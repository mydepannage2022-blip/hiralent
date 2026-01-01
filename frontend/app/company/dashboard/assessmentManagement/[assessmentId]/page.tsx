import AssessmentDetails from "@/src/components/company/dashboard/assessmentManagement/AssessmentDetails";

export default function Page({
  params,
}: {
  params: { assessmentId: string };
}) {
  return <AssessmentDetails assessmentId={params.assessmentId} />;
}
