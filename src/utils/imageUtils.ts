export const getImageSource = (uri: string | null | undefined): any => {
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    return null;
  }

  let cleanUri = uri.trim();
  
  // Handle protocol-relative URLs
  if (cleanUri.startsWith('//')) {
    cleanUri = `https:${cleanUri}`;
  }

  // Wikipedia/Wikimedia requirement
  if (cleanUri.includes('wikimedia.org') || cleanUri.includes('wikipedia.org')) {
    // encodeURI to handle spaces and special characters in Wiki URLs
    const encodedUri = encodeURI(cleanUri);
    return {
      uri: encodedUri,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    };
  }

  // Return object with uri for regular sources to ensure compatibility with ImageBackground
  return cleanUri.startsWith('http') ? { uri: cleanUri } : null;
};
