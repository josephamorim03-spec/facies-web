"use client";

import React from "react";
import { resolveOperationalAttachmentDisplayUrl } from "@/lib/api";
import { useToast } from "@/lib/useToast";

export function AttachmentLinks({ refs, token }: { refs: string[]; token: string }) {
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  const revokeByRef = React.useRef<Record<string, (() => void) | undefined>>({});
  const { showToast } = useToast();

  React.useEffect(() => {
    refs.forEach((ref) => {
      if (urls[ref]) return;
      resolveOperationalAttachmentDisplayUrl(token, ref)
        .then((resolved) => {
          setUrls((prev) => {
            const next = { ...prev, [ref]: resolved.url };
            return next;
          });
          const previousRevoke = revokeByRef.current[ref];
          if (previousRevoke) {
            previousRevoke();
          }
          revokeByRef.current[ref] = resolved.revoke;
        })
        .catch((err) => console.error("attachment_url_fetch_failed", ref, err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs.join(","), token]);

  React.useEffect(() => {
    return () => {
      const allRevoke = Object.values(revokeByRef.current);
      for (const revoke of allRevoke) {
        revoke?.();
      }
      revokeByRef.current = {};
    };
  }, []);

  const label = (ref: string) => {
    const parts = ref.split("/");
    return parts[parts.length - 1] || ref;
  };

  const openAttachment = async (url: string, filename: string) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (err) {
      console.error("attachment_open_failed", err);
      showToast("Não foi possível abrir o anexo.", "error");
    }
  };

  return (
    <p>
      Anexos:{" "}
      {refs.map((ref, i) => (
        <React.Fragment key={ref}>
          {i > 0 && " · "}
          {urls[ref] ? (
            <button
              type="button"
              onClick={() => openAttachment(urls[ref], label(ref))}
              className="underline hover:text-ink"
            >
              {label(ref)}
            </button>
          ) : (
            <span className="opacity-60">{label(ref)}</span>
          )}
        </React.Fragment>
      ))}
    </p>
  );
}
