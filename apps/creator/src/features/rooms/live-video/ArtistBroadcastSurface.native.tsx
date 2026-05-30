import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    NativeModules,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { endActiveRoomMoment, getRoomLiveVideoHostToken } from "@/features/rooms/api";
import type { RoomLiveVideoTokenResponse, RoomMomentState } from "@/features/rooms/types";
import { CreatorApiError } from "@/shared/api/creator-dashboard";
import { tokens } from "@/theme/tokens";

const LIVEKIT_CAMERA_SOURCE = "camera";
const LIVEKIT_CONNECTED_STATE = "connected";
const TOKEN_STALE_BUFFER_SECONDS = 30;
const TOKEN_REFRESH_BUFFER_SECONDS = 120;

type NormalizedConnectionState = "connected" | "connecting" | "reconnecting" | "disconnected";

type BroadcastRuntimeState = {
  connectionState: string;
  cameraPermissionDenied: boolean;
  micPermissionDenied: boolean;
  hasPublishedCameraTrack: boolean;
  hasPublishedMicrophone: boolean;
};

type LiveKitNativeModule = {
  isTrackReference: (trackRef: unknown) => boolean;
  LiveKitRoom: React.ComponentType<Record<string, unknown>>;
  useConnectionState: () => string;
  useLocalParticipant: () => {
    isCameraEnabled: boolean;
    isMicrophoneEnabled: boolean;
    lastCameraError?: unknown;
    lastMicrophoneError?: unknown;
    localParticipant: {
      setCameraEnabled: (enabled: boolean) => Promise<unknown>;
      setMicrophoneEnabled: (enabled: boolean) => Promise<unknown>;
    };
  };
  useTracks: (
    sources: string[],
    options: { onlySubscribed: boolean },
  ) => unknown[];
  VideoTrack: React.ComponentType<Record<string, unknown>>;
};

type VideoTrackReference = {
  participant?: {
    isLocal?: boolean;
  };
  publication?: {
    kind?: string;
    source?: string;
    track?: unknown;
  };
};

let cachedLiveKitModule: LiveKitNativeModule | null = null;
let cachedLiveKitLoadError: string | null = null;

function loadLiveKitNativeModule(): LiveKitNativeModule | null {
  if (cachedLiveKitModule) {
    return cachedLiveKitModule;
  }

  if (!NativeModules.LivekitReactNativeModule) {
    cachedLiveKitLoadError = "LiveKit native module is missing. Install the latest MicBoxx for Artists development build.";
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedLiveKitModule = require("@livekit/react-native") as LiveKitNativeModule;
    cachedLiveKitLoadError = null;
    return cachedLiveKitModule;
  } catch (error) {
    cachedLiveKitLoadError =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "LiveKit native module could not be loaded.";
    return null;
  }
}

function isMomentExpired(moment: RoomMomentState | null): boolean {
  return moment?.expiresAt != null && moment.expiresAt <= Math.floor(Date.now() / 1000);
}

function isTokenFresh(token: RoomLiveVideoTokenResponse | null, bufferSeconds = TOKEN_STALE_BUFFER_SECONDS): boolean {
  return token != null && token.expiresAt > Math.floor(Date.now() / 1000) + bufferSeconds;
}

function findLocalCameraTrackReference(
  liveKitModule: LiveKitNativeModule | null,
  tracks: unknown[],
): VideoTrackReference | undefined {
  const localCameraTracks = tracks.filter((trackRef): trackRef is VideoTrackReference => {
    if (!liveKitModule?.isTrackReference(trackRef)) {
      return false;
    }

    const candidate = trackRef as VideoTrackReference;
    return candidate.participant?.isLocal === true &&
      candidate.publication?.source === LIVEKIT_CAMERA_SOURCE;
  });

  return localCameraTracks.find((trackRef) => trackRef.publication?.track != null) ?? localCameraTracks[0];
}

function hasPermissionDeniedError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  const message = String(error).toLowerCase();
  return (
    message.includes("permission") ||
    message.includes("denied") ||
    message.includes("notallowed") ||
    message.includes("not allowed") ||
    message.includes("notauthorized") ||
    message.includes("not authorized") ||
    message.includes("restricted")
  );
}

function normalizeConnectionState(state: string): NormalizedConnectionState {
  const normalized = state.trim().toLowerCase();

  if (normalized.includes("connect") && normalized.includes("re")) {
    return "reconnecting";
  }

  if (normalized.includes("connect") && !normalized.includes("dis")) {
    return normalized === LIVEKIT_CONNECTED_STATE ? "connected" : "connecting";
  }

  return "disconnected";
}

export function ArtistBroadcastSurface({
  roomId,
  moment,
  enabled,
  onEnded,
}: {
  roomId: number | string;
  moment: RoomMomentState | null;
  enabled: boolean;
  onEnded?: () => void;
}) {
  const [liveKitModule] = useState(loadLiveKitNativeModule);
  const [tokenState, setTokenState] = useState<RoomLiveVideoTokenResponse | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runtimeState, setRuntimeState] = useState<BroadcastRuntimeState>({
    connectionState: "disconnected",
    cameraPermissionDenied: false,
    micPermissionDenied: false,
    hasPublishedCameraTrack: false,
    hasPublishedMicrophone: false,
  });
  const requestIdRef = useRef(0);
  const momentIdRef = useRef<string | null>(null);
  const expired = isMomentExpired(moment);
  const shouldConnect = enabled && !expired && Boolean(tokenState?.token && tokenState.url);
  const nativeUnavailableMessage = liveKitModule ? null : cachedLiveKitLoadError;

  const fetchHostToken = useCallback(async () => {
    if (!enabled || !moment || expired || !liveKitModule || isTokenFresh(tokenState, TOKEN_REFRESH_BUFFER_SECONDS)) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoadingToken(true);
    setErrorMessage(null);

    try {
      const nextToken = await getRoomLiveVideoHostToken({
        roomId,
        momentId: moment.momentId,
      });

      if (requestIdRef.current === requestId) {
        setTokenState(nextToken);
      }
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Unable to start broadcast.");
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoadingToken(false);
      }
    }
  }, [enabled, expired, liveKitModule, moment, roomId, tokenState]);

  useEffect(() => {
    void fetchHostToken();
  }, [fetchHostToken]);

  useEffect(() => {
    const nextMomentId = moment?.momentId ?? null;
    if (momentIdRef.current === nextMomentId) {
      return;
    }

    momentIdRef.current = nextMomentId;
    setTokenState(null);
    setErrorMessage(null);
    setRuntimeState({
      connectionState: "disconnected",
      cameraPermissionDenied: false,
      micPermissionDenied: false,
      hasPublishedCameraTrack: false,
      hasPublishedMicrophone: false,
    });
  }, [moment?.momentId]);

  useEffect(() => {
    if (!moment || moment.expiresAt == null) {
      return;
    }

    const delayMs = Math.max((moment.expiresAt - Math.floor(Date.now() / 1000)) * 1000, 0);
    const timer = setTimeout(() => {
      setTokenState(null);
      setErrorMessage("Live drop-in expired.");
      onEnded?.();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [moment, onEnded]);

  useEffect(() => {
    if (!enabled || !moment || expired || !liveKitModule) {
      return;
    }

    const interval = setInterval(() => {
      if (!isTokenFresh(tokenState, TOKEN_REFRESH_BUFFER_SECONDS)) {
        void fetchHostToken();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [enabled, expired, fetchHostToken, liveKitModule, moment, tokenState]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void fetchHostToken();
    });

    return () => subscription.remove();
  }, [fetchHostToken]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  const endDropIn = useCallback(async () => {
    setIsEnding(true);
    setErrorMessage(null);
    try {
      await endActiveRoomMoment(roomId);
      setTokenState(null);
      onEnded?.();
    } catch (error) {
      if (
        error instanceof CreatorApiError &&
        (error.status === 404 || error.status === 409 || error.status === 410)
      ) {
        setTokenState(null);
        onEnded?.();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Unable to end live drop-in.");
    } finally {
      setIsEnding(false);
    }
  }, [onEnded, roomId]);

  const statusText = useMemo(() => {
    const normalizedConnectionState = normalizeConnectionState(runtimeState.connectionState);

    if (nativeUnavailableMessage) return nativeUnavailableMessage;
    if (!enabled) return "Start a live video drop-in to broadcast.";
    if (!moment) return "Waiting for an active live video drop-in.";
    if (expired) return "Live drop-in has ended.";
    if (errorMessage) return errorMessage;
    if (isLoadingToken || !tokenState) return "Connecting to live broadcast...";
    if (runtimeState.cameraPermissionDenied) return "Camera permission denied. Enable camera access in device settings.";
    if (runtimeState.micPermissionDenied) return "Microphone permission denied. Enable microphone access in device settings.";
    if (normalizedConnectionState === "reconnecting" || normalizedConnectionState === "disconnected") {
      return "Disconnected. Reconnecting...";
    }
    if (normalizedConnectionState !== "connected") return "Connecting to live broadcast...";
    if (!runtimeState.hasPublishedCameraTrack && !runtimeState.hasPublishedMicrophone) {
      return "Connected, but no tracks published.";
    }
    if (cameraEnabled && !runtimeState.hasPublishedCameraTrack) return "Publishing camera...";
    return "Connected and broadcasting live.";
  }, [
    cameraEnabled,
    enabled,
    errorMessage,
    expired,
    isLoadingToken,
    moment,
    nativeUnavailableMessage,
    runtimeState.cameraPermissionDenied,
    runtimeState.connectionState,
    runtimeState.hasPublishedCameraTrack,
    runtimeState.hasPublishedMicrophone,
    runtimeState.micPermissionDenied,
    tokenState,
  ]);

  if (!enabled) {
    return null;
  }

  if (!liveKitModule) {
    return (
      <View style={styles.shell}>
        <Text style={styles.title}>Artist Broadcast</Text>
        <Text style={styles.status}>{statusText}</Text>
      </View>
    );
  }

  const LiveKitRoomComponent = liveKitModule.LiveKitRoom;

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Artist Broadcast</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
        {isLoadingToken ? <ActivityIndicator color={tokens.colors.accent} /> : null}
      </View>

      <View style={styles.previewFrame}>
        <LiveKitRoomComponent
          serverUrl={tokenState?.url}
          token={tokenState?.token}
          connect={shouldConnect}
          audio={!isMuted}
          video={cameraEnabled}
          screen={false}
          options={{ adaptiveStream: { pixelDensity: "screen" } }}
          connectOptions={{ autoSubscribe: false }}
          onDisconnected={() => {
            if (shouldConnect) setErrorMessage(null);
          }}
          onError={(error: unknown) => {
            setErrorMessage(error instanceof Error && error.message ? error.message : "Broadcast connection failed.");
          }}
        >
          <BroadcastPublisher
            cameraEnabled={cameraEnabled}
            liveKitModule={liveKitModule}
            micEnabled={!isMuted}
            onError={setErrorMessage}
            onRuntimeStateChange={setRuntimeState}
          />
        </LiveKitRoomComponent>
      </View>

      <View style={styles.controlRow}>
        <BroadcastControl
          icon={isMuted ? "mic-off-outline" : "mic-outline"}
          label={isMuted ? "Muted" : "Mic"}
          active={!isMuted}
          onPress={() => setIsMuted((value) => !value)}
        />
        <BroadcastControl
          icon={cameraEnabled ? "videocam-outline" : "videocam-off-outline"}
          label={cameraEnabled ? "Camera" : "Camera off"}
          active={cameraEnabled}
          onPress={() => setCameraEnabled((value) => !value)}
        />
        <BroadcastControl
          icon="stop-circle-outline"
          label={isEnding ? "Ending" : "End"}
          active={false}
          onPress={() => {
            if (!isEnding) {
              void endDropIn();
            }
          }}
        />
      </View>
    </View>
  );
}

function BroadcastPublisher({
  cameraEnabled,
  liveKitModule,
  micEnabled,
  onError,
  onRuntimeStateChange,
}: {
  cameraEnabled: boolean;
  liveKitModule: LiveKitNativeModule;
  micEnabled: boolean;
  onError: (message: string | null) => void;
  onRuntimeStateChange: (state: BroadcastRuntimeState) => void;
}) {
  const connectionState = liveKitModule.useConnectionState();
  const local = liveKitModule.useLocalParticipant();
  const tracks = liveKitModule.useTracks([LIVEKIT_CAMERA_SOURCE], {
    onlySubscribed: false,
  });
  const videoTrack = findLocalCameraTrackReference(liveKitModule, tracks);
  const connected = connectionState === LIVEKIT_CONNECTED_STATE;
  const [cameraSyncError, setCameraSyncError] = useState<unknown>(null);
  const [microphoneSyncError, setMicrophoneSyncError] = useState<unknown>(null);

  const hasPublishedCameraTrack =
    connected &&
    cameraEnabled &&
    liveKitModule.isTrackReference(videoTrack) &&
    Boolean((videoTrack as VideoTrackReference | undefined)?.publication?.track);
  const hasPublishedMicrophone = connected && micEnabled && local.isMicrophoneEnabled;
  const cameraPermissionDenied =
    hasPermissionDeniedError(local.lastCameraError) || hasPermissionDeniedError(cameraSyncError);
  const micPermissionDenied =
    hasPermissionDeniedError(local.lastMicrophoneError) || hasPermissionDeniedError(microphoneSyncError);

  useEffect(() => {
    onRuntimeStateChange({
      connectionState,
      cameraPermissionDenied,
      micPermissionDenied,
      hasPublishedCameraTrack,
      hasPublishedMicrophone,
    });
  }, [
    cameraPermissionDenied,
    connectionState,
    hasPublishedCameraTrack,
    hasPublishedMicrophone,
    micPermissionDenied,
    onRuntimeStateChange,
  ]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    let cancelled = false;
    async function syncCamera() {
      try {
        await local.localParticipant.setCameraEnabled(cameraEnabled);
        if (!cancelled) {
          setCameraSyncError(null);
        }
        if (!cancelled && local.lastCameraError) {
          setCameraSyncError(local.lastCameraError);
          if (!hasPermissionDeniedError(local.lastCameraError)) {
            onError(String(local.lastCameraError));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setCameraSyncError(error);
          if (!hasPermissionDeniedError(error)) {
            onError(error instanceof Error ? error.message : "Unable to publish camera.");
          }
        }
      }
    }

    void syncCamera();
    return () => {
      cancelled = true;
    };
  }, [cameraEnabled, connected, local.lastCameraError, local.localParticipant, onError]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    let cancelled = false;
    async function syncMicrophone() {
      try {
        await local.localParticipant.setMicrophoneEnabled(micEnabled);
        if (!cancelled) {
          setMicrophoneSyncError(null);
        }
        if (!cancelled && local.lastMicrophoneError) {
          setMicrophoneSyncError(local.lastMicrophoneError);
          if (!hasPermissionDeniedError(local.lastMicrophoneError)) {
            onError(String(local.lastMicrophoneError));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMicrophoneSyncError(error);
          if (!hasPermissionDeniedError(error)) {
            onError(error instanceof Error ? error.message : "Unable to publish microphone.");
          }
        }
      }
    }

    void syncMicrophone();
    return () => {
      cancelled = true;
    };
  }, [connected, local.lastMicrophoneError, local.localParticipant, micEnabled, onError]);

  return (
    <BroadcastPreview
      cameraEnabled={cameraEnabled}
      connectionState={connectionState}
      hasPublishedCameraTrack={hasPublishedCameraTrack}
      liveKitModule={liveKitModule}
      localCameraEnabled={local.isCameraEnabled}
      localMicEnabled={local.isMicrophoneEnabled}
      videoTrack={videoTrack}
    />
  );
}

function BroadcastPreview({
  cameraEnabled,
  connectionState,
  hasPublishedCameraTrack,
  liveKitModule,
  localCameraEnabled,
  localMicEnabled,
  videoTrack,
}: {
  cameraEnabled: boolean;
  connectionState: string;
  hasPublishedCameraTrack: boolean;
  liveKitModule: LiveKitNativeModule;
  localCameraEnabled: boolean;
  localMicEnabled: boolean;
  videoTrack: VideoTrackReference | undefined;
}) {
  const VideoTrackComponent = liveKitModule.VideoTrack;
  const normalizedConnectionState = normalizeConnectionState(connectionState);

  return (
    <View style={styles.preview}>
      {cameraEnabled && liveKitModule.isTrackReference(videoTrack) ? (
        <VideoTrackComponent
          trackRef={videoTrack}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
        />
      ) : (
        <View style={styles.previewFallback}>
          <Ionicons name="videocam-off-outline" size={34} color="rgba(245,247,250,0.7)" />
          <Text style={styles.previewFallbackText}>
            {normalizedConnectionState === "connected"
              ? cameraEnabled
                ? hasPublishedCameraTrack
                  ? "Camera live"
                  : "Publishing camera..."
                : "Camera is off"
              : "Connecting camera..."}
          </Text>
          <Text style={styles.previewFallbackMeta}>
            Camera {localCameraEnabled ? "on" : "off"} · Mic {localMicEnabled ? "on" : "off"}
          </Text>
        </View>
      )}
    </View>
  );
}

function BroadcastControl({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.control,
        active && styles.controlActive,
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? "#061014" : tokens.colors.textPrimary} />
      <Text style={[styles.controlLabel, active && styles.controlLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: "rgba(4,8,12,0.72)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: tokens.radiusSystem.section,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 12,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  status: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  previewFrame: {
    aspectRatio: 9 / 12,
    backgroundColor: "#05070a",
    borderRadius: tokens.radiusSystem.section,
    overflow: "hidden",
  },
  preview: {
    flex: 1,
    backgroundColor: "#05070a",
  },
  previewFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  previewFallbackText: {
    color: "rgba(245,247,250,0.72)",
    fontSize: 13,
    fontWeight: "700",
  },
  previewFallbackMeta: {
    color: "rgba(245,247,250,0.48)",
    fontSize: 11,
    fontWeight: "700",
  },
  controlRow: {
    flexDirection: "row",
    gap: 8,
  },
  control: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: tokens.radiusSystem.control,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8,
  },
  controlActive: {
    backgroundColor: tokens.colors.accent,
  },
  controlLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  controlLabelActive: {
    color: "#061014",
  },
});
