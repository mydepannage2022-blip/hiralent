interface DeviceInfo {
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    name: string;
  };
}

export const detectDevice = (userAgent: string): DeviceInfo => {
  const ua = userAgent.toLowerCase();
  
  let browserName = 'Unknown';
  let browserVersion = '';
  
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browserName = 'Chrome';
    const match = ua.match(/chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('firefox')) {
    browserName = 'Firefox';
    const match = ua.match(/firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browserName = 'Safari';
    const match = ua.match(/version\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('edg')) {
    browserName = 'Edge';
    const match = ua.match(/edg\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browserName = 'Opera';
    const match = ua.match(/(?:opera|opr)\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  }
  
  let osName = 'Unknown';
  let osVersion = '';
  
  if (ua.includes('windows nt')) {
    osName = 'Windows';
    if (ua.includes('windows nt 10.0')) osVersion = '10/11';
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
    else if (ua.includes('windows nt 6.2')) osVersion = '8';
    else if (ua.includes('windows nt 6.1')) osVersion = '7';
  } else if (ua.includes('mac os x')) {
    osName = 'macOS';
    const match = ua.match(/mac os x ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('linux')) {
    osName = 'Linux';
  } else if (ua.includes('android')) {
    osName = 'Android';
    const match = ua.match(/android ([\d.]+)/);
    osVersion = match ? match[1] : '';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    osName = ua.includes('ipad') ? 'iPadOS' : 'iOS';
    const match = ua.match(/os ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  }
  
  // Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  let deviceName = 'Unknown Device';
  
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod')) {
    deviceType = 'mobile';
    if (ua.includes('iphone')) deviceName = 'iPhone';
    else if (ua.includes('android')) deviceName = 'Android Phone';
    else deviceName = 'Mobile Device';
  } else if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    deviceType = 'tablet';
    if (ua.includes('ipad')) deviceName = 'iPad';
    else deviceName = 'Android Tablet';
  } else {
    deviceType = 'desktop';
    if (osName === 'Windows') deviceName = 'Windows PC';
    else if (osName === 'macOS') deviceName = 'Mac';
    else if (osName === 'Linux') deviceName = 'Linux PC';
    else deviceName = 'Desktop Computer';
  }
  
  return {
    browser: {
      name: browserName,
      version: browserVersion
    },
    os: {
      name: osName,
      version: osVersion
    },
    device: {
      type: deviceType,
      name: deviceName
    }
  };
};

// Helper function to create a readable device string
export const createDeviceString = (deviceInfo: DeviceInfo): string => {
  const { browser, os } = deviceInfo;
  return `${browser.name} on ${os.name}`;
};

// Helper function to get device icon based on type
export const getDeviceIcon = (deviceType: string): string => {
  switch (deviceType) {
    case 'mobile':
      return '📱';
    case 'tablet':
      return '📱';
    case 'desktop':
      return '💻';
    default:
      return '🖥️';
  }
};
