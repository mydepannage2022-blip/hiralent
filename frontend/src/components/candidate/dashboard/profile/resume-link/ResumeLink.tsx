"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import Button from '@/src/components/layout/Button';
import { Copy, Check } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ResumeLink as ResumeLinkType } from '@/src/types/profile';

// MOCK DATA
const mockResumeLink: ResumeLinkType = {
  url: 'https://Joblin.com/u/LF-8752322',
  qrCodeData: 'https://Joblin.com/u/LF-8752322'
};

interface ResumeLinkProps {
  data?: ResumeLinkType; // Optional ab
  className?: string;
}

export const ResumeLink: React.FC<ResumeLinkProps> = ({
  data = mockResumeLink, // Default mock data
  className = ''
}) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      setIsCopied(true);
      
      // Reset copy state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = data.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Card className={`w-full max-w-sm ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Your Resume Link
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Share your resume using this unique link.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <QRCodeDisplay 
            url={data.url}
            size={150}
          />
        </div>
        
        {/* Resume Link */}
        <div className="text-center space-y-3">
          <p className="text-blue-600 font-medium text-sm break-all">
            {data.url}
          </p>
          
          <Button
            text={isCopied ? "Copied!" : "Copy link"}
            onClick={handleCopyLink}
            variant="light"
            animation={false}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};