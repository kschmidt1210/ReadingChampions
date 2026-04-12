"use client";

export default function OfflinePage() {
  return (
    <div data-app-shell className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl">📚</div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="mt-2 text-muted-foreground max-w-sm">
        Super Reader Championship needs an internet connection. Check your
        connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
      >
        Try again
      </button>
    </div>
  );
}
