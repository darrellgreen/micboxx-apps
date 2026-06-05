import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import type { DashboardAlbum, DashboardAlbumOptions } from "@/contracts/creator";
import { getAlbumOptions, getAlbumStatus, updateAlbumMetadata } from "@/shared/api/creator-dashboard";
import { ErrorText, Field, TextField, formStyles } from "@/shared/ui/form";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function EditAlbumScreen() {
  const { albumId } = useLocalSearchParams<{ albumId?: string }>();
  const [album, setAlbum] = useState<DashboardAlbum | null>(null);
  const [options, setOptions] = useState<DashboardAlbumOptions | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trackIds, setTrackIds] = useState<number[]>([]);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [isPurchasable, setIsPurchasable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!albumId) return;
      try {
        const [nextAlbum, nextOptions] = await Promise.all([
          getAlbumStatus(albumId),
          getAlbumOptions(),
        ]);
        if (!active) return;
        setAlbum(nextAlbum);
        setOptions(nextOptions);
        setTitle(nextAlbum.title);
        setDescription(nextAlbum.description ?? "");
        setTrackIds(nextAlbum.tracks.map((track) => track.trackId));
        setPurchasePrice(nextAlbum.commerce.price ?? "");
        setPurchaseCurrency(nextAlbum.commerce.currency ?? "USD");
        setIsPurchasable(nextAlbum.commerce.isPurchasable);
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "Unable to load album editor.");
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [albumId]);

  function toggleTrack(trackId: number) {
    setTrackIds((current) =>
      current.includes(trackId)
        ? current.filter((value) => value !== trackId)
        : [...current, trackId],
    );
  }

  async function handleSave() {
    if (!albumId) return;
    setSaving(true);
    setError(null);
    try {
      const nextAlbum = await updateAlbumMetadata(albumId, {
        title: title.trim(),
        description: description.trim(),
        trackIds,
        isPurchasable,
        purchasePrice: isPurchasable ? purchasePrice.trim() : null,
        purchaseCurrency: isPurchasable ? purchaseCurrency.trim().toUpperCase() : null,
      });
      setAlbum(nextAlbum);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Album could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Edit Album" fallbackRoute="/(tabs)/catalog" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title={album?.title ?? "Album"} description="Update the album without leaving the creator shell.">
        <Field label="Title">
          <TextField value={title} onChangeText={setTitle} />
        </Field>
        <Field label="Description">
          <TextField value={description} onChangeText={setDescription} multiline />
        </Field>
        <Field label="Track membership">
          <View style={formStyles.chipRow}>
            {options?.tracks.map((track) => (
              <PillButton
                key={track.id}
                label={track.title}
                tone={trackIds.includes(track.id) ? "accent" : "subtle"}
                onPress={() => toggleTrack(track.id)}
              />
            ))}
          </View>
        </Field>
        <Field label="Monetization">
          <View style={formStyles.chipRow}>
            <PillButton label="Draft only" tone={!isPurchasable ? "accent" : "subtle"} onPress={() => setIsPurchasable(false)} />
            <PillButton label="Sellable" tone={isPurchasable ? "accent" : "subtle"} onPress={() => setIsPurchasable(true)} />
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
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={saving ? "Saving…" : "Save album"} tone="accent" onPress={() => void handleSave()} />
      </Panel>
    </Screen>
  );
}
