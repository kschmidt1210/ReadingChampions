"use client";

import EmojiPicker from "emoji-picker-react";
import type {
  EmojiClickData,
  EmojiStyle,
  SuggestionMode,
  Theme,
} from "emoji-picker-react";
import { useTheme } from "next-themes";

// emoji-picker-react v4 ships its enum types in .d.ts but does not actually
// re-export them from the CJS bundle, so importing `EmojiStyle.NATIVE` etc.
// resolves to `undefined` at runtime and breaks the Vercel build. The enums
// are simple string values, so we use the literal strings and type-assert.
const EMOJI_STYLE_NATIVE = "native" as EmojiStyle;
const THEME_DARK = "dark" as Theme;
const THEME_LIGHT = "light" as Theme;
const SUGGESTION_FREQUENT = "frequent" as SuggestionMode;

export function CommunityEmojiPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <EmojiPicker
      onEmojiClick={(data: EmojiClickData) => onPick(data.emoji)}
      emojiStyle={EMOJI_STYLE_NATIVE}
      theme={resolvedTheme === "dark" ? THEME_DARK : THEME_LIGHT}
      suggestedEmojisMode={SUGGESTION_FREQUENT}
      lazyLoadEmojis
      width={320}
      height={380}
      skinTonesDisabled={false}
      previewConfig={{ showPreview: false }}
      searchPlaceholder="Search emoji"
    />
  );
}

export default CommunityEmojiPicker;
