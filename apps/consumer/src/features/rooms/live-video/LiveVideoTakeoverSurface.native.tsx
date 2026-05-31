import { LinearGradient } from "expo-linear-gradient";
import { ConnectionState, Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    type AppStateStatus,
    NativeModules,
    StyleSheet,
    Text,
    View,
} from "react-native";

import type { RoomLiveVideoTokenResponse } from "@micboxx/contracts";
import { getRoomLiveVideoAudienceToken } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

import type { LiveVideoTakeoverSurfaceProps } from "./types";

type LiveKitNativeModule = {
  isTrackReference: (trackRef: unknown) => boolean;
  LiveKitRoom: React.ComponentType<Record<string, unknown>>;
  useConnectionState: () => ConnectionState;
  useTracks: (
    sources: Track.Source[],
    options: { onlySubscribed: boolean },
  ) => unknown[];
  VideoTrack: React.ComponentType<Record<string, unknown>>;
};

type RemoteVideoTrackReference = {
  participant?: {
    isLocal?: boolean;
  };
  publication?: {
    kind?: string;
    source?: Track.Source;
    track?: unknown;
  };
};

type RemoteTrackReference = {
  participant?: {
    isLocal?: boolean;
  };
  publication?: {
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
    cachedLiveKitLoadError = "LiveKit native module is missing. Install the latest MicBoxx development build.";
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

function isMomentExpired(expiresAt: number | null): boolean {
  return expiresAt != null && expiresAt <= Math.floor(Date.now() / 1000);
}

function isTokenFresh(token: RoomLiveVideoTokenResponse | null): boolean {
  return token != null && token.expiresAt > Math.floor(Date.now() / 1000) + 30;
}

function findRemoteVideoTrackReference(
  liveKitModule: LiveKitNativeModule | null,
  tracks: unknown[],
): RemoteVideoTrackReference | undefined {
  const remoteVideoTracks = tracks.filter((trackRef): trackRef is RemoteVideoTrackReference => {
    if (!liveKitModule?.isTrackReference(trackRef)) {
      return false;
    }

    const candidate = trackRef as RemoteVideoTrackReference;
    if (candidate.participant?.isLocal === true) {
      return false;
    }

    const source = candidate.publication?.source;
    return candidate.publication?.kind === Track.Kind.Video ||
      source === Track.Source.Camera ||
      source === Track.Source.ScreenShare;
  });

  return remoteVideoTracks.find((trackRef) => trackRef.publication?.track != null) ?? remoteVideoTracks[0];
}

function hasRemoteTrack(
  liveKitModule: LiveKitNativeModule | null,
  tracks: unknown[],
): boolean {
  return tracks.some((trackRef) => {
    if (!liveKitModule?.isTrackReference(trackRef)) {
      return false;
    }

    const candidate = trackRef as RemoteTrackReference;
    if (candidate.participant?.isLocal === true) {
      return false;
    }

    return candidate.publication?.track != null;
  });
}

export function LiveVideoTakeoverSurface({
  roomId,
  moment,
  artistName,
  accessToken,
  enabled,
  onStatusMessage,
}: LiveVideoTakeoverSurfaceProps) {
  const [liveKitModule] = useState(loadLiveKitNativeModule);
  const [tokenState, setTokenState] = useState<RoomLiveVideoTokenResponse | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestIdRef = useRef(0);
  const isActiveApp = appState === "active";
  const expired = isMomentExpired(moment.expiresAt);
  const shouldRequestToken = enabled && isActiveApp && !expired;
  const nativeUnavailableMessage = liveKitModule ? null : cachedLiveKitLoadError;

  const fetchAudienceToken = useCallback(async () => {
    if (!liveKitModule || !shouldRequestToken || isTokenFresh(tokenState)) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoadingToken(true);
    setErrorMessage(null);
    onStatusMessage?.("Connecting to live video...");

    try {
      const nextToken = await getRoomLiveVideoAudienceToken({
        roomId,
        momentId: moment.momentId,
        accessToken,
      });

      if (requestIdRef.current === requestId) {
        setTokenState(nextToken);
        onStatusMessage?.(null);
      }
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const message = error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unable to join live video.";
      setErrorMessage(message);
      onStatusMessage?.(message);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoadingToken(false);
      }
    }
  }, [accessToken, liveKitModule, moment.momentId, onStatusMessage, roomId, shouldRequestToken, tokenState]);

  useEffect(() => {
    if (nativeUnavailableMessage) {
      onStatusMessage?.(nativeUnavailableMessage);
    }
  }, [nativeUnavailableMessage, onStatusMessage]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void fetchAudienceToken();
  }, [fetchAudienceToken, refreshKey]);

  useEffect(() => {
    if (moment.expiresAt == null) {
      return;
    }

    const delayMs = Math.max((moment.expiresAt - Math.floor(Date.now() / 1000)) * 1000, 0);
    const timer = setTimeout(() => {
      setTokenState(null);
      onStatusMessage?.("Live video has ended.");
    }, delayMs);

    return () => clearTimeout(timer);
  }, [moment.expiresAt, onStatusMessage]);

  useEffect(() => {
    if (!tokenState) {
      return;
    }

    const delayMs = Math.max((tokenState.expiresAt - Math.floor(Date.now() / 1000) - 30) * 1000, 0);
    const timer = setTimeout(() => {
      setRefreshKey((key) => key + 1);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [tokenState]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      onStatusMessage?.(null);
    };
  }, [onStatusMessage]);

  const shouldConnect = shouldRequestToken && Boolean(tokenState?.token && tokenState.url);
  const statusText = useMemo(() => {
    if (nativeUnavailableMessage) return nativeUnavailableMessage;
    if (!enabled) return "Live video is unavailable.";
    if (expired) return "Live video has ended.";
    if (errorMessage) return errorMessage;
    if (!isActiveApp) return "Live video paused in background.";
    if (isLoadingToken || !tokenState) return `Joining ${artistName}'s live video...`;
    return null;
  }, [artistName, enabled, errorMessage, expired, isActiveApp, isLoadingToken, nativeUnavailableMessage, tokenState]);

  if (!liveKitModule) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LiveVideoStageFallback
          liveKitModule={null}
          statusText={statusText}
          artistName={artistName}
        />
      </View>
    );
  }

  const LiveKitRoomComponent = liveKitModule.LiveKitRoom;

  return (
    <View style={StyleSheet.absoluteFill}>
      <LiveKitRoomComponent
        serverUrl={tokenState?.url}
        token={tokenState?.token}
        connect={shouldConnect}
        audio={false}
        video={false}
        screen={false}
        options={{ adaptiveStream: { pixelDensity: "screen" } }}
        connectOptions={{ autoSubscribe: true }}
        onConnected={() => onStatusMessage?.(null)}
        onDisconnected={() => {
          if (shouldConnect) {
            onStatusMessage?.("Live video disconnected. Reconnecting...");
          }
        }}
        onError={(error: unknown) => {
          const message = error instanceof Error && error.message ? error.message : "Live video connection failed.";
          setErrorMessage(message);
          onStatusMessage?.(message);
        }}
      >
        <LiveVideoStageFallback
          liveKitModule={liveKitModule}
          statusText={statusText}
          artistName={artistName}
        />
      </LiveKitRoomComponent>
    </View>
  );
}

function LiveVideoStageFallback({
  liveKitModule,
  statusText,
  artistName,
}: {
  liveKitModule: LiveKitNativeModule | null;
  statusText: string | null;
  artistName: string;
}) {
  const connectionState = liveKitModule?.useConnectionState() ?? ConnectionState.Disconnected;
  const tracks = liveKitModule?.useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  }) ?? [];
  const videoTrack = findRemoteVideoTrackReference(liveKitModule, tracks);
  const hasAnyRemoteTrack = hasRemoteTrack(liveKitModule, tracks);
  const connected = connectionState === ConnectionState.Connected;
  const VideoTrackComponent = liveKitModule?.VideoTrack;
  const fallbackStatus = connected
    ? videoTrack
      ? "Connected"
      : hasAnyRemoteTrack
        ? "Artist camera unavailable."
        : `Waiting for ${artistName}...`
    : "Disconnected. Reconnecting...";
  const statusLabel = statusText ?? fallbackStatus;
  const showSpinner =
    statusLabel.includes("Joining") ||
    statusLabel.includes("Waiting") ||
    statusLabel.includes("Connecting") ||
    statusLabel.includes("Reconnecting");

  return (
    <View style={styles.stage}>
      {VideoTrackComponent && liveKitModule?.isTrackReference(videoTrack) ? (
        <VideoTrackComponent
          trackRef={videoTrack}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
          objectFit="cover"
        />
      ) : (
        <LinearGradient
          colors={["#06070a", "#0f151d", "#05070a"]}
          locations={[0, 0.56, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View pointerEvents="none" style={styles.statusPillWrap}>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{statusLabel}</Text>
        </View>
      </View>
      {!videoTrack ? (
        <View pointerEvents="none" style={styles.statusWrap}>
          {showSpinner ? (
            <ActivityIndicator color={tokens.colors.accent} />
          ) : null}
          <Text style={styles.statusText}>
            {statusLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#05070a",
  },
  statusWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  statusPillWrap: {
    position: "absolute",
    left: 14,
    top: 14,
    zIndex: 2,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    color: "rgba(244,245,247,0.92)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  statusText: {
    color: "rgba(244,245,247,0.78)",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
});
