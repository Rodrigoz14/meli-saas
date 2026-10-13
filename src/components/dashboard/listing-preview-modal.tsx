"use client";

import { useState } from "react";
import { Eye, Monitor, Smartphone, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MeliListingPreview } from "@/components/dashboard/meli-listing-preview";
import { cn } from "@/lib/utils";

type Device = "desktop" | "mobile";

export function ListingPreviewModal({
  title,
  images,
  description,
  categoryName,
  disabled,
}: {
  title: string;
  images: string[];
  description: string;
  categoryName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" className="w-full" disabled={disabled} onClick={() => setOpen(true)}>
        <Eye className="mr-2 h-4 w-4" />
        Ver vista previa
      </Button>

      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100vh-48px)] w-[min(1060px,100vw-48px)] max-w-none flex-col gap-0 overflow-hidden rounded-[26px] bg-card p-0 sm:max-w-none"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <p className="font-display text-base font-bold">Vista previa de la publicación</p>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-[13px] border border-border bg-muted p-1">
              {(
                [
                  { key: "desktop" as const, label: "Escritorio", icon: Monitor },
                  { key: "mobile" as const, label: "Móvil", icon: Smartphone },
                ]
              ).map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setDevice(option.key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-bold transition-colors",
                      device === option.key
                        ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-[0_6px_16px_-6px_var(--glow)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar vista previa"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:rotate-90 hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/40 p-4">
          <div
            className="mx-auto transition-[max-width] duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ maxWidth: device === "mobile" ? 420 : "100%" }}
          >
            <MeliListingPreview
              title={title}
              images={images}
              description={description}
              categoryName={categoryName}
              device={device}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
