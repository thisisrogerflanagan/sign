"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center font-sans antialiased bg-background text-foreground">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Our team has been notified, and we are looking into it.
          </p>
          <div className="pt-2">
            <Button onClick={() => reset()} variant="default">
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
