CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_brand_trgm
  ON products USING gin (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_model_trgm
  ON products USING gin (model gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_types_name_trgm
  ON types USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_catalog_search_tsv
  ON products USING gin (
    (
      setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(brand, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(model, '')), 'B')
    )
  );
