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
