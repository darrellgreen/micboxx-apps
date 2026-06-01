import { useCallback, useState } from "react";
import type { MediaAsset, MediaPickOptions, MediaPickerAdapter } from "./types";

export type MediaPickerState = "idle" | "picking" | "selected" | "cancelled" | "error";

export function useMediaPicker(adapter: MediaPickerAdapter) {
  const [state, setState] = useState<MediaPickerState>("idle");
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const pickImage = useCallback(
    async (options?: MediaPickOptions) => {
      setState("picking");
      setError(null);
      try {
        const result = await adapter.pickImage(options);
        if (result) {
          setAsset(result);
          setState("selected");
        } else {
          setState("cancelled");
        }
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Failed to pick image");
        setError(err);
        setState("error");
        return null;
      }
    },
    [adapter]
  );

  const pickAudio = useCallback(
    async (options?: MediaPickOptions) => {
      setState("picking");
      setError(null);
      try {
        const result = await adapter.pickAudio(options);
        if (result) {
          setAsset(result);
          setState("selected");
        } else {
          setState("cancelled");
        }
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Failed to pick audio");
        setError(err);
        setState("error");
        return null;
      }
    },
    [adapter]
  );

  const clear = useCallback(() => {
    setAsset(null);
    setError(null);
    setState("idle");
  }, []);

  return { state, asset, error, pickImage, pickAudio, clear };
}

import type { ProfileMediaUploadState, ProfileMediaUploadAdapter } from "./types";

export function useProfileMediaUpload(adapter: ProfileMediaUploadAdapter) {
  const [state, setState] = useState<ProfileMediaUploadState>({
    status: "idle",
    target: null,
    error: null,
  });

  const uploadAvatar = useCallback(
    async (asset: MediaAsset) => {
      setState({ status: "uploading", target: "avatar", error: null });
      try {
        await adapter.uploadAvatar(asset);
        setState({ status: "success", target: "avatar", error: null });
      } catch (e) {
        setState({
          status: "error",
          target: "avatar",
          error: e instanceof Error ? e.message : "Failed to upload avatar",
        });
        throw e;
      }
    },
    [adapter]
  );

  const uploadCover = useCallback(
    async (asset: MediaAsset) => {
      setState({ status: "uploading", target: "cover", error: null });
      try {
        await adapter.uploadCover(asset);
        setState({ status: "success", target: "cover", error: null });
      } catch (e) {
        setState({
          status: "error",
          target: "cover",
          error: e instanceof Error ? e.message : "Failed to upload cover",
        });
        throw e;
      }
    },
    [adapter]
  );

  const reset = useCallback(() => {
    setState({ status: "idle", target: null, error: null });
  }, []);

  return { state, uploadAvatar, uploadCover, reset };
}

import type {
  AlbumMetadata,
  AlbumUploadAdapter,
  AlbumUploadState,
  TrackMetadata,
  TrackUploadAdapter,
  TrackUploadState,
} from "./types";

export function useTrackUpload(adapter: TrackUploadAdapter) {
  const [state, setState] = useState<TrackUploadState>({
    status: "idle",
    error: null,
    trackId: null,
  });

  const uploadTrack = useCallback(
    async (audio: MediaAsset, artwork: MediaAsset, metadata: TrackMetadata) => {
      setState({ status: "uploading", error: null, trackId: null });
      try {
        const result = await adapter.uploadTrack(audio, artwork, metadata);
        setState({ status: "success", error: null, trackId: result.id });
        return result.id;
      } catch (e) {
        setState({
          status: "error",
          error: e instanceof Error ? e.message : "Failed to upload track",
          trackId: null,
        });
        throw e;
      }
    },
    [adapter]
  );

  const reset = useCallback(() => {
    setState({ status: "idle", error: null, trackId: null });
  }, []);

  return { state, uploadTrack, reset };
}

export function useAlbumUpload(adapter: AlbumUploadAdapter) {
  const [state, setState] = useState<AlbumUploadState>({
    status: "idle",
    error: null,
    albumId: null,
  });

  const uploadAlbum = useCallback(
    async (artwork: MediaAsset, metadata: AlbumMetadata) => {
      setState({ status: "uploading", error: null, albumId: null });
      try {
        const result = await adapter.uploadAlbum(artwork, metadata);
        setState({ status: "success", error: null, albumId: result.id });
        return result.id;
      } catch (e) {
        setState({
          status: "error",
          error: e instanceof Error ? e.message : "Failed to create album",
          albumId: null,
        });
        throw e;
      }
    },
    [adapter]
  );

  const reset = useCallback(() => {
    setState({ status: "idle", error: null, albumId: null });
  }, []);

  return { state, uploadAlbum, reset };
}
