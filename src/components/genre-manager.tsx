"use client";

import { useState, useTransition, useCallback } from "react";
import { addGenre, removeGenre, reorderGenres } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Genre {
  id: string;
  name: string;
}

export function GenreManager({
  orgId,
  initialGenres,
}: {
  orgId: string;
  initialGenres: Genre[];
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

  const moveGenre = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= genres.length) return;

      const updated = [...genres];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      setGenres(updated);

      startTransition(async () => {
        const result = await reorderGenres(
          orgId,
          updated.map((g) => g.id)
        );
        if (result?.error) {
          toast.error(typeof result.error === "string" ? result.error : "Failed to reorder");
          setGenres(genres);
        }
      });
    },
    [genres, orgId]
  );

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-900">Genre Challenge List</h2>
      <p className="text-sm text-gray-500">
        Players earn a bonus for covering all genres. Customize the list for
        your competition.
      </p>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {genres.map((genre, index) => (
          <div
            key={genre.id}
            className="flex items-center gap-2 px-3 py-2.5"
          >
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
            <span className="text-sm font-medium text-gray-700 flex-1">
              {genre.name}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => moveGenre(index, "up")}
                disabled={isPending || index === 0}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => moveGenre(index, "down")}
                disabled={isPending || index === genres.length - 1}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleRemove(genre.id, genre.name)}
                disabled={isPending}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {genres.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No genres added yet.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New genre name..."
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), handleAdd())
          }
        />
        <Button
          onClick={handleAdd}
          disabled={isPending || !newName.trim()}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
