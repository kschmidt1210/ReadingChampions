"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  COMMUNITY_TAG_OPTIONS,
} from "./community-tag-filter";
import {
  createCommunityPost,
  createCommunityComment,
  uploadCommunityImage,
} from "@/lib/actions/community";
import { cn } from "@/lib/utils";
import type { CommunityTag } from "@/types/database";

const MAX_POST_IMAGES = 4;
const MAX_COMMENT_IMAGES = 2;
const POST_BODY_MAX = 4000;
const COMMENT_BODY_MAX = 2000;

type Mode =
  | { kind: "post"; orgId: string }
  | {
      kind: "comment";
      orgId: string;
      postId: string;
      parentCommentId?: string;
      onPosted?: () => void;
      autoFocus?: boolean;
      placeholder?: string;
    };

interface PendingImage {
  id: string;
  path: string;
  url: string;
  uploading: boolean;
}

export function CommunityComposer({
  mode,
  className,
}: {
  mode: Mode;
  className?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<CommunityTag | null>(null);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [isSubmitting, startSubmit] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const isPost = mode.kind === "post";
  const maxImages = isPost ? MAX_POST_IMAGES : MAX_COMMENT_IMAGES;
  const maxBody = isPost ? POST_BODY_MAX : COMMENT_BODY_MAX;
  const remaining = maxImages - images.length;
  const draftId = useRef<string>(crypto.randomUUID());
  const successfullyUploadedImages = images.filter((i) => !i.uploading);

  function reset() {
    setBody("");
    setTag(null);
    setImages([]);
    draftId.current = crypto.randomUUID();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) {
      toast.error(`You can attach up to ${maxImages} images`);
      return;
    }

    setIsUploading(true);
    for (const file of list) {
      const tempId = crypto.randomUUID();
      const tempUrl = URL.createObjectURL(file);
      setImages((prev) => [
        ...prev,
        { id: tempId, path: "", url: tempUrl, uploading: true },
      ]);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", mode.orgId);
      formData.append("targetType", isPost ? "post" : "comment");
      formData.append("targetId", draftId.current);
      try {
        const { path } = await uploadCommunityImage(formData);
        setImages((prev) =>
          prev.map((p) =>
            p.id === tempId ? { ...p, path, uploading: false } : p
          )
        );
      } catch (err) {
        setImages((prev) => prev.filter((p) => p.id !== tempId));
        toast.error(err instanceof Error ? err.message : "Image upload failed");
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed && successfullyUploadedImages.length === 0) {
      toast.error(isPost ? "Add some text or an image" : "Reply can't be empty");
      return;
    }
    if (trimmed.length > maxBody) {
      toast.error(`Too long (max ${maxBody} characters)`);
      return;
    }

    startSubmit(async () => {
      try {
        if (mode.kind === "post") {
          await createCommunityPost({
            orgId: mode.orgId,
            postId: draftId.current,
            body: trimmed,
            tag,
            imagePaths: successfullyUploadedImages.map((i) => i.path),
          });
          toast.success("Posted to community");
          reset();
          router.refresh();
        } else {
          await createCommunityComment({
            postId: mode.postId,
            commentId: draftId.current,
            body: trimmed,
            parentCommentId: mode.parentCommentId,
            imagePaths: successfullyUploadedImages.map((i) => i.path),
          });
          reset();
          mode.onPosted?.();
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-sm",
        className
      )}
    >
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus={!isPost && mode.autoFocus}
        placeholder={
          isPost
            ? "Share with the group — book recs, rule questions, trash talk…"
            : mode.placeholder ?? "Add a reply"
        }
        maxLength={maxBody + 200}
        className={cn(
          "border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0",
          isPost ? "min-h-20" : "min-h-12"
        )}
      />

      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className={cn(
                  "h-full w-full object-cover",
                  img.uploading && "opacity-60"
                )}
              />
              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label="Remove image"
                className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isPost && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={cn(
              "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors",
              tag === null
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            No tag
          </button>
          {COMMUNITY_TAG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTag(opt.value)}
              className={cn(
                "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors",
                tag === opt.value
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200"
                  : cn("border-border bg-card hover:bg-muted", opt.color)
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxImages > 1}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={remaining <= 0 || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {remaining > 0
                ? `Photo${remaining < maxImages ? ` (${remaining} left)` : ""}`
                : "Max"}
            </span>
          </Button>
          <span className="text-[0.7rem] tabular-nums text-muted-foreground">
            {body.length}/{maxBody}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={
            isSubmitting ||
            isUploading ||
            (!body.trim() && successfullyUploadedImages.length === 0)
          }
          onClick={handleSubmit}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:brightness-110"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isPost ? "Post" : "Reply"}
        </Button>
      </div>
    </div>
  );
}
