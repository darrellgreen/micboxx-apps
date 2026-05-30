import { Redirect } from "expo-router";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreateEntryHref } from "@/features/bootstrap/routes";

export default function CreateIndexScreen() {
  const bootstrap = useCreatorBootstrap();
  return (
    <Redirect
      href={resolveCreateEntryHref({
        createEntryTarget: bootstrap.createEntryTarget,
        tracksSummary: bootstrap.tracksSummary,
        uploadOptions: bootstrap.uploadOptions,
      })}
    />
  );
}
