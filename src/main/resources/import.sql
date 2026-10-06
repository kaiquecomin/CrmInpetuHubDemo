INSERT IGNORE INTO perfil_acesso (id_perfil, nome_perfil, descricao) VALUES
(1, 'Coordenador', 'Acesso total ao InPETU Connect'),
(2, 'Gestor de Espaços', 'Gestão de ambientes e aprovações'),
(3, 'Staff/Atendente', 'Atendimento e consulta de disponibilidade'),
(4, 'Solicitante Público', 'Acesso ao portal público');
INSERT IGNORE INTO organizacao (id_organizacao, nome_organizacao, tipo_organizacao, ativo) VALUES (1, 'UFSC / InPETU Hub', 'Instituição', true);
INSERT IGNORE INTO usuario (id_usuario, nome_completo, email, cargo_vinculo, senha_hash, id_perfil, id_persona, id_organizacao, ativo, data_cadastro) VALUES
(1, 'Coordenador InPETU', 'admin@inpetuhub.ufsc.br', 'Coordenação', '$2a$10$0bem4PeGiBuqh4.II4ch0O4OPi0tsYvn4pyWxXJam4Tgk9J4JZslG', 1, 1, 1, true, NOW());
INSERT IGNORE INTO espaco (id_espaco, nome_espaco, tipo_espaco, capacidade_pessoas, equipamentos_disponiveis, exige_aprovacao_manual, ativo, data_criacao, id_usuario_criador) VALUES
(1, 'Auditório Principal', 'Auditório', 80, 'Projetor, sistema de som, microfones', true, true, NOW(), 1),
(2, 'Sala de Aula 1', 'Sala de aula', 35, 'Projetor, quadro branco', false, true, NOW(), 1),
(3, 'Área de Coworking', 'Coworking', 24, 'Mesas compartilhadas, Wi-Fi', false, true, NOW(), 1),
(4, 'Sala de Reunião 1', 'Sala de reunião', 6, 'Monitor, videoconferência', false, true, NOW(), 1),
(5, 'Sala de Reunião 2', 'Sala de reunião', 10, 'Monitor, videoconferência, quadro', false, true, NOW(), 1),
(6, 'Visita Guiada', 'Visita guiada', 20, 'Acompanhamento da equipe InPETU', true, true, NOW(), 1);
