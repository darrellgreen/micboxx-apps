export interface MediaAsset {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileName?: string | null;
  fileSize?: number;
}

export interface AudioFile {
  uri: string;
  mimeType?: string;
  name: string;
  size?: number;
  duration?: number | null;
}

export interface MediaFile {
  uri: string;
  mimeType?: string;
  name: string;
  size?: number;
}

export type UploadProgressState = "pending" | "uploading" | "processing" | "success" | "error";

export interface UploadSessionRequest {
  entityId: string;
  entityType: "track" | "album" | "avatar" | "cover";
  files: Record<string, MediaFile>;
}

export interface UploadProgressEvent {
  bytesSent: number;
  totalBytes: number;
  progress: number; // 0 to 1
}

export interface MediaUploadAdapter {
  uploadFile(
    file: MediaFile,
    url: string,
    onProgress?: (event: UploadProgressEvent) => void
  ): Promise<void>;
}

export interface MediaCacheAdapter {
  getCachedUri(remoteUrl: string): Promise<string | null>;
  setCachedUri(remoteUrl: string, localUri: string): Promise<void>;
  generateCacheKey(remoteUrl: string): string;
}
