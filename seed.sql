USE web_katalog;

INSERT INTO types (name) VALUES
('Mesin'),
('Kelistrikan'),
('Suspensi'),
('Rem'),
('Body');

INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2y$10$6H3KSQy77DwPWB7vM62eyOm9pMyf9Kic5Tij94H09BW3aIDZe5DXO', 'admin');

INSERT INTO products (type_id, name, brand, model, card_mode, detail, price_item, price_install, image_pos_x, image_pos_y, image_scale, image_path, thumb_path) VALUES
(1, 'Filter Udara Racing 150cc', 'Honda', 'Vario 150', 'image', 'Filter udara performa tinggi untuk motor harian dan touring.', 165000, 35000, 50, 50, 100, NULL, NULL),
(1, 'Busi Iridium Premium', 'NGK', 'CR7HIX', 'image', 'Busi iridium untuk pembakaran stabil dan respons gas lebih cepat.', 98000, 25000, 50, 50, 100, NULL, NULL),
(2, 'Aki Maintenance Free 5Ah', 'GS Astra', 'GTZ5S', 'image', 'Aki bebas perawatan dengan daya tahan tinggi untuk pemakaian harian.', 320000, 45000, 50, 50, 100, NULL, NULL),
(2, 'Relay Starter Heavy Duty', 'Denso', '12V-4P', 'image', 'Relay starter kualitas OEM dengan arus stabil.', 85000, 30000, 50, 50, 100, NULL, NULL),
(3, 'Shock Belakang Adjustable', 'YSS', 'Z-Series', 'image', 'Shock tabung adjustable untuk kenyamanan dan handling optimal.', 740000, 95000, 50, 50, 100, NULL, NULL),
(3, 'Bushing Arm Polyurethane', 'TDR', 'PU-BRG', 'image', 'Bushing arm lebih rigid dan tahan aus untuk suspensi.', 210000, 80000, 50, 50, 100, NULL, NULL),
(4, 'Kampas Rem Ceramic', 'Brembo', 'Ceramic-X', 'image', 'Kampas rem ceramic untuk cengkeraman kuat dan minim bunyi.', 145000, 40000, 50, 50, 100, NULL, NULL),
(4, 'Piringan Rem Floating', 'RCB', 'Floating-260', 'image', 'Piringan rem floating untuk pelepasan panas lebih baik.', 520000, 70000, 50, 50, 100, NULL, NULL),
(5, 'Cover Body Samping Sport', 'Yamaha', 'Aerox', 'image', 'Panel body samping model sport dengan bahan ABS kuat.', 280000, 65000, 50, 50, 100, NULL, NULL),
(5, 'Spakbor Belakang Universal', 'KYT', 'Universal-R', 'image', 'Spakbor belakang model universal dengan fitting mudah.', 120000, 35000, 50, 50, 100, NULL, NULL);
