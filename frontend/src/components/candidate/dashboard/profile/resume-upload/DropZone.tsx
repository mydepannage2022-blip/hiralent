"use client";

// src/components/profile/resume-upload/DropZone.tsx

import React, { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  acceptedTypes = ['.pdf', '.doc', '.docx'],
  maxSizeMB = 10,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type must be one of: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    setError('');
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 hover:border-blue-400 hover:bg-blue-50
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : error 
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-gray-50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {/* Upload Icon */}
        <div className="flex justify-center mb-4">
          <div className={`
            p-3 rounded-full 
            ${error ? 'bg-red-100' : 'bg-blue-100'}
          `}>
            <Upload className={`
              h-8 w-8 
              ${error ? 'text-red-500' : 'text-blue-500'}
            `} />
          </div>
        </div>

        {/* Upload Text */}
        <div className="space-y-2">
          <p className={`
            text-sm font-medium 
            ${error ? 'text-red-600' : 'text-gray-700'}
          `}>
            {error || 'Drag & Drop or Choose file'}
          </p>
          <p className="text-xs text-gray-500">
            To upload PDF MAX 10 MB
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* File Type Info */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-400">
          Supported formats: {acceptedTypes.join(', ')} (Max {maxSizeMB}MB)
        </p>
      </div>
    </div>
  );
};