"use client";

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { EDIT_PARAM } from "@/lib/edit-mode-shared";

/**
 * Whether copy on this page is editable in place.
 *
 * Two conditions, same as before: ?edit=1 on the URL, and a staff session with
 * write access. The difference is where they are checked. Previously the
 * server checked both on every request, which made every page dynamic.
 * Now the page ships static with plain copy, and this asks the server only
 * when the URL says to. Nothing editable ever renders for anyone else.
 *
 * The URL is read by a child inside its own Suspense boundary rather than by
 * the provider itself. useSearchParams makes the tree above it client-rendered
 * up to the nearest Suspense, and if the provider read it directly that would
 * be the entire page, leaving crawlers an empty shell.
 */
const EditingContext = createContext(false);

function EditParamWatcher({ onChange }: { onChange: (asked: boolean) => void }) {
  const params = useSearchParams();
  const asked = params.get(EDIT_PARAM) === "1";
  useEffect(() => {
    onChange(asked);
  }, [asked, onChange]);
  return null;
}

export function EditProvider({ children }: { children: ReactNode }) {
  const [asked, setAsked] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!asked) return;
    let off = false;
    fetch("/api/edit-context", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { editing: false }))
      .then((d: { editing: boolean }) => {
        if (!off) setVerified(!!d.editing);
      })
      .catch(() => {
        if (!off) setVerified(false);
      });
    return () => {
      off = true;
    };
  }, [asked]);

  return (
    <EditingContext.Provider value={asked && verified}>
      <Suspense fallback={null}>
        <EditParamWatcher onChange={setAsked} />
      </Suspense>
      {children}
    </EditingContext.Provider>
  );
}

export const useEditing = () => useContext(EditingContext);
