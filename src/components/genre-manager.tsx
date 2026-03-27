"use client";

import { useState, useTransition } from "react";
import { addGenre, removeGenre } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

export function GenreManager({
  orgId,
  initialGenres,
}: {
  orgId: string;
  initialGenres: Array<{ id: string; name: string }>;
}) {
  const [genres, setGenres] = useState(initialGenres);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;

    startTransition(async () => {
      const result = await addGenre(orgId, name);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setGenres((prev) => [...prev, { id: crypto.randomUUID(), name }]);
        setNewName("");
        toast.success(`Added "${name}"`);
      }
    });
  }

  function handleRemove(genreId: string, genreName: string) {
    startTransition(async () => {
      const result = await removeGenre(orgId, genreId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setGenres((prev) => prev.filter((g) => g.id !== genreId));
        toast.success(`Removed "${genreName}"`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-900">Genre Challenge List</h2>
      <p className="text-sm text-gray-500">
        Players earn a bonus for covering all genres. Customize the list for
        your competition.
      </p>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Badge
            key={genre.id}
            variant="secondary"
            className="text-sm py-1.5 px-3 gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 hover:bg-indigo-100"
          >
            {genre.name}
            <button
              onClick={() => handleRemove(genre.id, genre.name)}
              disabled={isPending}
              className="ml-1 rounded-full hover:bg-indigo-200/60 p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {genres.length === 0 && (
          <p className="text-sm text-gray-400">No genres added yet.</p>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New genre name..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
        />
        <Button onClick={handleAdd} disabled={isPending || !newName.trim()} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
