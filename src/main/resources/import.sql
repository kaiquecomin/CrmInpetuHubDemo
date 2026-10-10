INSERT IGNORE INTO perfil_acesso (id_perfil, nome_perfil, descricao) VALUES
(1, 'Coordenador', 'Acesso total ao InPETU Connect'),
(2, 'Gestor de Espaços', 'Gestão de ambientes e aprovações'),
(3, 'Staff/Atendente', 'Atendimento e consulta de disponibilidade'),
(4, 'Solicitante Público', 'Acesso ao portal público');
INSERT IGNORE INTO organizacao (id_organizacao, nome_organizacao, tipo_organizacao, ativo) VALUES (1, 'UFSC / InPETU Hub', 'Instituição', true);
