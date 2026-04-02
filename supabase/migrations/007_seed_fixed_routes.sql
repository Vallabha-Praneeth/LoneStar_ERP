-- Seed fixed routes with stops from fixed_routes.md

-- Route 1: Chicago - Aurora - Naperville
WITH r AS (
  INSERT INTO public.routes (id, name, city, is_active)
  VALUES (gen_random_uuid(), 'Chicago - Aurora - Naperville', 'Chicago', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO public.route_stops (route_id, stop_order, venue_name, address) SELECT id, n, v, a FROM r, (VALUES
  (1, 'Nawabi Hyderabad House - Biryani Place', '4448 E New York St, Aurora, IL 60504'),
  (2, 'Mall Of India', '776 Illinois Rte 59 Suite 145, Naperville, IL 60540'),
  (3, 'ISKCON Temple of Greater Chicago (Naperville)', '1505 McDowell Rd, Naperville, IL 60563'),
  (4, 'A2B Indian Veg Restaurant - Illinois', '28244 Diehl Rd, Warrenville, IL 60555'),
  (5, 'Sri Venkateswara Swami (Balaji) Temple', '1145 Sullivan Rd, Aurora, IL 60506'),
  (6, 'Shan Li''s', '850 N Lake St, Aurora, IL 60506'),
  (7, 'Nayab Mart', '3577 E New York St, Aurora, IL 60504')
) AS t(n, v, a);

-- Route 2: Chicago - Schaumburg
WITH r AS (
  INSERT INTO public.routes (id, name, city, is_active)
  VALUES (gen_random_uuid(), 'Chicago - Schaumburg', 'Chicago', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO public.route_stops (route_id, stop_order, venue_name, address) SELECT id, n, v, a FROM r, (VALUES
  (1, 'India Bazar', '615 W Golf Rd, Des Plaines, IL 60016'),
  (2, 'Nawabi Hyderabad House - Biryani Place', '1424 E Algonquin Rd, Schaumburg, IL 60173'),
  (3, 'Vishnu Foods (eatery)', '645 E Algonquin Rd, Schaumburg, IL 60173'),
  (4, 'Kritunga Indian Restaurant', '2336 W Higgins Rd, Hoffman Estates, IL 60169'),
  (5, 'Hyderabad House', '825 W Higgins Rd, Schaumburg, IL 60195'),
  (6, 'Jay Bhavani', '1165 Barrington Rd, Hoffman Estates, IL 60169'),
  (7, 'Rajeshree Grocers', '1849 W Golf Rd, Schaumburg, IL 60194'),
  (8, 'Mumbai Cafe', '1069 W Golf Rd, Hoffman Estates, IL 60169'),
  (9, 'Desi Tadka', '927 W Golf Rd, Schaumburg, IL 60194'),
  (10, 'EggMania - Modern Indian Restaurant and Bar', '1133-1135 N Salem Dr, Schaumburg, IL 60194'),
  (11, 'Tabla Indian Restaurant Schaumburg', '1091 N Salem Dr, Schaumburg, IL 60194'),
  (12, 'Rajula''s Kitchen Schaumburg / Hoffman Estates', '15-17 Golf Center, Hoffman Estates, IL 60169'),
  (13, 'NAATU Indian Restaurant and Bar', '167 W Golf Rd, Schaumburg, IL 60195'),
  (14, 'Parivar Grocers', '715 W Golf Rd, Hoffman Estates, IL 60169'),
  (15, 'Indiaco Schaumburg / Hoffman Estates', '15-17 Golf Center, Hoffman Estates, IL 60169'),
  (16, 'Priya Indian Restaurant', '939 W Wise Rd, Schaumburg, IL 60193'),
  (17, 'Shree Swaminarayan Hindu Temple ISSO', '21W710 Irving Park Rd, Itasca, IL 60143'),
  (18, 'Cool Mirchi', '814 E Nerge Rd, Roselle, IL 60172')
) AS t(n, v, a);

-- Route 3: Chicago - Devon Ave
WITH r AS (
  INSERT INTO public.routes (id, name, city, is_active)
  VALUES (gen_random_uuid(), 'Chicago - Devon Ave', 'Chicago', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO public.route_stops (route_id, stop_order, venue_name, address) SELECT id, n, v, a FROM r, (VALUES
  (1, 'Karahi Corner (Catering House)', '2658 W Devon Ave, Chicago, IL 60659'),
  (2, 'Patel Brothers', '2610 W Devon Ave, Chicago, IL 60659'),
  (3, 'Shree Ganesh Temple of Chicago - Regal Foundation', '2545 W Devon Ave, Chicago, IL 60659'),
  (4, 'Hyderabad House', '2225 W Devon Ave, Chicago, IL 60659'),
  (5, 'Ghareeb Nawaz Restaurant', '2032 W Devon Ave, Chicago, IL 60659'),
  (6, 'McDonald''s', '1831 W Devon Ave, Chicago, IL 60660'),
  (7, 'Great Chicago Food & Beverage Co', '3149 W Devon Ave, Chicago, IL 60659'),
  (8, 'Taza Bakery and Hadramout Restaurant', '3100 W Devon Ave, Chicago, IL 60659'),
  (9, 'Delhi Darbar Kabab House', '3010 W Devon Ave, Chicago, IL 60659'),
  (10, 'Anmol Barbecue', '2858 W Devon Ave, Chicago, IL 60659')
) AS t(n, v, a);

-- Route 4: Chicago - Devon Mix (Devon, Downtown, Schaumburg)
WITH r AS (
  INSERT INTO public.routes (id, name, city, is_active)
  VALUES (gen_random_uuid(), 'Chicago - Devon Mix', 'Chicago', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO public.route_stops (route_id, stop_order, venue_name, address) SELECT id, n, v, a FROM r, (VALUES
  (1, 'Delhi Darbar Kabab House', '3010 W Devon Ave, Chicago, IL 60659'),
  (2, 'Patel Brothers', '2600 W Devon Ave, Chicago, IL 60659'),
  (3, 'Shree Ganesh Temple of Chicago', '2545 W Devon Ave, Chicago, IL 60659'),
  (4, 'Hyderabad House', '2225 W Devon Ave, Chicago, IL 60659'),
  (5, 'Ghareeb Nawaz Restaurant', '2032 W Devon Ave, Chicago, IL 60659'),
  (6, 'Stop - Morton Grove', '7172 Dempster St, Morton Grove, IL 60053'),
  (7, 'Stop - Niles 1', '9555 N Milwaukee Ave, Niles, IL 60714'),
  (8, 'Stop - Niles 2', '8425 W Golf Rd, Niles, IL 60714'),
  (9, 'Stop - Des Plaines', '9344 Ballard Rd, Des Plaines, IL 60016'),
  (10, 'Stop - Mt Prospect', '1746 W Golf Rd, Mt Prospect, IL 60056'),
  (11, 'Stop - Schaumburg 1', '1301 American Ln, Schaumburg, IL 60173'),
  (12, 'Stop - Hoffman Estates', '425 Illinois Blvd, Hoffman Estates, IL 60169'),
  (13, 'Stop - Schaumburg 2', '855 E Schaumburg Rd, Schaumburg, IL 60194'),
  (14, 'Cool Mirchi', '814 E Nerge Rd, Roselle, IL 60172'),
  (15, 'Shree Swaminarayan Hindu Temple ISSO', '21W710 Irving Park Rd, Itasca, IL 60143'),
  (16, 'BAPS Shri Swaminarayan Mandir', '1851 Pramukh Swami Maharaj Rd, Bartlett, IL 60103')
) AS t(n, v, a);
