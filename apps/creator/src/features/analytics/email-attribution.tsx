import { useEffect } from "react";
import * as Linking from "expo-linking";
import { setEmailAttributionRef } from "@micboxx/analytics";

function extractEmailAttributionRef(url: string): string | null {
  try {
    return new URL(url).searchParams.get("eref");
  } catch {
    const query = url.split("?")[1]?.split("#")[0];
    return query ? new URLSearchParams(query).get("eref") : null;
  }
}

export function EmailAttributionCapture(): null {
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) {
      return;
    }

    setEmailAttributionRef(extractEmailAttributionRef(url));
  }, [url]);

  return null;
}
