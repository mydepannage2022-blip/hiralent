"use client";

// src/components/profile/resume-upload/ResumeUpload.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import Button from '@/src/components/layout/Button';
import { DropZone } from './DropZone';
import { FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ResumeUploadProps {
  uploadType?: 'profile_building' | 'application_specific';
  onUploadComplete?: (file: File) => void;
  className?: string;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({
  uploadType = 'application_specific', // Changed default
  onUploadComplete,
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadStatus('idle');
    setUploadMessage('');
    setUploadProgress(0);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadMessage('');
    setUploadProgress(0);
  };

  const simulateUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setUploadMessage('Uploading resume...');

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Simulate upload completion
    setTimeout(() => {
      setUploadStatus('success');
      setUploadMessage('Resume uploaded successfully!');
      onUploadComplete?.(selectedFile);
    }, 500);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // Here you would implement actual upload logic
      // For now, we'll simulate it
      await simulateUpload();
      
      // Real implementation would be:
      // const formData = new FormData();
      // formData.append('resume', selectedFile);
      // formData.append('uploadType', uploadType);
      // const response = await fetch('/api/resume/upload', {
      //   method: 'POST',
      //   body: formData
      // });
      
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
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
    switch (uploadStatus) {
      case 'uploading':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
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
        {/* Drop Zone or Selected File */}
        {!selectedFile ? (
          <DropZone
            onFileSelect={handleFileSelect}
            acceptedTypes={['.pdf', '.doc', '.docx']}
            maxSizeMB={10}
          />
        ) : (
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
              {uploadStatus === 'idle' && (
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
            {uploadStatus === 'uploading' && (
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
            {uploadMessage && (
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon()}
                <span className={`
                  ${uploadStatus === 'success' ? 'text-green-600' : ''}
                  ${uploadStatus === 'error' ? 'text-red-600' : ''}
                  ${uploadStatus === 'uploading' ? 'text-blue-600' : ''}
                `}>
                  {uploadMessage}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && uploadStatus !== 'success' && (
          <Button
            text={uploadStatus === 'uploading' ? 'Uploading...' : 'Upload resume'}
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