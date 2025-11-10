// backend/src/utils/locationDetector.util.ts

interface LocationInfo {
  country: string;
  city: string;
  region: string;
}

// API Response Types
interface IPApiResponse {
  status?: string;
  country?: string;
  city?: string;
  regionName?: string;
}

interface IPApiCoResponse {
  country_name?: string;
  city?: string;
  region?: string;
  error?: boolean;
}

// Simple IP to location mapping (you can enhance this with real API)
export const getLocationFromIP = async (ipAddress: string): Promise<LocationInfo> => {
  // Handle localhost and private IPs
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || 
      ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.16.')) {
    return {
      country: 'Unknown',
      city: 'Local Network',
      region: 'Private'
    };
  }

  try {
    // Option 1: Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=country,city,regionName,status`);
    
    if (response.ok) {
      const data: IPApiResponse = await response.json();
      
      if (data.status === 'success') {
        return {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          region: data.regionName || 'Unknown'
        };
      }
    }
  } catch (error) {
    console.error('IP Location Detection Error:', error);
  }

  // Fallback to unknown if API fails
  return {
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown'
  };
};

// Alternative implementation using ipapi.co (more reliable)
export const getLocationFromIPApi = async (ipAddress: string): Promise<LocationInfo> => {
  // Handle localhost and private IPs
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || 
      ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.16.')) {
    return {
      country: 'Pakistan', // Default for development
      city: 'Karachi',
      region: 'Sindh'
    };
  }

  try {
    // Using ipapi.co (free tier: 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
    
    if (response.ok) {
      const data: IPApiCoResponse = await response.json();
      
      if (!data.error) {
        return {
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          region: data.region || 'Unknown'
        };
      }
    }
  } catch (error) {
    console.error('IP Location Detection Error:', error);
  }

  // Fallback
  return {
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown'
  };
};

// Get client IP from request (handles proxies)
export const getClientIP = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  const cloudflareIP = req.headers['cf-connecting-ip'] as string;
  
  if (cloudflareIP) return cloudflareIP;
  if (realIP) return realIP;
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs
    return forwarded.split(',')[0].trim();
  }
  
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         '127.0.0.1';
};

// Create location string for display
export const createLocationString = (location: LocationInfo): string => {
  if (location.city === 'Unknown' && location.country === 'Unknown') {
    return 'Unknown Location';
  }
  
  if (location.city === 'Unknown') {
    return location.country;
  }
  
  return `${location.city}, ${location.country}`;
};

// Get country flag emoji
export const getCountryFlag = (countryName: string): string => {
  const countryFlags: Record<string, string> = {
    'Pakistan': '🇵🇰',
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Canada': '🇨🇦',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'India': '🇮🇳',
    'China': '🇨🇳',
    'Japan': '🇯🇵',
    'Australia': '🇦🇺',
    'Netherlands': '🇳🇱',
    'Unknown': '🌍'
  };
  
  return countryFlags[countryName] || '🌍';
};
