"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ProductCardView } from "@/components/product-card-view";
import type { CatalogCardItem, CatalogCardTemplateConfig } from "@/lib/catalog-card";
import {
  buildSearchRequestKey,
  isExactProductCodeQuery,
  normalizeSearchInput,
  normalizeSearchPage,
  normalizeTypeId,
  SEARCH_QUERY_MIN_LENGTH
} from "@/lib/search-utils";

type CatalogTypeOption = {
  id: number;
  name: string;
};

type CatalogSearchPayload = {
  page: number;
  total: number;
  totalPages: number;
  strategy: "browse" | "exact" | "full-text" | "trigram";
  products: CatalogCardItem[];
};

type CatalogSearchProps = {
  initialSearch: string;
  initialTypeId: number | null;
  initialResults: CatalogSearchPayload;
  template: CatalogCardTemplateConfig;
  types: CatalogTypeOption[];
  siteName: string;
  whatsappUrl: string | null;
};

const DEFAULT_SKELETON_COUNT = 8;

function buildCatalogUrl(search: string, typeId: number | null, page: number) {
  const params = new URLSearchParams();
  const normalizedSearch = normalizeSearchInput(search);
  const normalizedTypeId = normalizeTypeId(typeId);
  const normalizedPage = normalizeSearchPage(page);

  if (normalizedSearch) {
    params.set("q", normalizedSearch);
  }

  if (normalizedTypeId) {
    params.set("type", String(normalizedTypeId));
  }

  if (normalizedPage > 1) {
    params.set("page", String(normalizedPage));
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function SearchCardSkeleton() {
  return (
    <article className="product-card product-card-skeleton" aria-hidden="true">
      <div className="product-card-media search-card-skeleton-media">
        <span className="search-card-skeleton-block search-card-skeleton-poster" />
        <span className="search-card-skeleton-block search-card-skeleton-title" />
      </div>
      <div className="card-body search-card-skeleton-body">
        <span className="search-card-skeleton-chip" />
        <span className="search-card-skeleton-line search-card-skeleton-line-long" />
        <span className="search-card-skeleton-line search-card-skeleton-line-short" />
        <div className="price-table-wrap">
          <div className="price-inline-card search-card-skeleton-price">
            <span className="search-card-skeleton-label" />
            <span className="search-card-skeleton-value" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CatalogSearch({
  initialSearch,
  initialTypeId,
  initialResults,
  template,
  types,
  siteName,
  whatsappUrl
}: CatalogSearchProps) {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(initialTypeId);
  const [results, setResults] = useState(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deferredSearchInput = useDeferredValue(searchInput);
  const abortRef = useRef<AbortController | null>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const activeKeyRef = useRef(buildSearchRequestKey(initialSearch, initialTypeId, initialResults.page));
  const cacheRef = useRef<Map<string, CatalogSearchPayload>>(
    new Map([[activeKeyRef.current, initialResults]])
  );

  const syncBrowserUrl = useCallback((search: string, typeId: number | null, page: number) => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = buildCatalogUrl(search, typeId, page);
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  const applyResolvedResults = useCallback(
    (search: string, typeId: number | null, payload: CatalogSearchPayload) => {
      startTransition(() => {
        setResults(payload);
        setErrorMessage(null);
      });
      activeKeyRef.current = buildSearchRequestKey(search, typeId, payload.page);
      syncBrowserUrl(search, typeId, payload.page);
    },
    [syncBrowserUrl]
  );

  const requestCatalog = useCallback(
    async (search: string, typeId: number | null, page: number, force = false) => {
      const normalizedSearch = normalizeSearchInput(search);
      const normalizedTypeId = normalizeTypeId(typeId);
      const normalizedPage = normalizeSearchPage(page);
      const requestKey = buildSearchRequestKey(normalizedSearch, normalizedTypeId, normalizedPage);

      if (!force && requestKey === activeKeyRef.current) {
        return;
      }

      if (pendingKeyRef.current === requestKey) {
        return;
      }

      const cached = cacheRef.current.get(requestKey);
      if (cached) {
        applyResolvedResults(normalizedSearch, normalizedTypeId, cached);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      pendingKeyRef.current = requestKey;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(normalizedSearch)}&type=${normalizedTypeId ?? ""}&page=${normalizedPage}`,
          {
            signal: controller.signal,
            headers: {
              accept: "application/json"
            }
          }
        );

        const payload = (await response.json()) as
          | {
              ok: true;
              data: CatalogSearchPayload;
            }
          | {
              ok: false;
              error?: string;
            };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "Pencarian gagal diproses." : payload.error || "Pencarian gagal diproses.");
        }

        cacheRef.current.set(requestKey, payload.data);
        applyResolvedResults(normalizedSearch, normalizedTypeId, payload.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Pencarian gagal diproses.");
      } finally {
        if (pendingKeyRef.current === requestKey) {
          pendingKeyRef.current = null;
        }

        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [applyResolvedResults]
  );

  useEffect(() => {
    const normalizedSearch = normalizeSearchInput(deferredSearchInput);
    const searchTooShort =
      normalizedSearch.length > 0 &&
      normalizedSearch.length < SEARCH_QUERY_MIN_LENGTH &&
      !isExactProductCodeQuery(normalizedSearch);

    if (searchTooShort) {
      setIsLoading(false);
      return () => undefined;
    }

    if (
      normalizedSearch !== initialSearch ||
      normalizeTypeId(selectedTypeId) !== normalizeTypeId(initialTypeId)
    ) {
      setIsLoading(true);
    }

    const handle = window.setTimeout(() => {
      void requestCatalog(normalizedSearch, selectedTypeId, 1);
    }, 160);

    return () => {
      window.clearTimeout(handle);
    };
  }, [deferredSearchInput, initialSearch, initialTypeId, requestCatalog, selectedTypeId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const normalizedSearch = normalizeSearchInput(searchInput);
  const searchTooShort =
    normalizedSearch.length > 0 &&
    normalizedSearch.length < SEARCH_QUERY_MIN_LENGTH &&
    !isExactProductCodeQuery(normalizedSearch);
  const hasActiveFilter = normalizedSearch.length > 0 || Boolean(selectedTypeId);
  const resultLabel = hasActiveFilter ? "hasil ditemukan" : "produk tersedia";
  const loadingCards = Math.min(
    DEFAULT_SKELETON_COUNT,
    Math.max(4, results.products.length || DEFAULT_SKELETON_COUNT)
  );

  return (
    <>
      <section className="hero-panel hero-panel-compact">
        <div className="hero-panel-top">
          <div className="hero-panel-content">
            <h1>{siteName}</h1>
            <p>Katalog sparepart premium, ringkas, cepat, dan siap kirim.</p>
            <div className="hero-badges" aria-live="polite">
              <span>
                {results.total.toLocaleString("id-ID")} {resultLabel}
              </span>
              <span>{types.length.toLocaleString("id-ID")} type</span>
              <span>{results.strategy === "trigram" ? "Pencarian typo-tolerant" : "Realtime search"}</span>
            </div>
          </div>
          <div className="hero-panel-actions">
            {whatsappUrl ? (
              <Link className="btn btn-primary" href="/kontak">
                Hubungi WhatsApp
              </Link>
            ) : null}
            <a className="btn btn-ghost" href="#katalogProduk">
              Lihat Katalog
            </a>
          </div>
        </div>
      </section>

      <section className="filter-panel filter-panel-compact catalog-search-shell">
        <form
          method="get"
          action="/"
          className="filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void requestCatalog(searchInput, selectedTypeId, 1, true);
          }}
        >
          <label>
            Search Nama / Merek / Model / Kode Produk
            <input
              type="search"
              name="q"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              placeholder="Contoh: LCD-0305-79"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
            />
          </label>
          <label>
            Filter Type
            <select
              name="type"
              value={selectedTypeId ? String(selectedTypeId) : "0"}
              onChange={(event) => {
                setSelectedTypeId(normalizeTypeId(event.target.value));
              }}
            >
              <option value="0">Semua Type</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button type="submit" className="btn btn-primary" aria-busy={isLoading}>
              {isLoading ? "Mencari..." : "Terapkan"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                abortRef.current?.abort();
                setSearchInput("");
                setSelectedTypeId(null);
                void requestCatalog("", null, 1, true);
              }}
            >
              Reset
            </button>
          </div>
        </form>
        <div className="catalog-search-meta" aria-live="polite">
          {searchTooShort ? (
            <p>Ketik minimal 2 karakter untuk pencarian otomatis, atau tekan Terapkan.</p>
          ) : errorMessage ? (
            <p className="catalog-search-error">{errorMessage}</p>
          ) : isLoading ? (
            <p>Mencari hasil yang paling relevan...</p>
          ) : (
            <p>
              {results.total.toLocaleString("id-ID")} {resultLabel}
            </p>
          )}
        </div>
      </section>

      <section id="katalogProduk" className="catalog-results-section">
        <div className="section-title">
          <h2>Daftar Harga Produk {siteName}</h2>
          <p aria-live="polite">{results.total} item ditemukan</p>
        </div>

        {isLoading ? (
          <div className="card-grid card-grid-search" aria-busy="true" aria-live="polite">
            {Array.from({ length: loadingCards }, (_, index) => (
              <SearchCardSkeleton key={`search-skeleton-${index + 1}`} />
            ))}
          </div>
        ) : results.products.length === 0 ? (
          <div className="empty-state catalog-empty-state">
            <strong>{hasActiveFilter ? "Hasil tidak ditemukan." : "Belum ada produk."}</strong>
            <span>
              {hasActiveFilter
                ? "Coba kata kunci lain, ubah type, atau gunakan kode produk yang lebih spesifik."
                : "Produk akan muncul di sini setelah ditambahkan dari panel admin."}
            </span>
          </div>
        ) : (
          <div className="card-grid card-grid-search">
            {results.products.map((item) => (
              <ProductCardView key={item.id} item={item} template={template} />
            ))}
          </div>
        )}

        {results.totalPages > 1 ? (
          <nav className="pagination" aria-label="Pagination produk">
            {Array.from({ length: results.totalPages }, (_, index) => {
              const targetPage = index + 1;

              if (targetPage === results.page) {
                return (
                  <span key={targetPage} className="active" aria-current="page">
                    {targetPage}
                  </span>
                );
              }

              return (
                <button
                  key={targetPage}
                  type="button"
                  className="pagination-button"
                  onClick={() => {
                    void requestCatalog(searchInput, selectedTypeId, targetPage, true);
                  }}
                  disabled={isLoading}
                >
                  {targetPage}
                </button>
              );
            })}
          </nav>
        ) : null}
      </section>
    </>
  );
}

