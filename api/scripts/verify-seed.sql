-- Expected after seeding (past = the 14 days before today, today = Africa/Lagos date).
SELECT count(*) AS businesses FROM businesses;                              -- 1
SELECT count(*) AS staff FROM staff;                                        -- 3
SELECT count(*) AS services FROM services;                                  -- 6
SELECT count(*) AS customers FROM customers;                                -- 12
SELECT status, count(*) FROM bookings WHERE starts_at::date < CURRENT_DATE
  GROUP BY status ORDER BY status;                -- cancelled 2, completed 19, no_show 3
SELECT count(*) AS past FROM bookings WHERE starts_at::date < CURRENT_DATE; -- 24
SELECT count(*) AS today FROM bookings WHERE starts_at::date = CURRENT_DATE;           -- 6
SELECT count(*) AS tomorrow FROM bookings WHERE starts_at::date = CURRENT_DATE + 1;    -- 5
SELECT round(100.0 * count(*) FILTER (WHERE status='no_show')
  / count(*) FILTER (WHERE status IN ('completed','no_show')), 1) AS no_show_rate_percent
  FROM bookings WHERE starts_at::date < CURRENT_DATE;                                  -- 13.6

-- This MUST FAIL with: conflicting key value violates exclusion constraint "bookings_no_overlap"
-- (CURRENT_DATE is the server's UTC date; if it differs from the shop's date, use a date from the seed.)
INSERT INTO bookings (business_id, staff_id, service_id, customer_id, starts_at, ends_at, price_minor, manage_token)
SELECT business_id, staff_id, service_id, customer_id, starts_at + interval '10 minutes', ends_at, price_minor, 'overlap-test'
FROM bookings WHERE status = 'confirmed' ORDER BY starts_at LIMIT 1;
