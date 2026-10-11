package com.inpetu.connect.repository;

import com.inpetu.connect.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    boolean existsByIdPerfil(Integer idPerfil);
    List<Usuario> findAllByIdOrganizacaoAndIdPerfilAndAtivoTrue(Integer idOrganizacao, Integer idPerfil);
    List<Usuario> findAllByAtivoTrueAndIdPerfilLessThan(Integer idPerfil);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from Usuario u where u.idUsuario = :id")
    Optional<Usuario> bloquearParaCota(@Param("id") Integer id);
}
