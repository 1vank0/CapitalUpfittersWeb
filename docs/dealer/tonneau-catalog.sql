-- Add the fast pickup cover comparison and optional upgrades.
-- Safe to run again: existing pricing is preserved.
INSERT INTO cu_desk.item (id,vehicle,category,label)
VALUES
  ('westin-hard-trifold','pickup','Bed cover','Westin Hard Tri-Fold'),
  ('retraxpro-mx','pickup','Bed cover','RetraxPRO MX'),
  ('cover-upgrade-tailgate-seal','pickup','Cover upgrade · Tailgate seal','Tailgate seal upgrade'),
  ('cover-upgrade-bed-mat','pickup','Cover upgrade · Bed mat','Bed mat upgrade'),
  ('cover-upgrade-bed-lighting','pickup','Cover upgrade · Bed lighting','LED bed-lighting upgrade'),
  ('cover-upgrade-bakbox2','pickup','Cover upgrade · BAKBox2','BAKBox2 toolbox upgrade'),
  ('cover-upgrade-xr-rails','pickup','Cover upgrade · XR rails','RetraxPRO XR rail-system upgrade')
ON CONFLICT (id) DO NOTHING;
