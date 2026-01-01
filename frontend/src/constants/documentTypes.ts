export const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport Copy" },
  { value: "visa_application", label: "Visa Application Form" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "employment_letter", label: "Employment Letter" },
  { value: "proof_of_accommodation", label: "Proof of Accommodation" },
  { value: "other", label: "Other Document" },
];

// Required types for embassy submission 
export const REQUIRED_DOCUMENT_TYPES = DOCUMENT_TYPES
  .filter(type => type.value !== "other")
  .map(type => type.value);