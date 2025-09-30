"use client";

// src/components/profile/resume-upload/ResumeUpload.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import Button from '@/src/components/layout/Button';
import { DropZone } from './DropZone';
import { FileText, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react';
import { useUploadApplicationResume } from '@/src/lib/profile/profile.queries';
import { useProfile } from '@/src/context/ProfileContext';

interface ResumeUploadProps {
  className?: string;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const uploadMutation = useUploadApplicationResume();
  const { profileData } = useProfile();

  // Get existing application resume info
  const existingResumeUrl = profileData?.resume_application_url;
  const existingFileName = existingResumeUrl ? 
    decodeURIComponent(existingResumeUrl.split('/').pop()?.split('_').slice(2).join('_') || 'Resume') 
    : null;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadProgress(0);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      await uploadMutation.mutateAsync(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setSelectedFile(null); // Clear selected file after successful upload
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    if (uploadMutation.isPending) {
      return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    if (uploadMutation.isSuccess) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (uploadMutation.isError) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  const getStatusMessage = () => {
    if (uploadMutation.isPending) return 'Uploading resume...';
    if (uploadMutation.isSuccess) return 'Resume uploaded successfully!';
    if (uploadMutation.isError) return 'Upload failed. Please try again.';
    return '';
  };

  const getStatusColor = () => {
    if (uploadMutation.isPending) return 'text-blue-600';
    if (uploadMutation.isSuccess) return 'text-green-600';
    if (uploadMutation.isError) return 'text-red-600';
    return '';
  };

  return (
    <Card className={`w-full max-w-sm ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Upload your resume
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Upload resume for job applications.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Show Existing Resume if Available */}
        {existingResumeUrl && !selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText className="h-8 w-8 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {existingFileName}
                </p>
                <p className="text-xs text-green-600">
                  Current application resume
                </p>
              </div>
              <a
                href={existingResumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-green-100 rounded-full transition-colors"
                title="Download resume"
              >
                <Download className="h-4 w-4 text-green-600" />
              </a>
            </div>
            
            <Button
              text="Upload new resume"
              onClick={() => setSelectedFile({} as File)} // Trigger file selection
              variant="dark"
              className="w-full"
            />
          </div>
        )}

        {/* Drop Zone or Selected File */}
        {(!existingResumeUrl || selectedFile) && !selectedFile && (
          <DropZone
            onFileSelect={handleFileSelect}
            acceptedTypes={['.pdf', '.doc', '.docx']}
            maxSizeMB={10}
          />
        )}

        {selectedFile && selectedFile.name && (
          <div className="space-y-4">
            {/* Selected File Display */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!uploadMutation.isPending && (
                <button
                  onClick={removeSelectedFile}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <span className="sr-only">Remove file</span>
                  ✕
                </button>
              )}
            </div>

            {/* Upload Progress */}
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-gray-900 font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Message */}
            {(uploadMutation.isPending || uploadMutation.isSuccess || uploadMutation.isError) && (
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon()}
                <span className={getStatusColor()}>
                  {getStatusMessage()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Show Drop Zone again if "Upload new resume" was clicked */}
        {existingResumeUrl && selectedFile && !selectedFile.name && (
          <DropZone
            onFileSelect={handleFileSelect}
            acceptedTypes={['.pdf', '.doc', '.docx']}
            maxSizeMB={10}
          />
        )}

        {/* Upload Button */}
        {selectedFile && selectedFile.name && !uploadMutation.isSuccess && (
      <Button
        text={uploadMutation.isPending ? 'Uploading...' : 'Upload resume'}
        onClick={handleUpload}
        variant="dark"
        animation={false}
        className="w-full"
      />
        )}
      </CardContent>
    </Card>
  );
};