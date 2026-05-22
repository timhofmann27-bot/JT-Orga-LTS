/**
 * Generates a color based on a string (like a name or username)
 * Used for avatar backgrounds when no image is provided
 */
export function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate a pleasant color (not too dark or too light)
  const hue = hash % 360;
  const saturation = 40 + (hash % 30); // 40-70%
  const lightness = 50 + (hash % 20);  // 50-70%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Gets initials from a name
 */
export function getInitials(name: string | null | undefined): string {
  return (name || "U")
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Handles avatar file validation and processing
 */
export function processAvatarFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    // Validate file type
    if (!file.type.match('image.*')) {
      resolve(null);
      return;
    }
    
    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      resolve(null);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}