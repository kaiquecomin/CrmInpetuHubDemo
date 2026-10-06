package com.inpetu.connect.dto;

public record UsuarioResumo(Integer idUsuario, String nomeCompleto, String email, String telefone,
                            String cargoVinculo, Integer idPerfil, Integer idOrganizacao,
                            Boolean ativo, Integer idPersona, java.time.LocalDateTime dataCadastro) {}
