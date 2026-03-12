"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AddBookPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add a Book</SheetTitle>
        </SheetHeader>
        <div className="py-6 text-center text-muted-foreground">
          Book entry form coming soon...
        </div>
      </SheetContent>
    </Sheet>
  );
}
