--
-- PostgreSQL database dump
--

\restrict gECM7PPKqY7Hwz5wnik1resNTLdtCkebZCBssiGXC92AVdwdlYLYhIuSd8CrNBS

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
-- Data for Name: ledger_heads; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (1, '1-A', 'Mandi Fee', 'income', '2026-09-08 04:43:43.76385', 'मण्डी शुल्क');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (2, '1-B', 'Development Cess', 'income', '2026-09-08 04:43:43.76385', 'विकास सेस');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (3, '2', 'License Fee', 'income', '2026-09-08 04:43:43.76385', 'लाइसेंस शुल्क');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (7, '4', 'Interest on Invested Funds', 'income', '2026-09-08 04:43:43.76385', 'विनियोजित धन पर ब्याज');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (5, '6-B', 'Building / Shop Rent / Surcharge', 'income', '2026-09-08 04:43:43.76385', 'भवन/दुकान का किराया/अधिभार');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (15, '3', 'Sale of Forms etc.', 'income', '2026-09-08 08:00:21.863594', 'प्रपत्र आदि की बिक्री');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (16, '5-A', 'Receipts from Parishad / Government', 'income', '2026-09-08 08:00:21.863594', 'परिषद/शासन से');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (17, '5-B', 'Receipts from Banks', 'income', '2026-09-08 08:00:21.863594', 'बैंकों से');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (18, '5-C', 'Receipts from Mandi Samitis', 'income', '2026-09-08 08:00:21.863594', 'मण्डी समितियों से');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (19, '5-D', 'Loan Repayment (from Mandi Samitis)', 'income', '2026-09-08 08:00:21.863594', 'ऋण की वापसी (मण्डी समितियों से)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (20, '5-E', 'GST', 'income', '2026-09-08 08:00:21.863594', 'GST');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (21, '5-F', 'Refund of Land Compensation (if any)', 'income', '2026-09-08 08:00:21.863594', 'भूमि के प्रतिकर की वापसी (यदि हो)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (22, '5-G', 'Funds Released by Parishad for Various Schemes', 'income', '2026-09-08 08:00:21.863594', 'विभिन्न योजनाओं के लिये परिषद से अवमुक्त धनराशि');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (23, '5-H', 'Funds Released by Parishad for Land Purchase / Compensation Payment', 'income', '2026-09-08 08:00:21.863594', 'भूमि क्रय/प्रतिकर अदायगी हेतु परिषद से अवमुक्त धनराशि');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (24, '5-I', 'Any Other Loan / Grant or Loan Repayment (if any)', 'income', '2026-09-08 08:00:21.863594', 'अन्य कोई ऋण/अनुदान या ऋण की वापसी (यदि हो)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (25, '5-J', 'Security Deposit / Guarantee', 'income', '2026-09-08 08:00:21.863594', 'जमानत धनराशि/प्रतिभूति');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (26, '5-L', 'TDS Recovery / Income Tax Refund / Electricity Recovery', 'income', '2026-09-08 08:00:21.863594', 'T.D.S. वसूली/आयकर की वापसी/विद्युत वसूली');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (27, '5-M', 'Interim Amount Received Back from Paddy and Wheat Procurement', 'income', '2026-09-08 08:00:21.863594', 'धान एवं गेहूं खरीद से अन्तरिम वापस प्राप्त धनराशि');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (28, '6-A', 'Loan Repayment (from Employees)', 'income', '2026-09-08 08:00:21.863594', 'ऋण की वापसी (कर्मचारियों से)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (29, '6-C', 'Sale / Premium of Shop / Land', 'income', '2026-09-08 08:00:21.863594', 'दुकान/भूमि की बिक्री/प्रीमियम');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (30, '6-D', 'Compounding Fee', 'income', '2026-09-08 08:00:21.863594', 'शमन शुल्क');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (31, '6-E', 'Interest on Outstanding Mandi Fee', 'income', '2026-09-08 08:00:21.863594', 'बकाया मण्डी शुल्क पर ब्याज');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (32, '6-F', 'User Charge (Non-Specified Agricultural Produce)', 'income', '2026-09-08 08:00:21.863594', 'यूजर चार्ज (गैर निर्दिष्ट कृषि उत्पाद)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (33, '6-G', 'Interest on Outstanding User Charge', 'income', '2026-09-08 08:00:21.863594', 'बकाया यूजर चार्ज पर ब्याज');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (34, '6-H', 'Interest Amount (Building / Shop / Canteen / Premium)', 'income', '2026-09-08 08:00:21.863594', 'ब्याज की धनराशि (भवन/दुकान/कैंटीन/प्रीमियम)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (35, '6-I', 'Residential Rent / Godown Rent (GST Exempt)', 'income', '2026-09-08 08:00:21.863594', 'आवास किराया/गोदाम किराया (जी०एस०टी० मुक्त)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (36, '6-J', 'Registration Fee / Transfer Fee', 'income', '2026-09-08 08:00:21.863594', 'पंजीकरण शुल्क/अन्तरण शुल्क');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (37, '6-K', 'Administrative Fee Received under MSP Procurement', 'income', '2026-09-08 08:00:21.863594', 'MSP पर खरीद के अन्तर्गत प्राप्त प्रशासनिक शुल्क');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (38, '6-L', 'Other Income', 'income', '2026-09-08 08:00:21.863594', 'अन्य');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (39, 'EXP-01', 'Establishment Expenses', 'expense', '2026-09-08 08:49:42.726946', 'अधिष्ठान व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (40, 'EXP-02', 'Cleaning Arrangement Expenses (Mandi Site)', 'expense', '2026-09-08 08:49:42.726946', 'सफाई व्यवस्था व्यय (मंडी स्थल)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (41, 'EXP-03', 'Electricity Arrangement Expenses (Mandi Site)', 'expense', '2026-09-08 08:49:42.726946', 'विद्युत व्यवस्था व्यय (मंडी स्थल)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (42, 'EXP-04', 'Security Arrangement Expenses (Mandi Site)', 'expense', '2026-09-08 08:49:42.726946', 'सुरक्षा व्यवस्था व्यय (मंडी स्थल)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (43, 'EXP-05', 'Office Stationery / Printing Expenses', 'expense', '2026-09-08 08:49:42.726946', 'कार्यालय स्टेशनरी/प्रिंटिंग व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (44, 'EXP-06', 'Court / Legal Expenses', 'expense', '2026-09-08 08:49:42.726946', 'न्यायालय व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (45, 'EXP-07', 'Establishment Expenses (Out Source)', 'expense', '2026-09-08 08:49:42.726946', 'अधिष्ठान व्यय (Out Source)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (46, 'EXP-08', 'GST Payment Expenses', 'expense', '2026-09-08 08:49:42.726946', 'GST भुगतान व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (47, 'EXP-09', 'Purchase of Office Furniture and Equipment', 'expense', '2026-09-08 08:49:42.726946', 'कार्यालय फर्नीचर एवं उपकरण क्रय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (48, 'EXP-10', 'Mandi Site Generator Diesel, Repair, Maintenance and Operation Expenses', 'expense', '2026-09-08 08:49:42.726946', 'मंडी स्थल जनरेटर डीजल, मरम्मत, अनुरक्षण एवं संचालन व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (49, 'EXP-11', 'Mobile Squad Vehicle and Diesel Payment', 'expense', '2026-09-08 08:49:42.726946', 'सचल दल वाहन & डीजल भुगतान');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (50, 'EXP-12', 'Office Furniture and Equipment Repair', 'expense', '2026-09-08 08:49:42.726946', 'कार्यालय फर्नीचर उपकरण मरम्मत');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (51, 'EXP-13', 'Post and Telegraph Expenses', 'expense', '2026-09-08 08:49:42.726946', 'डाक तार व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (52, 'EXP-14', 'Medical Reimbursement Expenses', 'expense', '2026-09-08 08:49:42.726946', 'चिकित्सा प्रतिपूर्ति व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (53, 'EXP-15', 'Telephone / Broadband / Internet', 'expense', '2026-09-08 08:49:42.726946', 'टेलीफोन/ब्रॉडबैंड/इंटरनेट');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (54, 'EXP-16', 'Hospitality Expenses', 'expense', '2026-09-08 08:49:42.726946', 'अतिथि सत्कार व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (55, 'EXP-17', 'Advertising, Publicity and Promotion', 'expense', '2026-09-08 08:49:42.726946', 'विज्ञापन प्रचार प्रसार');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (56, 'EXP-18', 'Miscellaneous Expenses', 'expense', '2026-09-08 08:49:42.726946', 'विविध व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (57, 'EXP-19', 'Employee Loan Advance (for House / Vehicle)', 'expense', '2026-09-08 08:49:42.726946', 'कर्मचारी ऋण अग्रिम (भवन/वाहन हेतु)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (58, 'EXP-20', 'Stamping of Electronic Weighing Scales', 'expense', '2026-09-08 08:49:42.726946', 'इलेक्ट्रॉनिक कांटो के मुद्रांकन');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (59, 'EXP-21', 'Other Facility Adjustment (Book Transfer)', 'expense', '2026-09-08 08:49:42.726946', 'अन्य सुविधा समायोजन (बुक ट्रान्सफर)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (60, 'EXP-22', 'Drinking Water Arrangement', 'expense', '2026-09-08 08:49:42.726946', 'पेयजल व्यवस्था');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (61, 'EXP-23', 'Lighting Arrangement', 'expense', '2026-09-08 08:49:42.726946', 'प्रकाश व्यवस्था');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (62, 'EXP-24', 'Computer Repair / Maintenance (Including All Expenses)', 'expense', '2026-09-08 08:49:42.726946', 'कम्प्यूटरों की मरम्मत/अनुरक्षण (समस्त व्यय सहित)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (63, 'EXP-25', 'Farmer Personal Accident Assistance Scheme', 'expense', '2026-09-08 08:49:42.726946', 'कृषक व्यक्तिगत दुर्घटना सहायता योजना');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (64, 'EXP-26', 'Farmer Farm and Threshing Floor Fire Accident Assistance Scheme', 'expense', '2026-09-08 08:49:42.726946', 'कृषक खेत खलिहान अग्निकाण्ड दुर्घटना सहायता योजना');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (65, 'EXP-27', 'Balance Sheet / Other Work C.A. Fees', 'expense', '2026-09-08 08:49:42.726946', 'बैलेंस शीट/अन्य कार्य C.A. फीस');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (66, 'EXP-28', 'Cash-in-Safe and Cash-in-Transit Insurance Expenses', 'expense', '2026-09-08 08:49:42.726946', 'कैश इन सेफ तथा कैश इन ट्रांजिट बीमा व्यय');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (67, 'EXP-29', 'C.A. Bill', 'expense', '2026-09-08 08:49:42.726946', 'C.A. BILL');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (68, 'EXP-30', 'Repair of Electronic Weighing Scales and Dusters etc.', 'expense', '2026-09-08 08:49:42.726946', 'इलेक्ट्रॉनिक कांटों व डस्टर इत्यादि की मरम्मत');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (69, 'EXP-31', 'e-NAM Arrangement', 'expense', '2026-09-08 08:49:42.726946', 'e-NAM व्यवस्था');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (70, 'EXP-32', 'Travel Allowance', 'expense', '2026-09-08 08:49:42.726946', 'यात्रा भत्ता');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (71, 'EXP-33', 'CCTV Repair and Maintenance Expenses (Mandi Site)', 'expense', '2026-09-08 08:49:42.726946', 'CCTV मरम्मत व अनुरक्षण व्यय (मंडी स्थल)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (72, 'EXP-34', 'Minor / Miscellaneous Repairs', 'expense', '2026-09-08 08:49:42.726946', 'छुट पुट मरम्मत');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (73, 'EXP-35', 'Funds automatically withdrawn from committee accounts by the Mandi Board (Market Fee)', 'expense', '2026-09-13 17:21:46.994809', 'मण्डी परिषद् द्वारा समिति खातों से स्वतः निकाली धनराशि (मंडी शुल्क)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (74, 'EXP-36', 'Funds automatically withdrawn from committee accounts by the Mandi Board (CESS)', 'expense', '2026-09-13 17:21:46.994809', 'मण्डी परिषद् द्वारा समिति खातों से स्वतः निकाली धनराशि (विकास सेस)');
INSERT INTO public.ledger_heads (id, code, name, type, created_at, name_hindi) VALUES (75, '7', 'Fund Auto Credit from Mandi Board in Mandi Bank A/C (Grant)', 'income', '2026-09-13 17:21:46.994809', 'मण्डी परिषद् से समिति खाते में प्राप्त राशि (अनुदान)');


--
-- Name: ledger_heads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ledger_heads_id_seq', 75, true);


--
-- PostgreSQL database dump complete
--

\unrestrict gECM7PPKqY7Hwz5wnik1resNTLdtCkebZCBssiGXC92AVdwdlYLYhIuSd8CrNBS

