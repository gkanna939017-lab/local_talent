-- Drop old table (safe reset)
DROP TABLE IF EXISTS workers;

-- Create table
CREATE TABLE workers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  skill VARCHAR(50),
  city VARCHAR(50),
  experience INT,
  phone VARCHAR(15),
  is_woman BOOLEAN
);

-- Insert workers (CORRECT SYNTAX)
INSERT INTO workers (name, skill, city, experience, phone, is_woman) VALUES
('Ramesh Goud', 'Electrician', 'Narasaraopet', 7, '9876543101', FALSE),
('Sunitha Rani', 'Tailor', 'Narasaraopet', 5, '9123456702', TRUE),
('Mahesh Babu', 'Plumber', 'Narasaraopet', 4, '9988776612', FALSE),
('Lakshmi Devi', 'Beautician', 'Narasaraopet', 6, '9345678903', TRUE),
('Kiran Kumar', 'Carpenter', 'Narasaraopet', 8, '9456123791', FALSE),
('Meena Kumari', 'Nurse', 'Narasaraopet', 10, '9765432102', TRUE),
('Ajay Reddy', 'Mason', 'Narasaraopet', 12, '9321456782', FALSE),
('Priya Rao', 'Teacher', 'Narasaraopet', 9, '9876123452', TRUE),
('Suresh Naidu', 'Auto Driver', 'Narasaraopet', 6, '9234567892', FALSE),
('Anjali Nair', 'Tailor', 'Narasaraopet', 7, '9345678125', TRUE),
('Vikram Chowdary', 'Plumber', 'Narasaraopet', 3, '9456789014', FALSE),
('Shreya Joshi', 'Beautician', 'Narasaraopet', 4, '9876543203', TRUE),
('Rajesh Kumar', 'Carpenter', 'Narasaraopet', 8, '9123456711', FALSE),
('Pooja Verma', 'Nurse', 'Narasaraopet', 7, '9988776623', TRUE),
('Santosh Mehta', 'Mason', 'Narasaraopet', 11, '9345678991', FALSE),
('Divya Singh', 'Teacher', 'Narasaraopet', 5, '9765432113', TRUE),
('Ravi Shankar', 'Auto Driver', 'Narasaraopet', 9, '9321456793', FALSE),
('Anita Das', 'Tailor', 'Narasaraopet', 6, '9456123704', TRUE),
('Karthik Reddy', 'Plumber', 'Narasaraopet', 4, '9876123463', FALSE),
('Sonal Gupta', 'Beautician', 'Narasaraopet', 8, '9234567804', TRUE);
