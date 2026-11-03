SET search_path TO cu_desk, pg_catalog;
CREATE TABLE dealer (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, contact text NOT NULL, email text NOT NULL, phone text NOT NULL, address text NOT NULL, key_hash text UNIQUE NOT NULL);
CREATE TABLE rep (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dealer_id uuid NOT NULL REFERENCES dealer, name text NOT NULL, email text NOT NULL);
CREATE UNIQUE INDEX rep_name ON rep(dealer_id,lower(name),lower(email));
CREATE TABLE session (token text PRIMARY KEY, dealer_id uuid REFERENCES dealer, expires timestamptz NOT NULL);
CREATE TABLE login_attempt (identity text PRIMARY KEY, attempts int NOT NULL, started timestamptz NOT NULL);
CREATE TABLE item (id text PRIMARY KEY, vehicle text NOT NULL, category text NOT NULL, label text NOT NULL, msrp int CHECK (msrp>=0), dealer_price int CHECK (dealer_price>=0), bundle_price int CHECK (bundle_price>=0), rebate int CHECK (rebate>=0));
CREATE TABLE slot (day date PRIMARY KEY, capacity int NOT NULL CHECK (capacity BETWEEN 1 AND 100));
CREATE TABLE quote (id uuid PRIMARY KEY, dealer_id uuid NOT NULL REFERENCES dealer, rep_id uuid NOT NULL REFERENCES rep, snapshot jsonb NOT NULL, document jsonb, created timestamptz NOT NULL DEFAULT now(), day date REFERENCES slot, status text NOT NULL DEFAULT 'quoted', credit text NOT NULL DEFAULT 'unbooked', mailed boolean NOT NULL DEFAULT false, request_hash text NOT NULL);
CREATE INDEX quote_dealer_date ON quote(dealer_id,created DESC);
CREATE INDEX quote_schedule ON quote(day,status);
INSERT INTO item (id,vehicle,category,label,msrp) VALUES
('liner-short','pickup','Bedliner','Patriot Liner · short bed',57500),
('liner-standard','pickup','Bedliner','Patriot Liner · standard 6.5 ft',59500),
('liner-hd','pickup','Bedliner','Patriot Liner · HD 6.5 ft',63500),
('liner-long','pickup','Bedliner','Patriot Liner · long 8 ft',67500),
('uv','pickup','Topcoat','Patriot UV Plus',20000),
('mx4','pickup','Bed cover','BAKFlip MX4',NULL),
('x15','pickup','Bed cover','TruXedo Pro X15',NULL),
('truxport','pickup','Bed cover','TruXedo TruXport',NULL),
('westin-hard-trifold','pickup','Bed cover','Westin Hard Tri-Fold',NULL),
('retraxpro-mx','pickup','Bed cover','RetraxPRO MX',NULL),
('cover-upgrade-tailgate-seal','pickup','Cover upgrade · Tailgate seal','Tailgate seal upgrade',NULL),
('cover-upgrade-bed-mat','pickup','Cover upgrade · Bed mat','Bed mat upgrade',NULL),
('cover-upgrade-bed-lighting','pickup','Cover upgrade · Bed lighting','LED bed-lighting upgrade',NULL),
('cover-upgrade-bakbox2','pickup','Cover upgrade · BAKBox2','BAKBox2 toolbox upgrade',NULL),
('cover-upgrade-xr-rails','pickup','Cover upgrade · XR rails','RetraxPRO XR rail-system upgrade',NULL),
('step','pickup','Running boards','Fixed running boards',NULL),
('power-step','pickup','Running boards','Power running boards',NULL),
('rust','pickup','Undercoating','Half-ton undercoating',65000),
('rust-hd','pickup','Undercoating','Heavy-duty undercoating',75000),
('partition','van','Partition','Cab partition',NULL),
('shelving','van','Storage','Cargo shelving package',NULL),
('trade','van','Trade package','Trade-specific van package',NULL),
('ladder','van','Roof equipment','Ladder rack',NULL),
('floor','van','Flooring','Cargo floor protection',NULL),
('rust-car','other','Undercoating','Underbody protection',65000),
('hitch','other','Hitch','Receiver hitch',NULL),
('ceramic','other','Ceramic coating','Paint protection package',NULL);
CREATE TABLE notice (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES quote, subject text NOT NULL, body text NOT NULL, sent_at timestamptz);
-- Apply to an existing dealer desk. Running again preserves staff pricing.
INSERT INTO cu_desk.item (id,vehicle,category,label)
SELECT 'service-body-' || feet, 'service-body', 'Service body coating',
       'Patriot Liner · ' || feet || ' ft service body'
FROM generate_series(7,12) AS sizes(feet)
ON CONFLICT (id) DO NOTHING;
INSERT INTO cu_desk.item (id,vehicle,category,label)
VALUES ('service-body-other','service-body','Service body coating','Patriot Liner · custom-length service body')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cu_desk.item (id,vehicle,category,label)
VALUES ('rust-review','pickup-review','Undercoating','Underbody protection · shop review'),
       ('liner-review','pickup-review','Bedliner','Patriot Liner · confirm truck configuration')
ON CONFLICT (id) DO NOTHING;
