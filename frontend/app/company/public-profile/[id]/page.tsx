import { redirect } from "next/navigation";

// The hardcoded public-profile/[id] mockup has been retired in favor of the
// working slug-based public profile at /company/[slug] (PublicCompanyPage →
// GET /employer/public/:slug). Since an arbitrary [id] can't be mapped to a
// slug here, this route redirects to the companies directory as the honest
// browse entry-point.
export default function PublicProfileRedirect() {
  redirect("/company/discover");
}
