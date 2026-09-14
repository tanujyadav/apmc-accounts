--
-- PostgreSQL database dump
--

\restrict SJzBVr9JXQqFvwRTKewWEKK0HRFWiOQHnjrhfM5zglI4U2Rnpd01wLyW6JEo1C2

-- Dumped from database version 15.16 (Debian 15.16-0+deb12u1)
-- Dumped by pg_dump version 15.16 (Debian 15.16-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.bank_accounts (id, bank_name, branch, account_number, ifsc_code, account_type, opening_balance, status, created_at, opening_balance_date) VALUES (1, 'SBI (APMC PAYMENT)', 'WAZIRGANJ', '30386343784', 'SBIN0017304', 'Savings', 22753329.43, 'active', '2026-09-08 09:57:38.319987', '2026-04-01');
INSERT INTO public.bank_accounts (id, bank_name, branch, account_number, ifsc_code, account_type, opening_balance, status, created_at, opening_balance_date) VALUES (2, 'SBI (APMC DEPOSIT)', 'WAZIRGANJ', '30386329769', 'SBIN0017304', 'Savings', 0.00, 'active', '2026-09-13 18:10:59.29118', '2026-04-01');
INSERT INTO public.bank_accounts (id, bank_name, branch, account_number, ifsc_code, account_type, opening_balance, status, created_at, opening_balance_date) VALUES (3, 'SBI (APMC CESS)', 'WAZIRGANJ', '30410641195', 'SBIN0017304', 'Savings', 0.00, 'active', '2026-09-13 18:10:59.29118', '2026-04-01');


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 3, true);


--
-- PostgreSQL database dump complete
--

\unrestrict SJzBVr9JXQqFvwRTKewWEKK0HRFWiOQHnjrhfM5zglI4U2Rnpd01wLyW6JEo1C2

