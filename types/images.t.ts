// For PNG files
declare module "*.png" {
  const value: number | { uri: string; width?: number; height?: number };
  export default value;
}

// For JPG files (your current images)
declare module "*.jpg" {
  const value: number | { uri: string; width?: number; height?: number };
  export default value;
}

// For JPEG files
declare module "*.jpeg" {
  const value: number | { uri: string; width?: number; height?: number };
  export default value;
}

// For SVG files (if you use any)
declare module "*.svg" {
  const value: number | { uri: string; width?: number; height?: number };
  export default value;
}

// For WebP files
declare module "*.webp" {
  const value: number | { uri: string; width?: number; height?: number };
  export default value;
}
