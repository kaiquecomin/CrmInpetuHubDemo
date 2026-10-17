package com.inpetu.connect.controller;

import com.inpetu.connect.dto.*;
import com.inpetu.connect.model.Reserva;
import com.inpetu.connect.repository.ReservaRepository;
import com.inpetu.connect.service.ReservaService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/api/v1/reservas")
public class ReservaController {
    private final ReservaService service; private final ReservaRepository reservas;
    public ReservaController(ReservaService service, ReservaRepository reservas) { this.service = service; this.reservas = reservas; }
    @PostMapping public ReservaSolicitanteResumo criar(@Valid @RequestBody ReservaRequest request, Authentication auth) {
        return ReservaSolicitanteResumo.from(service.criar(request, auth.getName()));
    }
    @GetMapping("/minhas") public List<ReservaSolicitanteResumo> minhas(Authentication auth) {
        return service.minhas(auth.getName()).stream().map(ReservaSolicitanteResumo::from).toList();
    }
    @GetMapping @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    public List<Reserva> listar(@RequestParam(required = false) LocalDate data) {
        return data == null ? reservas.findAll() : reservas.findByDataReservaAndStatusReservaIn(data, List.of("Confirmada", "Pendente"));
    }
    @PutMapping("/{id}") @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    public Reserva editar(@PathVariable Integer id, @Valid @RequestBody ReservaEdicaoRequest request, Authentication auth) {
        return service.editar(id, request, auth.getName());
    }
    @PatchMapping("/{id}/negociacao")
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    public Reserva registrarNegociacao(@PathVariable Integer id, @Valid @RequestBody NegociacaoCotaRequest request, Authentication auth) {
        return service.registrarNegociacao(id, request.observacao(), auth.getName());
    }
    @DeleteMapping("/{id}/cancelar") public ReservaSolicitanteResumo cancelar(@PathVariable Integer id,
            @Valid @RequestBody CancelamentoRequest request, Authentication auth) {
        return ReservaSolicitanteResumo.from(service.cancelar(id, request.motivoCancelamento(), auth.getName()));
    }
    @PostMapping("/{id}/aprovar") @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    public Reserva aprovar(@PathVariable Integer id, Authentication auth) { return service.aprovar(id, auth.getName()); }
}
