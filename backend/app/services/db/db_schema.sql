-- =====================================================================
-- E-COMMERCE SCHEMA (Oracle 26ai) 
-- =====================================================================
-- 0) CLEANUP (DROP IF EXISTS)
-- =====================================================================

BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER trg_payments_upd_ts'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER trg_product_ratings_upd_ts'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/

BEGIN EXECUTE IMMEDIATE 'DROP TABLE product_ratings CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE payments CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE invoices CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE payment_methods CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE order_items CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE orders CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE cart_items CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE carts CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE catalog CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE app_user CASCADE CONSTRAINTS'; 
EXCEPTION WHEN OTHERS THEN NULL; 
END;
/

-- =====================================================================
-- 1) APP_USER
-- =====================================================================
CREATE TABLE app_user (
  user_id        NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email          VARCHAR2(255 CHAR)    NOT NULL,
  password_hash  VARCHAR2(255 CHAR)    NOT NULL,
  role           VARCHAR2(50  CHAR)    DEFAULT 'user' NOT NULL,
  age            NUMBER(3),
  name           VARCHAR2(150 CHAR),
  notifications  CHAR(1)               DEFAULT 'N' NOT NULL,
  postal_code    VARCHAR2(10  CHAR),
  first_time     CHAR(1)               DEFAULT 'Y' NOT NULL,
  address        VARCHAR2(300 CHAR),
  CONSTRAINT uq_app_user_email UNIQUE (email),
  CONSTRAINT ck_app_user_notifications CHECK (notifications IN ('Y','N')),
  CONSTRAINT ck_app_user_first_time   CHECK (first_time    IN ('Y','N'))
);

-- =====================================================================
-- 2) CATALOG
-- =====================================================================
CREATE TABLE catalog (
  db_article_id                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- PK interna
  external_article_id             VARCHAR2(30  CHAR) NOT NULL,  -- Único por SKU
  product_code                    VARCHAR2(100 CHAR) NOT NULL,
  prod_name                       VARCHAR2(255 CHAR) NOT NULL,
  product_type_no                 NUMBER,
  product_type_name               VARCHAR2(150 CHAR),
  product_group_name              VARCHAR2(150 CHAR),
  graphical_appearance_no         NUMBER,
  graphical_appearance_name       VARCHAR2(150 CHAR),
  colour_group_code               VARCHAR2(20  CHAR),
  colour_group_name               VARCHAR2(100 CHAR),
  perceived_colour_value_id       NUMBER,
  perceived_colour_value_name     VARCHAR2(100 CHAR),
  perceived_colour_master_id      NUMBER,
  perceived_colour_master_name    VARCHAR2(100 CHAR),
  department_no                   NUMBER,
  department_name                 VARCHAR2(150 CHAR),
  index_code                      VARCHAR2(50  CHAR),
  index_name                      VARCHAR2(150 CHAR),
  index_group_no                  NUMBER,
  index_group_name                VARCHAR2(150 CHAR),
  section_no                      NUMBER,
  section_name                    VARCHAR2(150 CHAR),
  garment_group_no                NUMBER,
  garment_group_name              VARCHAR2(150 CHAR),
  detail_desc                     CLOB,
  price                           NUMBER(12,2) DEFAULT 0 NOT NULL,
  stock                           NUMBER(10)   DEFAULT 0 NOT NULL,
  CONSTRAINT uq_catalog_external_article UNIQUE (external_article_id),
  CONSTRAINT ck_catalog_price_nonneg CHECK (price >= 0),
  CONSTRAINT ck_catalog_stock_nonneg CHECK (stock  >= 0)
);

CREATE INDEX ix_catalog_prod_name    ON catalog (prod_name);
CREATE INDEX ix_catalog_product_code ON catalog (product_code);

-- =====================================================================
-- 2.5) PRODUCT_RATINGS
-- =====================================================================
CREATE TABLE product_ratings (
  rating_id    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      NUMBER            NOT NULL,          -- FK a app_user
  article_id   VARCHAR2(30 CHAR) NOT NULL,          -- external_article_id (catalog)
  rating       NUMBER(1)         NOT NULL,          -- 1..5
  review_text  CLOB,
  created_at   TIMESTAMP WITH TIME ZONE
               DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at   TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_pr_user
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_pr_article
    FOREIGN KEY (article_id) REFERENCES catalog(external_article_id)
    ON DELETE CASCADE,

  CONSTRAINT ck_pr_rating
    CHECK (rating BETWEEN 1 AND 5),

  -- Un rating por usuario y artículo
  CONSTRAINT uq_pr_user_article
    UNIQUE (user_id, article_id)
);

-- Índices útiles
CREATE INDEX ix_pr_article ON product_ratings (article_id);
CREATE INDEX ix_pr_user    ON product_ratings (user_id);
CREATE INDEX ix_pr_rating  ON product_ratings (rating);

-- =====================================================================
-- 3) CARTS
-- =====================================================================
CREATE TABLE carts (
  cart_id       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       NUMBER NOT NULL,
  status        VARCHAR2(20  CHAR) DEFAULT 'OPEN' NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  total_price   NUMBER(12,2) DEFAULT 0 NOT NULL,
  CONSTRAINT fk_carts_user
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
    ON DELETE CASCADE,
  CONSTRAINT ck_carts_status
    CHECK (status IN ('OPEN','CLOSED','ABANDONED')),
  CONSTRAINT ck_carts_total_nonneg CHECK (total_price >= 0)
);

CREATE INDEX ix_carts_user   ON carts (user_id);
CREATE INDEX ix_carts_status ON carts (status);

-- =====================================================================
-- 4) ORDERS
-- =====================================================================
CREATE TABLE orders (
  order_id      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       NUMBER NOT NULL,
  order_address VARCHAR2(300 CHAR) NOT NULL,
  payment_date  TIMESTAMP WITH TIME ZONE,
  total_price   NUMBER(12,2) DEFAULT 0 NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES app_user(user_id),
  CONSTRAINT ck_orders_total_nonneg CHECK (total_price >= 0)
);

CREATE INDEX ix_orders_user ON orders (user_id);
CREATE INDEX ix_orders_paym ON orders (payment_date);

-- =====================================================================
-- 5) ORDER_ITEMS (external_article_id)
-- =====================================================================
CREATE TABLE order_items (
  order_item_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id      NUMBER NOT NULL,
  article_id    VARCHAR2(30  CHAR) NOT NULL,  -- external_article_id
  quantity      NUMBER(10) DEFAULT 1 NOT NULL,
  price         NUMBER(12,2) NOT NULL,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_article
    FOREIGN KEY (article_id) REFERENCES catalog(external_article_id),
  CONSTRAINT ck_order_items_qty_pos      CHECK (quantity > 0),
  CONSTRAINT ck_order_items_price_nonneg CHECK (price >= 0)
);

CREATE INDEX ix_order_items_order   ON order_items (order_id);
CREATE INDEX ix_order_items_article ON order_items (article_id);

-- =====================================================================
-- 6) CART_ITEMS (usa external_article_id)
-- =====================================================================
CREATE TABLE cart_items (
  cart_item_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cart_id       NUMBER NOT NULL,
  article_id    VARCHAR2(30  CHAR) NOT NULL,  -- external_article_id
  quantity      NUMBER(10) DEFAULT 1 NOT NULL,
  price         NUMBER(12,2) NOT NULL,
  CONSTRAINT fk_cart_items_cart
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_article
    FOREIGN KEY (article_id) REFERENCES catalog(external_article_id),
  CONSTRAINT ck_cart_items_qty_pos      CHECK (quantity > 0),
  CONSTRAINT ck_cart_items_price_nonneg CHECK (price >= 0),
  CONSTRAINT uq_cart_items_cart_article UNIQUE (cart_id, article_id)
);

CREATE INDEX ix_cart_items_cart    ON cart_items (cart_id);
CREATE INDEX ix_cart_items_article ON cart_items (article_id);

-- =====================================================================
-- 7) PAYMENT_METHODS
-- =====================================================================
CREATE TABLE payment_methods (
  payment_method_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             NUMBER NOT NULL,                           -- FK a app_user
  stripe_customer_id  VARCHAR2(100 CHAR),                        -- ID cliente Stripe
  payment_method_ref  VARCHAR2(100 CHAR) UNIQUE,                 -- pm_xxx (u otro ref)
  brand               VARCHAR2(50  CHAR),                        -- Visa, MasterCard...
  last4               VARCHAR2(10  CHAR),                        -- Últimos 4 dígitos
  exp_month           NUMBER(2),
  exp_year            NUMBER(4),
  type                VARCHAR2(30  CHAR),                        -- card, PayPal, etc.
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT fk_pm_user
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
    ON DELETE CASCADE
);

CREATE INDEX ix_pm_user ON payment_methods (user_id);
CREATE INDEX ix_pm_type ON payment_methods (type);

-- =====================================================================
-- 8) INVOICES
-- =====================================================================
CREATE TABLE invoices (
  invoice_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        NUMBER NOT NULL,                                   -- FK a app_user
  order_id       NUMBER,                                            -- FK opcional a orders
  amount         NUMBER(12,2) NOT NULL,
  currency       VARCHAR2(10  CHAR) DEFAULT 'MXN' NOT NULL,
  status         VARCHAR2(20  CHAR) DEFAULT 'PENDING' NOT NULL,     -- PENDING/PAID/FAILED
  description    VARCHAR2(255 CHAR),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT fk_invoice_user
    FOREIGN KEY (user_id)  REFERENCES orders.user_id  
    DISABLE,

  -- NOTA: Lo correcto es FK a app_user, no a orders.user_id (que no es PK).
  -- Usamos el FK correcto abajo:
  CONSTRAINT fk_invoice_user2
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
    ON DELETE CASCADE,

  CONSTRAINT ck_invoice_amount_nonneg CHECK (amount >= 0),
  CONSTRAINT ck_invoice_status CHECK (status IN ('PENDING','PAID','FAILED'))
);

-- Índices
CREATE INDEX ix_invoice_user   ON invoices (user_id);
CREATE INDEX ix_invoice_status ON invoices (status);
CREATE INDEX ix_invoice_order  ON invoices (order_id);

-- =====================================================================
-- 9) PAYMENTS
-- =====================================================================
CREATE TABLE payments (
  payment_id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             NUMBER NOT NULL,                               -- FK a app_user
  payment_provider    VARCHAR2(20  CHAR) NOT NULL,                   -- 'STRIPE'|'PAYPAL'
  payment_intent_id   VARCHAR2(120 CHAR),                            -- Intent/OrderId proveedor
  customer_ref        VARCHAR2(120 CHAR),                            -- ID cliente proveedor
  payment_method_id   NUMBER,                                        -- FK a payment_methods
  invoice_id          NUMBER,                                        -- FK a invoices
  order_id            NUMBER,                                        -- FK a orders
  amount              NUMBER(12,2) NOT NULL,
  currency            VARCHAR2(10  CHAR) DEFAULT 'MXN' NOT NULL,
  status              VARCHAR2(30  CHAR) DEFAULT 'PENDING' NOT NULL, -- 'PENDING'|'SUCCEEDED'|'FAILED'
  description         VARCHAR2(255 CHAR),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at          TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_pay_user
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_pay_method
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id)
    ON DELETE SET NULL,

  CONSTRAINT fk_pay_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
    ON DELETE SET NULL,

  CONSTRAINT fk_pay_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON DELETE SET NULL,

  CONSTRAINT ck_pay_amount_nonneg CHECK (amount >= 0),
  CONSTRAINT ck_pay_provider CHECK (payment_provider IN ('STRIPE','PAYPAL')),
  CONSTRAINT ck_pay_status   CHECK (status IN ('PENDING','SUCCEEDED','FAILED')),
  CONSTRAINT ck_pay_provider_uc CHECK (payment_provider = UPPER(payment_provider)),
  CONSTRAINT ck_pay_status_uc   CHECK (status = UPPER(status)),
  CONSTRAINT uq_pay_provider_intent UNIQUE (payment_provider, payment_intent_id)
);

-- Índices
CREATE INDEX ix_pay_user       ON payments (user_id);
CREATE INDEX ix_pay_status     ON payments (status);
CREATE INDEX ix_pay_provider   ON payments (payment_provider);
CREATE INDEX ix_pay_invoice    ON payments (invoice_id);
CREATE INDEX ix_pay_method     ON payments (payment_method_id);
CREATE INDEX ix_pay_order      ON payments (order_id);
-- CREATE INDEX ix_pay_created_at ON payments (created_at); -- opcional para reportes

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Trigger para mantener updated_at en payments
CREATE OR REPLACE TRIGGER trg_payments_upd_ts
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
  :NEW.updated_at := SYSTIMESTAMP;
END;
/
-- Trigger para mantener updated_at en product_ratings
CREATE OR REPLACE TRIGGER trg_product_ratings_upd_ts
BEFORE UPDATE ON product_ratings
FOR EACH ROW
BEGIN
  :NEW.updated_at := SYSTIMESTAMP;
END;
/
