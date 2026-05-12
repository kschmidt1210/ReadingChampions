"use client";

import EmojiPicker, {
  EmojiStyle,
  Theme,
  SuggestionMode,
  type EmojiClickData,
} from "emoji-picker-react";
import { useTheme } from "next-themes";

export function CommunityEmojiPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <EmojiPicker
      onEmojiClick={(data: EmojiClickData) => onPick(data.emoji)}
      emojiStyle={EmojiStyle.NATIVE}
      theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
      suggestedEmojisMode={SuggestionMode.FREQUENT}
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
