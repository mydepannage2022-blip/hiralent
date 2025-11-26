'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  MapPin,
  Globe,
  Users,
  Mail,
  Phone,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
} from 'lucide-react';

interface UserData {
  email: string;
  full_name: string;
  phone_number: string | null;
}

interface DocumentData {
  document_id: string;
  document_type: string;
  file_name: string;
  storage_key: string;
  url: string | null;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  status: string;
}

interface CompanyData {
  company_id: string;
  company_name: string;
  display_name: string;
  industry: string;
  company_size: string;
  website: string;
  headquarters: string;
  founded_year: number | null;
  description: string;
  registration_number: string;
  full_address: string;
  verification_status: string;
  verification_submitted_at: string;
  verification_notes: string | null;
  verified: boolean;
  user?: UserData;
  documents?: DocumentData[];
}

export default function CompanyVerificationDetail() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<number>(0);
  const [documentZoom, setDocumentZoom] = useState(100);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ✅ State for presigned URLs
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [currentDocUrl, setCurrentDocUrl] = useState<string>('');
  const [loadingUrl, setLoadingUrl] = useState(false);

  const [checklist, setChecklist] = useState({
    registrationValid: false,
    addressVerified: false,
    documentsComplete: false,
    informationAccurate: false,
    noRedFlags: false,
  });

  useEffect(() => {
    if (companyId) {
      loadCompanyDetails();
    }
  }, [companyId]);

  // ✅ Load document URL when selected document changes
  useEffect(() => {
    if (documents.length > 0 && documents[selectedDocument]) {
      loadDocumentUrl(documents[selectedDocument]);
    }
  }, [selectedDocument, documents]);

  const loadCompanyDetails = async () => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `http://localhost:5000/api/v1/admin/verifications/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.company) {
        const companyData = {
          ...data.company,
          user: data.company.user || null,
        };
        
        setCompany(companyData);
        setDocuments(data.documents || []);
      } else {
        throw new Error('No company data found in response');
      }
      
    } catch (err) {
      console.error('Failed to load company details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch presigned URL for a document
  const fetchPresignedUrl = async (documentId: string): Promise<string | null> => {
    const token = localStorage.getItem('sessionToken');
    if (!token) return null;

    try {
      console.log('🔗 Fetching presigned URL for document:', documentId);
      
      const response = await fetch(
        `http://localhost:5000/api/v1/admin/verifications/${companyId}/documents/${documentId}/url`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to get presigned URL:', response.status, errorText);
        throw new Error('Failed to get document URL');
      }

      const data = await response.json();
      console.log('✅ Presigned URL received');
      return data.url;
    } catch (error) {
      console.error('Error fetching document URL:', error);
      return null;
    }
  };

  // ✅ Load document URL and cache it
  const loadDocumentUrl = async (doc: DocumentData) => {
    // Check cache first
    if (documentUrls[doc.document_id]) {
      setCurrentDocUrl(documentUrls[doc.document_id]);
      return;
    }

    setLoadingUrl(true);
    const url = await fetchPresignedUrl(doc.document_id);
    
    if (url) {
      // Cache the URL
      setDocumentUrls(prev => ({ ...prev, [doc.document_id]: url }));
      setCurrentDocUrl(url);
    } else {
      setCurrentDocUrl('');
    }
    
    setLoadingUrl(false);
  };

  const getUserEmail = () => company?.user?.email || 'Not available';
  const getUserFullName = () => company?.user?.full_name || 'Not available';
  const getUserPhone = () => company?.user?.phone_number || 'Not available';

  const handleApprove = async () => {
    setProcessing(true);
    const token = localStorage.getItem('sessionToken');

    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/admin/verifications/approve/${companyId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: approvalNotes || 'All documents verified and approved.',
          }),
        }
      );

      const data = await response.json();
      if (data.ok || data.success) {
        alert('✅ Company verification approved successfully!');
        router.push('/admin/dashboard/verifications');
      } else {
        throw new Error(data.message || 'Failed to approve verification');
      }
    } catch (err) {
      console.error('Failed to approve verification:', err);
      alert('❌ Failed to approve verification. Please try again.');
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    const token = localStorage.getItem('sessionToken');

    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/admin/verifications/reject/${companyId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: rejectionReason,
          }),
        }
      );

      const data = await response.json();
      if (data.ok || data.success) {
        alert('✅ Company verification rejected.');
        router.push('/admin/dashboard/verifications');
      } else {
        throw new Error(data.message || 'Failed to reject verification');
      }
    } catch (err) {
      console.error('Failed to reject verification:', err);
      alert('❌ Failed to reject verification. Please try again.');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  const toggleChecklistItem = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecksPassed = Object.values(checklist).every((val) => val === true);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Company</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadCompanyDetails}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Company Not Found</h2>
          <p className="text-slate-600 mt-2">The requested company could not be found.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back to Verifications</span>
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 mb-2">
                {company.company_name || company.display_name || 'Unnamed Company'}
              </h1>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg border border-orange-200">
                  ⏳ Pending Review
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200">
                  Submitted {formatDate(company.verification_submitted_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Company Information */}
        <div className="xl:col-span-1 space-y-6">
          {/* Company Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Company Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Registration Number</p>
                  <p className="text-sm font-bold text-slate-800">
                    {company.registration_number || 'Not provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Industry</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {company.industry?.replace(/_/g, ' ').toUpperCase() || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Company Size</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {company.company_size || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Full Address</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {company.full_address || 'Not provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-100">
                  <Globe className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Website</p>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">Not provided</p>
                  )}
                </div>
              </div>

              {company.founded_year && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Founded Year</p>
                    <p className="text-sm font-semibold text-slate-800">{company.founded_year}</p>
                  </div>
                </div>
              )}

              {company.description && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{company.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Contact Person</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {getUserEmail()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-slate-800">{getUserFullName()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Phone className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {getUserPhone()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Notes */}
          {company.verification_notes && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                OCR Verification Notes
              </h2>
              <p className="text-sm text-amber-700">{company.verification_notes}</p>
            </div>
          )}

          {/* Verification Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Verification Checklist</h2>
            
            <div className="space-y-3">
              {[
                { key: 'registrationValid', label: 'Registration number is valid' },
                { key: 'addressVerified', label: 'Address is verified and accurate' },
                { key: 'documentsComplete', label: 'All required documents submitted' },
                { key: 'informationAccurate', label: 'Company information is accurate' },
                { key: 'noRedFlags', label: 'No red flags or concerns identified' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key as keyof typeof checklist]}
                    onChange={() => toggleChecklistItem(item.key as keyof typeof checklist)}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>

            {allChecksPassed && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">All checks passed!</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Document Viewer */}
        <div className="xl:col-span-2 space-y-6">
          {/* Document Viewer Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Legal Documents ({documents.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDocumentZoom(Math.max(50, documentZoom - 10))}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-sm font-semibold text-slate-600 min-w-[60px] text-center">
                    {documentZoom}%
                  </span>
                  <button
                    onClick={() => setDocumentZoom(Math.min(200, documentZoom + 10))}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setDocumentZoom(100)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Reset Zoom"
                  >
                    <RotateCw className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Document Tabs */}
              {documents.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {documents.map((doc, index) => (
                    <button
                      key={doc.document_id}
                      onClick={() => setSelectedDocument(index)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                        selectedDocument === index
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {doc.document_type || 'Document'} {index + 1}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-slate-600 font-semibold">No documents uploaded yet</p>
                  <p className="text-sm text-slate-500 mt-2">
                    The company needs to upload verification documents
                  </p>
                </div>
              )}
            </div>

            {/* Document Display Area */}
            {documents.length > 0 && (
              <div className="p-6 bg-slate-50 min-h-[600px]">
                <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                  <div 
                    className="relative"
                    style={{ 
                      transform: `scale(${documentZoom / 100})`, 
                      transformOrigin: 'top center',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    {loadingUrl ? (
                      <div className="p-12 text-center">
                        <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-slate-600">Loading document...</p>
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <Eye className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-slate-800 mb-2">
                          {documents[selectedDocument].file_name}
                        </p>
                        <p className="text-sm text-slate-500 mb-1">
                          Type: <span className="font-semibold">{documents[selectedDocument].document_type}</span>
                        </p>
                        <p className="text-sm text-slate-500 mb-1">
                          Size: <span className="font-semibold">{(documents[selectedDocument].file_size / 1024).toFixed(2)} KB</span>
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                          Uploaded: <span className="font-semibold">{formatDate(documents[selectedDocument].uploaded_at)}</span>
                        </p>
                        
                        {currentDocUrl ? (
                          <>
                            <a
                              href={currentDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
                            >
                              <Download className="w-5 h-5" />
                              <span>Download Document</span>
                            </a>
                            
                            <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
                              <p className="text-sm text-slate-600">
                                💡 <strong>Tip:</strong> Click the download button to view the full document in a new tab
                              </p>
                            </div>

                            {/* Show preview for images */}
                            {documents[selectedDocument].mime_type.startsWith('image/') && (
                              <div className="mt-8">
                                <img 
                                  src={currentDocUrl}
                                  alt={documents[selectedDocument].file_name}
                                  className="max-w-full mx-auto rounded-lg shadow-lg border-2 border-slate-200"
                                  onError={(e) => {
                                    console.error('Image failed to load');
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-600">
                              ❌ Failed to load document URL. Please try again.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Verification Decision</h3>
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-50 text-red-700 rounded-xl border-2 border-red-200 hover:bg-red-100 transition-all font-semibold disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                Reject Verification
              </button>
              
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={!allChecksPassed || processing}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 transition-all font-semibold ${
                  allChecksPassed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Approve Verification
              </button>
            </div>

            {!allChecksPassed && (
              <p className="mt-3 text-sm text-amber-600 text-center">
                ⚠️ Complete all checklist items to enable approval
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Reject Verification</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Please provide a clear reason for rejection. This will be sent to the company.
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="E.g., Registration certificate image is unclear. Please upload a higher quality scan..."
              className="w-full h-32 p-4 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 resize-none"
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Approve Verification</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Add optional notes about the verification (visible to company).
            </p>
            
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="E.g., All documents verified. Registration certificate is valid and matches company information."
              className="w-full h-32 p-4 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalNotes('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Approval
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}