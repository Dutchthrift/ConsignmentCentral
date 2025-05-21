-- SQL script to create test accounts

-- Create test admin user
INSERT INTO users (email, password, name, role, created_at)
VALUES (
  'admin@test.com',
  -- This is a pre-hashed password for 'adminpass123'
  'e9ba11c4ba1f2aec3c9a0d25e032f4d56ceb38caba07ee9cf4a72af81a7c974b7c4da0cac21db3c0cd4d4c9ba8d9f92ae40ff65a5da48b5c9eb20b392d3b3a8b.ae7a80bef376aae1fd453a4969350494',
  'Test Admin',
  'admin',
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role
RETURNING id, email, name, role;

-- Create test consignor user
INSERT INTO customers (email, password, name, role, created_at)
VALUES (
  'consignor@test.com',
  -- This is a pre-hashed password for 'testpass123'
  '9d4cffee1042ebc96531a65e48e0645f91b38db4f64b1a27c77ee7abcf3079dba6c34a0644baa41e3cf18b6c7a4b6891c67c5afcd10c238bd0a4f3aabbb9c457.db7a7a721cd2b6a2e4dc84ae39019665',
  'Test Consignor',
  'consignor',
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role
RETURNING id, email, name, role;