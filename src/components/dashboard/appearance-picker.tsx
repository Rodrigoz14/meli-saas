"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

const OPTIONS = [
  { value: "light" as const, label: "Claro" },
  { value: "dark" as const, label: "Oscuro" },
];

export function AppearancePicker() {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();

  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((option) => {
        const isActive = isClient && resolvedTheme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "overflow-hidden rounded-2xl border-2 text-left transition-colors",
              isActive ? "border-primary" : "border-border hover:border-primary/40",
            )}
          >
            <div
              className={cn(
                "flex h-16 items-stretch gap-1 p-2",
                option.value === "light" ? "bg-[#EEF0F6]" : "bg-[#07081A]",
              )}
            >
              <div
                className={cn("w-4 rounded-md", option.value === "light" ? "bg-white" : "bg-[#11142F]")}
              />
              <div className="flex flex-1 flex-col gap-1">
                <div
                  className={cn(
                    "h-3 w-2/3 rounded-sm bg-gradient-to-r",
                    option.value === "light" ? "from-[#2140ED] to-[#4363FF]" : "from-[#5470F7] to-[#7C8CFF]",
                  )}
                />
                <div className={cn("h-full rounded-sm", option.value === "light" ? "bg-white" : "bg-[#11142F]")} />
              </div>
            </div>
            <p className="px-3 py-2 text-sm font-medium">{option.label}</p>
          </button>
        );
      })}
    </div>
  );
}
