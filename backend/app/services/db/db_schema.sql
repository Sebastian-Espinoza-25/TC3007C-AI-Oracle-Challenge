-- =====================================================================
-- E-COMMERCE SCHEMA (Oracle 26ai)
-- =====================================================================
-- =========================
-- 1) APP_USER
-- =========================
CREATE TABLE app_user (
  user_id        NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email          VARCHAR2(255)    NOT NULL,
  password_hash  VARCHAR2(255)    NOT NULL,
  role           VARCHAR2(50)     DEFAULT 'user' NOT NULL,
  age            NUMBER(3),
  name           VARCHAR2(150),
  notifications  CHAR(1)          DEFAULT 'N' NOT NULL,
  postal_code    VARCHAR2(10),
  first_time     CHAR(1)          DEFAULT 'Y' NOT NULL,
  address        VARCHAR2(300),
  CONSTRAINT uq_app_user_email UNIQUE (email),
  CONSTRAINT ck_app_user_notifications CHECK (notifications IN ('Y','N')),
  CONSTRAINT ck_app_user_first_time   CHECK (first_time IN ('Y','N'))
);

-- =========================
-- 2) CATALOG
-- =========================
CREATE TABLE catalog (
  db_article_id                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- PK interna
  external_article_id             VARCHAR2(30) NOT NULL,  -- Ej: 110065001 (único por SKU)
  product_code                    VARCHAR2(100) NOT NULL, -- Ej: 110065 (puede repetirse)
  prod_name                       VARCHAR2(255) NOT NULL,
  product_type_no                 NUMBER,
  product_type_name               VARCHAR2(150),
  product_group_name              VARCHAR2(150),
  graphical_appearance_no         NUMBER,
  graphical_appearance_name       VARCHAR2(150),
  colour_group_code               VARCHAR2(20),
  colour_group_name               VARCHAR2(100),
  perceived_colour_value_id       NUMBER,
  perceived_colour_value_name     VARCHAR2(100),
  perceived_colour_master_id      NUMBER,
  perceived_colour_master_name    VARCHAR2(100),
  department_no                   NUMBER,
  department_name                 VARCHAR2(150),
  index_code                      VARCHAR2(50),
  index_name                      VARCHAR2(150),
  index_group_no                  NUMBER,
  index_group_name                VARCHAR2(150),
  section_no                      NUMBER,
  section_name                    VARCHAR2(150),
  garment_group_no                NUMBER,
  garment_group_name              VARCHAR2(150),
  detail_desc                     CLOB,
  price                           NUMBER(12,2) DEFAULT 0 NOT NULL,
  stock                           NUMBER(10)   DEFAULT 0 NOT NULL,
  CONSTRAINT uq_catalog_external_article UNIQUE (external_article_id),
  CONSTRAINT ck_catalog_price_nonneg CHECK (price >= 0),
  CONSTRAINT ck_catalog_stock_nonneg CHECK (stock  >= 0)
);

CREATE INDEX ix_catalog_prod_name ON catalog (prod_name);
CREATE INDEX ix_catalog_product_code ON catalog (product_code);

-- =========================
-- 3) CARTS
-- =========================
CREATE TABLE carts (
  cart_id       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       NUMBER NOT NULL,
  status        VARCHAR2(20) DEFAULT 'OPEN' NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  total_price   NUMBER(12,2) DEFAULT 0 NOT NULL,
  CONSTRAINT fk_carts_user
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
    ON DELETE CASCADE,
  CONSTRAINT ck_carts_status
    CHECK (status IN ('OPEN','CLOSED','ABANDONED')),
  CONSTRAINT ck_carts_total_nonneg CHECK (total_price >= 0)
);

CREATE INDEX ix_carts_user ON carts (user_id);
CREATE INDEX ix_carts_status ON carts (status);

-- =========================
-- 4) CART_ITEMS (usa external_article_id)
-- =========================
CREATE TABLE cart_items (
  cart_item_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cart_id       NUMBER NOT NULL,
  article_id    VARCHAR2(30) NOT NULL,  -- external_article_id
  quantity      NUMBER(10) DEFAULT 1 NOT NULL,
  price         NUMBER(12,2) NOT NULL,
  CONSTRAINT fk_cart_items_cart
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_article
    FOREIGN KEY (article_id) REFERENCES catalog(external_article_id),
  CONSTRAINT ck_cart_items_qty_pos CHECK (quantity > 0),
  CONSTRAINT ck_cart_items_price_nonneg CHECK (price >= 0),
  CONSTRAINT uq_cart_items_cart_article UNIQUE (cart_id, article_id)
);

CREATE INDEX ix_cart_items_cart    ON cart_items (cart_id);
CREATE INDEX ix_cart_items_article ON cart_items (article_id);

-- =========================
-- 5) ORDERS
-- =========================
CREATE TABLE orders (
  order_id      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       NUMBER NOT NULL,
  order_address VARCHAR2(300) NOT NULL,
  payment_date  TIMESTAMP WITH TIME ZONE,
  total_price   NUMBER(12,2) DEFAULT 0 NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES app_user(user_id),
  CONSTRAINT ck_orders_total_nonneg CHECK (total_price >= 0)
);

CREATE INDEX ix_orders_user ON orders (user_id);
CREATE INDEX ix_orders_paym ON orders (payment_date);

-- =========================
-- 6) ORDER_ITEMS (usa external_article_id)
-- =========================
CREATE TABLE order_items (
  order_item_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id      NUMBER NOT NULL,
  article_id    VARCHAR2(30) NOT NULL,  -- external_article_id
  quantity      NUMBER(10) DEFAULT 1 NOT NULL,
  price         NUMBER(12,2) NOT NULL,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_article
    FOREIGN KEY (article_id) REFERENCES catalog(external_article_id),
  CONSTRAINT ck_order_items_qty_pos CHECK (quantity > 0),
  CONSTRAINT ck_order_items_price_nonneg CHECK (price >= 0)
);

CREATE INDEX ix_order_items_order   ON order_items (order_id);
CREATE INDEX ix_order_items_article ON order_items (article_id);
