"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Building2,
  FileSignature,
  Scale,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type SearchResultItem = {
  id: string;
  label: string;
  subtitle: string;
  href: "/litigation" | "/contracts" | "/prosecutions" | "/gafi";
};

type SearchResponse = {
  lawsuits: SearchResultItem[];
  contracts: SearchResultItem[];
  prosecutions: SearchResultItem[];
  gafi: SearchResultItem[];
};

const categoryIcons = {
  lawsuits: Scale,
  contracts: FileSignature,
  prosecutions: ShieldAlert,
  gafi: Building2,
} as const;

const emptyResults: SearchResponse = {
  lawsuits: [],
  contracts: [],
  prosecutions: [],
  gafi: [],
};

export function GlobalSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
      if (!response.ok) {
        setResults(emptyResults);
        return;
      }
      setResults((await response.json()) as SearchResponse);
    } catch {
      setResults(emptyResults);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigate = (href: SearchResultItem["href"]) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  };

  const hasResults =
    results &&
    (results.lawsuits.length > 0 ||
      results.contracts.length > 0 ||
      results.prosecutions.length > 0 ||
      results.gafi.length > 0);

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-9 w-56 justify-between gap-2 border-border bg-muted/60 text-muted-foreground hover:bg-card md:flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 text-sm">
          <Search className="h-4 w-4" />
          {t("placeholder")}
        </span>
        <kbd className="pointer-events-none hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-block">
          Ctrl+K
        </kbd>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 border-border md:hidden"
        onClick={() => setOpen(true)}
        aria-label={t("placeholder")}
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t("dialogPlaceholder")}
          value={query}
          onValueChange={runSearch}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? t("searching") : query.length < 2 ? t("typeToSearch") : t("noResults")}
          </CommandEmpty>

          {hasResults && results && (
            <>
              {results.lawsuits.length > 0 && (
                <CommandGroup heading={t("lawsuits")}>
                  {results.lawsuits.map((item) => {
                    const Icon = categoryIcons.lawsuits;
                    return (
                      <CommandItem
                        key={item.id}
                        value={`lawsuit-${item.id}-${item.label}`}
                        onSelect={() => navigate(item.href)}
                      >
                        <Icon className="text-muted-foreground" />
                        <div className="flex min-w-0 flex-col text-start">
                          <span className="truncate font-medium">{item.label}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {results.contracts.length > 0 && (
                <>
                  {results.lawsuits.length > 0 && <CommandSeparator />}
                  <CommandGroup heading={t("contracts")}>
                    {results.contracts.map((item) => {
                      const Icon = categoryIcons.contracts;
                      return (
                        <CommandItem
                          key={item.id}
                          value={`contract-${item.id}-${item.label}`}
                          onSelect={() => navigate(item.href)}
                        >
                          <Icon className="text-muted-foreground" />
                          <div className="flex min-w-0 flex-col text-start">
                            <span className="truncate font-medium">{item.label}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {results.prosecutions.length > 0 && (
                <>
                  {(results.lawsuits.length > 0 || results.contracts.length > 0) && (
                    <CommandSeparator />
                  )}
                  <CommandGroup heading={t("prosecutions")}>
                    {results.prosecutions.map((item) => {
                      const Icon = categoryIcons.prosecutions;
                      return (
                        <CommandItem
                          key={item.id}
                          value={`prosecution-${item.id}-${item.label}`}
                          onSelect={() => navigate(item.href)}
                        >
                          <Icon className="text-muted-foreground" />
                          <div className="flex min-w-0 flex-col text-start">
                            <span className="truncate font-medium">{item.label}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {results.gafi.length > 0 && (
                <>
                  {(results.lawsuits.length > 0 ||
                    results.contracts.length > 0 ||
                    results.prosecutions.length > 0) && <CommandSeparator />}
                  <CommandGroup heading={t("gafi")}>
                    {results.gafi.map((item) => {
                      const Icon = categoryIcons.gafi;
                      return (
                        <CommandItem
                          key={item.id}
                          value={`gafi-${item.id}-${item.label}`}
                          onSelect={() => navigate(item.href)}
                        >
                          <Icon className="text-muted-foreground" />
                          <div className="flex min-w-0 flex-col text-start">
                            <span className="truncate font-medium">{item.label}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
