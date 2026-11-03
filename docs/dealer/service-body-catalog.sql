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
