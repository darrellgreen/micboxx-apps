import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import type { DashboardTrack, DashboardUploadOptions, TrackMetadataUpdate } from "@/contracts/creator";
import { getTrackStatus, getUploadOptions, updateTrackMetadata } from "@/shared/api/creator-dashboard";
import { ErrorText, Field, TextField, formStyles } from "@/shared/ui/form";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen, useToast } from "@micboxx/ui";
import { View } from "react-native";

export default function EditTrackScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const { showToast } = useToast();
  const [track, setTrack] = useState<DashboardTrack | null>(null);
  const [options, setOptions] = useState<DashboardUploadOptions | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genreId, setGenreId] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [isSubscriberOnly, setIsSubscriberOnly] = useState(false);
  const [isPurchasable, setIsPurchasable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canEditCommerce = Boolean(track?.permissions.canEditCommerce);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!trackId) return;
      try {
        const [nextTrack, nextOptions] = await Promise.all([
          getTrackStatus(trackId),
          getUploadOptions(),
        ]);

        if (!active) return;
        setTrack(nextTrack);
        setOptions(nextOptions);
        setTitle(nextTrack.title);
        setDescription(nextTrack.description ?? "");
        setGenreId(nextTrack.genre?.id ? String(nextTrack.genre.id) : "");
        setAlbumId(nextTrack.album?.id ? String(nextTrack.album.id) : "");
        setPurchasePrice(nextTrack.commerce.price ?? "");
        setPurchaseCurrency(nextTrack.commerce.currency ?? "USD");
        setIsSubscriberOnly(nextTrack.commerce.isSubscriberOnly);
        setIsPurchasable(nextTrack.commerce.isPurchasable);
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "Unable to load edit form.");
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [trackId]);

  async function handleSave() {
    if (!trackId) return;
    setSaving(true);
    setError(null);
    try {
      const payload: TrackMetadataUpdate = {
        title: title.trim(),
        description: description.trim(),
        genreId: genreId ? Number(genreId) : null,
        albumId: albumId ? Number(albumId) : null,
      };

      if (canEditCommerce) {
        payload.isPurchasable = isPurchasable;
        payload.purchasePrice = isPurchasable ? purchasePrice.trim() : null;
        payload.purchaseCurrency = isPurchasable ? purchaseCurrency.trim().toUpperCase() : null;
        payload.isSubscriberOnly = isSubscriberOnly;
      }

      const nextTrack = await updateTrackMetadata(trackId, payload);
      setTrack(nextTrack);
      showToast({
        title: "Track changes saved",
        message: "Your track is up to date.",
        tone: "success",
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Track could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Edit Track" fallbackRoute="/(tabs)/catalog" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title={track?.title ?? "Track"} description="Update track metadata without leaving the creator app.">
        <Field label="Title">
          <TextField value={title} onChangeText={setTitle} />
        </Field>
        <Field label="Description">
          <TextField value={description} onChangeText={setDescription} multiline />
        </Field>
        <Field label="Genre">
          <View style={formStyles.chipRow}>
            {options?.genres.map((genre) => (
              <PillButton
                key={genre.id}
                label={genre.name}
                tone={genreId === String(genre.id) ? "accent" : "subtle"}
                onPress={() => setGenreId(String(genre.id))}
              />
            ))}
          </View>
        </Field>
        <Field label="Album">
          <View style={formStyles.chipRow}>
            {options?.albums.map((album) => (
              <PillButton
                key={album.id}
                label={album.title}
                tone={albumId === String(album.id) ? "accent" : "subtle"}
                onPress={() => setAlbumId(String(album.id))}
              />
            ))}
          </View>
        </Field>
        {canEditCommerce ? (
          <>
            <Field label="Monetization">
              <View style={formStyles.chipRow}>
                <PillButton label="Draft only" tone={!isPurchasable ? "accent" : "subtle"} onPress={() => setIsPurchasable(false)} />
                <PillButton label="Sellable" tone={isPurchasable ? "accent" : "subtle"} onPress={() => setIsPurchasable(true)} />
                <PillButton label="Subscriber only" tone={isSubscriberOnly ? "accent" : "subtle"} onPress={() => setIsSubscriberOnly((current) => !current)} />
              </View>
            </Field>
            {isPurchasable ? (
              <>
                <Field label="Price">
                  <TextField value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" />
                </Field>
                <Field label="Currency">
                  <TextField value={purchaseCurrency} onChangeText={setPurchaseCurrency} />
                </Field>
              </>
            ) : null}
          </>
        ) : null}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={saving ? "Saving…" : "Save track"} tone="accent" onPress={() => void handleSave()} />
      </Panel>
    </Screen>
  );
}
