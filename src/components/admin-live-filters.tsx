"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  isExactProductCodeQuery,
  normalizeSearchInput,
  normalizeTypeId,
  SEARCH_QUERY_MIN_LENGTH
} from "@/lib/search-utils";

type TypeOption = {
  id: number;
  name: string;
};

type AdminLiveFiltersProps =
  | {
      mode: "products";
      initialSearch: string;
      initialTypeId: number | null;
      types: TypeOption[];
    }
  | {
      mode: "types";
      initialSearch: string;
      initialTypeId?: never;
      types?: never;
    };

function buildAdminFilterUrl(
  pathname: string,
  search: string,
  typeId?: number | null
) {
  const params = new URLSearchParams();
  const normalizedSearch = normalizeSearchInput(search);
  const normalizedTypeId = normalizeTypeId(typeId);

  if (normalizedSearch) {
    params.set("q", normalizedSearch);
  }

  if (normalizedTypeId) {
    params.set("type", String(normalizedTypeId));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AdminLiveFilters(props: AdminLiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(props.initialSearch);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(
    props.mode === "products" ? props.initialTypeId : null
  );
  const lastUrlRef = useRef(
    buildAdminFilterUrl(
      pathname,
      props.initialSearch,
      props.mode === "products" ? props.initialTypeId : null
    )
  );

  useEffect(() => {
    setSearchInput(props.initialSearch);
    if (props.mode === "products") {
      setSelectedTypeId(props.initialTypeId);
    }
    lastUrlRef.current = buildAdminFilterUrl(
      pathname,
      props.initialSearch,
      props.mode === "products" ? props.initialTypeId : null
    );
  }, [
    pathname,
    props.initialSearch,
    props.mode,
    props.mode === "products" ? props.initialTypeId : null
  ]);

  const searchTooShort = useMemo(() => {
    const normalized = normalizeSearchInput(searchInput);

    return (
      normalized.length > 0 &&
      normalized.length < SEARCH_QUERY_MIN_LENGTH &&
      !isExactProductCodeQuery(normalized)
    );
  }, [searchInput]);

  const navigate = useCallback((search: string, typeId: number | null, force = false) => {
    const nextUrl = buildAdminFilterUrl(pathname, search, typeId);
    if (!force && nextUrl === lastUrlRef.current) {
      return;
    }

    lastUrlRef.current = nextUrl;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [pathname, router]);

  useEffect(() => {
    const normalizedSearch = normalizeSearchInput(searchInput);

    if (searchTooShort) {
      return undefined;
    }

    const handle = window.setTimeout(() => {
      navigate(normalizedSearch, props.mode === "products" ? selectedTypeId : null);
    }, 180);

    return () => {
      window.clearTimeout(handle);
    };
  }, [navigate, props.mode, searchInput, searchTooShort, selectedTypeId]);

  return (
    <>
      <form
        method="get"
        action={pathname}
        className={`filter-grid${props.mode === "types" ? " filter-grid-two" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          navigate(searchInput, props.mode === "products" ? selectedTypeId : null, true);
        }}
      >
        <label>
          {props.mode === "products" ? "Cari nama, merek, model, atau kode" : "Cari type"}
          <input
            type="search"
            name="q"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
            placeholder={props.mode === "products" ? "Contoh: LCD-0305-79" : "Cari type..."}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </label>

        {props.mode === "products" ? (
          <label>
            Filter type
            <select
              name="type"
              value={selectedTypeId ? String(selectedTypeId) : "0"}
              onChange={(event) => {
                setSelectedTypeId(normalizeTypeId(event.target.value));
              }}
            >
              <option value="0">Semua Type</option>
              {props.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="filter-actions">
          <button type="submit" className="btn btn-primary" aria-busy={isPending}>
            {isPending ? "Memperbarui..." : "Terapkan"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearchInput("");
              if (props.mode === "products") {
                setSelectedTypeId(null);
              }
              navigate("", null, true);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      <div className="admin-filter-live-note" aria-live="polite">
        {searchTooShort ? (
          <p>Ketik minimal 2 karakter untuk pencarian live, atau tekan Terapkan.</p>
        ) : isPending ? (
          <p>Memperbarui hasil...</p>
        ) : (
          <p>Pencarian live aktif.</p>
        )}
      </div>
    </>
  );
}
