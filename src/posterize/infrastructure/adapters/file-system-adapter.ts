/**
 * Infrastructure adapter for file system operations in the browser
 */
import { IFileSystemAdapter } from '../../types/interfaces';

export class FileSystemAdapter implements IFileSystemAdapter {
  /**
   * Read a file as Data URL
   */
  readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Create a downloadable blob from content
   */
  createDownloadableBlob(content: string, mimeType: string): { url: string, blob: Blob } {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    return { url, blob };
  }

  /**
   * Trigger file download
   */
  triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Load an image from a URL and return as an Image object
   */
  loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
      
      img.src = url;
    });
  }
}
