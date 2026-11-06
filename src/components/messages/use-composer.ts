"use client";

import { useCallback, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { MAX_BYTES, MAX_FILES, MAX_PHOTOS, formatBytes } from "@/lib/services/message-service";

/** A photo or file waiting to go with the next message. */
export interface DraftFile {
  id: string;
  file: File;
  /** Local preview link, for photos. */
  url: string;
}
export interface Draft {
  text: string;
  photos: DraftFile[];
  files: DraftFile[];
}

let seq = 0;
const preview = (file: File) => (typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "");

/**
 * What's being written: text and up to 3 photos and 3 files, each 5 MB at
 * most, from the buttons, a paste or a drop. A broken rule says what to do.
 * Enter sends; Shift+Enter is a new line; Cmd/Ctrl+Enter sends too. The send
 * action is passed in when it happens (`submitWith`, `keyHandler`).
 */
export function useComposer() {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<DraftFile[]>([]);
  const [files, setFiles] = useState<DraftFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Adds what fits and says why the rest didn't. Returns how many photos were added. */
  const add = useCallback(
    (incoming: File[], as: "photo" | "file" | "auto"): number => {
      const problems: string[] = [];
      let p = photos;
      let f = files;
      let added = 0;
      for (const file of incoming) {
        const isPhoto = as === "photo" || (as === "auto" && file.type.startsWith("image/"));
        const name = file.name || "Pasted photo";
        if (as === "photo" && !file.type.startsWith("image/")) {
          problems.push(`${name} isn't a photo. Attach it as a file instead.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          problems.push(`${name} is ${formatBytes(file.size)}. ${isPhoto ? "Photos" : "Files"} can be up to 5 MB.`);
          continue;
        }
        if (isPhoto && p.length >= MAX_PHOTOS) {
          problems.push(`A message holds up to ${MAX_PHOTOS} photos. Send these, then add the rest.`);
          continue;
        }
        if (!isPhoto && f.length >= MAX_FILES) {
          problems.push(`A message holds up to ${MAX_FILES} files. Send these, then add the rest.`);
          continue;
        }
        const item = { id: `draft-${++seq}`, file, url: isPhoto ? preview(file) : "" };
        if (isPhoto) {
          p = [...p, item];
          added += 1;
        } else f = [...f, item];
      }
      setPhotos(p);
      setFiles(f);
      setError(problems.length ? [...new Set(problems)].join(" ") : null);
      return added;
    },
    [photos, files],
  );

  const canSend = text.trim().length > 0 || photos.length > 0 || files.length > 0;
  const reset = useCallback(() => {
    setText("");
    setPhotos([]);
    setFiles([]);
    setError(null);
  }, []);
  /** Puts a draft back after a send fails, with the reason. */
  const restore = useCallback((draft: Draft, reason: string) => {
    setText(draft.text);
    setPhotos(draft.photos);
    setFiles(draft.files);
    setError(reason);
  }, []);
  /** Hands the draft to `onSend`, if there's anything to send. */
  const submitWith = (onSend: (draft: Draft) => void) => {
    if (canSend) onSend({ text: text.trim(), photos, files });
  };
  /** For a TextField's onKeyDown: Enter sends, Shift+Enter is a new line. */
  const keyHandler = (onSend: (draft: Draft) => void) => (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    if (e.shiftKey && !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    submitWith(onSend);
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const pasted = Array.from(e.clipboardData?.files ?? []);
    if (!pasted.length) return;
    e.preventDefault();
    add(pasted, "auto");
  };

  return {
    text,
    setText,
    photos,
    files,
    error,
    setError,
    canSend,
    add,
    reset,
    restore,
    submitWith,
    keyHandler,
    onPaste,
    rows: Math.min(6, Math.max(1, text.split("\n").length)),
    removePhoto: (id: string) => setPhotos((all) => all.filter((x) => x.id !== id)),
    removeFile: (id: string) => setFiles((all) => all.filter((x) => x.id !== id)),
  };
}
export type Composer = ReturnType<typeof useComposer>;

/** Opens the system file dialog for the photo and file buttons. */
export function pickFiles(accept: string, onPick: (files: File[]) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = true;
  input.onchange = () => onPick(Array.from(input.files ?? []));
  input.click();
}
