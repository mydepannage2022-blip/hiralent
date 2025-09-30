"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Link, X, Check, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useUpdateLinks, useAddLink, useDeleteLink } from '@/src/lib/profile/profile.queries';
import { SocialLinkData } from '@/src/lib/profile/profile.api';
import { useProfile } from '@/src/context/ProfileContext';

const LinksSection: React.FC = () => {
  const { profileData, setProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [links, setLinks] = useState<SocialLinkData[]>([]);
  const [newLink, setNewLink] = useState<SocialLinkData>({
    platform: 'github',
    url: '',
    display_name: ''
  });

  const { mutate: updateLinks, isPending: isUpdating } = useUpdateLinks();
  const { mutate: addLink, isPending: isAdding } = useAddLink();
  const { mutate: deleteLink, isPending: isDeleting } = useDeleteLink();

  // Parse links data from profile context
  const getLinksData = (): SocialLinkData[] => {
    if (!profileData?.links) return [];
    
    try {
      let linksArray = [];
      
      if (typeof profileData.links === 'string') {
        linksArray = JSON.parse(profileData.links);
      } else if (Array.isArray(profileData.links)) {
        linksArray = profileData.links;
      }
      
      return linksArray.map((link: any) => ({
        platform: link.platform || 'other',
        url: link.url || '',
        display_name: link.display_name || ''
      }));
    } catch (error) {
      console.error('Error parsing links data:', error);
    }
    return [];
  };

  useEffect(() => {
    const linksData = getLinksData();
    setLinks(linksData);
  }, [profileData]);

  const handleEdit = () => {
    setIsEditing(true);
    const linksData = getLinksData();
    setLinks([...linksData]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    const linksData = getLinksData();
    setLinks([...linksData]);
    setNewLink({
      platform: 'github',
      url: '',
      display_name: ''
    });
  };

  const handleSave = () => {
    // Validate URLs before sending
    const sanitizedLinks = links.filter(link => link.url.trim()).map(link => ({
      ...link,
      url: link.url.trim(),
      display_name: link.display_name?.trim() || ''
    }));
    
    updateLinks(sanitizedLinks, {
      onSuccess: () => {
        setIsEditing(false);
        setProfileData({
          ...profileData,
          links: [...sanitizedLinks],
        });
      },
      onError: (error) => {
        console.error("API Error:", error);
      }
    });
  };

  const handleAddLink = () => {
    if (newLink.url.trim() && newLink.platform.trim()) {
      setLinks([...links, { ...newLink }]);
      setNewLink({
        platform: 'github',
        url: '',
        display_name: ''
      });
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: keyof SocialLinkData, value: string) => {
    const updatedLinks = [...links];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };
    setLinks(updatedLinks);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github': return '🐙';
      case 'linkedin': return '💼';
      case 'twitter': return '🐦';
      case 'portfolio': return '🌐';
      case 'behance': return '🎨';
      case 'dribbble': return '🏀';
      default: return '🔗';
    }
  };

  const hasContent = getLinksData().length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Link className="w-2 h-2 lg:w-4 lg:h-4 text-blue-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Links</h3>
        </div>
        
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-2 h-2 lg:w-4 lg:h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-2 h-2 lg:w-4 lg:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-2 h-2 lg:w-4 lg:h-4" />
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div>
          {hasContent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getLinksData().map((link: any, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <span className="text-lg">{getPlatformIcon(link.platform)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-xs lg:text-sm capitalize">{link.platform}</p>
                    <p className="text-gray-600 text-[10px] lg:text-xs truncate">{link.display_name || link.url}</p>
                  </div>
                  <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 group-hover:text-gray-600" />
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xs lg:text-sm">Add all your portfolio and social links here</p>
              <button
                onClick={handleEdit}
                className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
              >
                Add links
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing Links */}
          {links.map((link, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={link.platform}
                  onChange={(e) => handleLinkChange(index, 'platform', e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="github">GitHub</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="behance">Behance</option>
                  <option value="dribbble">Dribbble</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="https://github.com/username"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => handleRemoveLink(index)}
                  className="w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add New Link */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
              <select
                value={newLink.platform}
                onChange={(e) => setNewLink({...newLink, platform: e.target.value})}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="github">GitHub</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="portfolio">Portfolio</option>
                <option value="behance">Behance</option>
                <option value="dribbble">Dribbble</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://your-profile-url.com"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleAddLink}
                disabled={!newLink.url.trim()}
                className="w-full px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LinksSection;