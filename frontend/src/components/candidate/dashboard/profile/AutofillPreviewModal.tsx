// src/components/candidate/dashboard/profile/AutofillPreviewModal.tsx

"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  User,
  Briefcase,
  Code,
  GraduationCap,
  Award,
  Globe,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Github,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAutofillPreview, useApplyAutofill } from '@/src/lib/profile/autofill.queries';
import toast from 'react-hot-toast'; 

interface AutofillPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  onApplySuccess?: () => void;
}

const AutofillPreviewModal: React.FC<AutofillPreviewModalProps> = ({
  isOpen,
  onClose,
  documentId,
  onApplySuccess
}) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'skills' | 'experience' | 'education'>('all');
  
  const { data: previewData, isLoading, isError, error } = useAutofillPreview(documentId, isOpen);
  const { mutate: applyAutofill, isPending: isApplying } = useApplyAutofill();

  const handleApply = () => {
    if (!previewData?.data?.session_id) {
      console.error('❌ No session_id found');
      return;
    }
    
    console.log('📤 Applying autofill with session:', previewData.data.session_id);
    
    applyAutofill(previewData.data.session_id, {
      onSuccess: async (response) => {
        console.log('✅ Autofill applied successfully:', response);
        
        // Show success message first
        toast.success('CV data applied successfully!');
        
        // Close modal
        onClose();
        
        // Call the callback if provided
        if (onApplySuccess) {
          await onApplySuccess();
        }
      },
      onError: (error: any) => {
        console.error('❌ Apply failed:', error?.response?.data || error);
        toast.error('Failed to apply autofill. Please try again.');
      }
    });
  };
  if (!isOpen) return null;

  const parsedData = previewData?.data?.parsed_data;
  const confidenceScores = previewData?.data?.confidence_scores;
  
  // ✅ Check if it's a 409 error (still processing)
  const isProcessing = (error as any)?.response?.status === 409;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">CV Autofill Preview</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review the extracted information before applying
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isApplying}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>


          {isError && isProcessing && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                  <Clock className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Your CV</h3>
                <p className="text-gray-600 text-sm mb-4">
                  We're analyzing your resume with AI. This usually takes 10-30 seconds.
                </p>
                
                {/* ✅ ADD: Show what's being processed */}
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800 font-medium">
                    Extracting skills, experience, education, projects, certifications, and languages...
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Retrying automatically...</span>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Please keep this window open • This may take up to 60 seconds
                </p>
              </div>
            </div>
          )}

          {/* ✅ IMPROVED: Loading State */}
          {isLoading && !isError && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Analyzing your CV...</p>
                <p className="text-sm text-gray-500 mt-2">Extracting skills, experience, and education</p>
              </div>
            </div>
          )}

          {/* ✅ IMPROVED: Error State (non-409) */}
          {isError && !isProcessing && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Error</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {(error as any)?.response?.data?.message || 'Failed to process your CV. Please try again.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {parsedData && (
            <>
              {/* ✅ IMPROVED: Tabs with better styling */}
              <div className="px-6 py-3 border-b border-gray-200 flex gap-2 overflow-x-auto bg-gray-50">
                {[
                  { id: 'all', label: 'All Fields', icon: CheckCircle2, count: null },
                  { id: 'skills', label: 'Skills', icon: Code, count: parsedData.skills?.length || 0 },
                  { id: 'experience', label: 'Experience', icon: Briefcase, count: parsedData.experience?.length || 0 },
                  { id: 'education', label: 'Education', icon: GraduationCap, count: parsedData.education?.length || 0 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        selectedTab === tab.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          selectedTab === tab.id ? 'bg-blue-700' : 'bg-gray-200'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gray-50">
                
                {/* Personal Info */}
                {(selectedTab === 'all') && parsedData.personal_info && Object.values(parsedData.personal_info).some(Boolean) && (
                  <Section title="Personal Information" icon={User} confidence={confidenceScores?.personal_info}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {parsedData.personal_info.email && (
                        <InfoItem icon={Mail} label="Email" value={parsedData.personal_info.email} />
                      )}
                      {parsedData.personal_info.phone && (
                        <InfoItem icon={Phone} label="Phone" value={parsedData.personal_info.phone} />
                      )}
                      {parsedData.personal_info.location && (
                        <InfoItem icon={MapPin} label="Location" value={parsedData.personal_info.location} />
                      )}
                      {parsedData.personal_info.linkedin && (
                        <InfoItem 
                          icon={Linkedin} 
                          label="LinkedIn" 
                          value={parsedData.personal_info.linkedin}
                          link={`https://${parsedData.personal_info.linkedin}`}
                        />
                      )}
                      {parsedData.personal_info.github && (
                        <InfoItem 
                          icon={Github} 
                          label="GitHub" 
                          value={parsedData.personal_info.github}
                          link={`https://${parsedData.personal_info.github}`}
                        />
                      )}
                    </div>
                  </Section>
                )}

                {/* Headline */}
                {(selectedTab === 'all') && parsedData.headline && (
                  <Section title="Professional Headline" icon={User} confidence={confidenceScores?.headline}>
                    <p className="text-gray-700 leading-relaxed">{parsedData.headline}</p>
                  </Section>
                )}

                {/* About Me */}
                {(selectedTab === 'all') && parsedData.about_me && (
                  <Section title="About Me" icon={User} confidence={confidenceScores?.about_me}>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{parsedData.about_me}</p>
                  </Section>
                )}

                {/* Skills */}
                {(selectedTab === 'all' || selectedTab === 'skills') && parsedData.skills && parsedData.skills.length > 0 && (
                  <Section title="Skills" icon={Code} confidence={confidenceScores?.skills}>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                          {skill.skill_name}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Experience */}
                {(selectedTab === 'all' || selectedTab === 'experience') && parsedData.experience && parsedData.experience.length > 0 && (
                  <Section title="Work Experience" icon={Briefcase} confidence={confidenceScores?.experience}>
                    <div className="space-y-4">
                      {parsedData.experience.map((exp, idx) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-4 hover:bg-blue-50 p-3 rounded-r-lg transition-colors">
                          <h4 className="font-semibold text-gray-900">{exp.job_title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{exp.company} • {exp.duration}</p>
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Projects */}
                {(selectedTab === 'all') && parsedData.projects && parsedData.projects.length > 0 && (
                  <Section title="Projects" icon={Code} confidence={confidenceScores?.projects}>
                    <div className="space-y-4">
                      {parsedData.projects.map((project, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                          <h4 className="font-semibold text-gray-900">{project.name}</h4>
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{project.description}</p>
                          {project.technologies && project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {project.technologies.map((tech, techIdx) => (
                                <span
                                  key={techIdx}
                                  className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Education */}
                {(selectedTab === 'all' || selectedTab === 'education') && parsedData.education && parsedData.education.length > 0 && (
                  <Section title="Education" icon={GraduationCap} confidence={confidenceScores?.education}>
                    <div className="space-y-4">
                      {parsedData.education.map((edu, idx) => (
                        <div key={idx} className="border-l-4 border-green-500 pl-4 hover:bg-green-50 p-3 rounded-r-lg transition-colors">
                          <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                          <p className="text-sm text-gray-600 mt-1">{edu.institution}</p>
                          <p className="text-sm text-gray-500">{edu.year} • {edu.field}</p>
                          {edu.honors && (
                            <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                              🏆 {edu.honors}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Certifications */}
                {(selectedTab === 'all') && parsedData.certifications && parsedData.certifications.length > 0 && (
                  <Section title="Certifications" icon={Award} confidence={confidenceScores?.certifications}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {parsedData.certifications.map((cert, idx) => (
                        <div key={idx} className="bg-purple-50 rounded-lg p-3 border border-purple-200 hover:shadow-md transition-shadow">
                          <h4 className="font-medium text-gray-900 text-sm">{cert.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{cert.issuer}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Languages */}
                {(selectedTab === 'all') && parsedData.languages && parsedData.languages.length > 0 && (
                  <Section title="Languages" icon={Globe} confidence={confidenceScores?.languages}>
                    <div className="flex flex-wrap gap-3">
                      {parsedData.languages.map((lang, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-900 rounded-lg hover:bg-orange-200 transition-colors">
                          <span className="font-medium">{lang.language}</span>
                          <span className="text-sm">({lang.proficiency})</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

              </div>

              {/* ✅ IMPROVED: Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between bg-white gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>
                    Extracted <strong>{parsedData.skills?.length || 0}</strong> skills, 
                    <strong> {parsedData.experience?.length || 0}</strong> experiences, 
                    <strong> {parsedData.education?.length || 0}</strong> education entries
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    disabled={isApplying}
                    className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Apply to Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ✅ IMPROVED: Helper Components
const Section: React.FC<{
  title: string;
  icon: any;
  confidence?: number;
  children: React.ReactNode;
}> = ({ title, icon: Icon, confidence, children }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {confidence !== undefined && (
        <span className="text-xs font-medium px-3 py-1 bg-green-100 text-green-700 rounded-full">
          {Math.round(confidence * 100)}% confidence
        </span>
      )}
    </div>
    {children}
  </motion.div>
);

const InfoItem: React.FC<{
  icon: any;
  label: string;
  value: string;
  link?: string;
}> = ({ icon: Icon, label, value, link }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
      <Icon className="w-5 h-5 text-gray-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      {link ? (
        <a
        
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5 font-medium"
        >
          {value}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <p className="text-sm text-gray-900 mt-0.5 truncate font-medium">{value}</p>
      )}
    </div>
  </div>
);

export default AutofillPreviewModal;