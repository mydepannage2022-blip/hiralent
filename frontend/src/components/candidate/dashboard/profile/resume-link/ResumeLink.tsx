"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import Button from '@/src/components/layout/Button';
import { Copy, Check } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { useAuth } from '@/src/context/AuthContext';

interface ResumeLinkProps {
  className?: string;
}

export const ResumeLink: React.FC<ResumeLinkProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [isCopied, setIsCopied] = useState(false);
  
  // Generate real public profile URL using candidate ID and frontend URL
  const getPublicProfileUrl = () => {
    if (!user?.user_id) return '';
    
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
    return `${frontendUrl}/candidate/public-profile/${user.user_id}`;
  };

  const profileUrl = getPublicProfileUrl();
  
  const handleCopyLink = async () => {
    if (!profileUrl) return;
    
    try {
      await navigator.clipboard.writeText(profileUrl);
      setIsCopied(true);
      
      // Reset copy state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = profileUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Don't render if no user or user_id
  if (!user?.user_id) {
    return (
      <Card className={`w-full max-w-sm ${className}`}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please log in to view your resume link</p>
        </CardContent>
      </Card>
    );
  }

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
            url={profileUrl}
            size={150}
          />
        </div>
        
        {/* Resume Link */}
        <div className="text-center space-y-3">
          <p className="text-blue-600 font-medium text-sm break-all">
            {profileUrl}
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