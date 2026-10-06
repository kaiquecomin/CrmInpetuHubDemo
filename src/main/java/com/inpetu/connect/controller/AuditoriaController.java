package com.inpetu.connect.controller;

import com.inpetu.connect.model.LogAuditoria;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/auditoria")
public class AuditoriaController {
    private final LogAuditoriaRepository logs;
    public AuditoriaController(LogAuditoriaRepository logs) { this.logs = logs; }
    @GetMapping @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    public List<LogAuditoria> listar() { return logs.findAll(Sort.by(Sort.Direction.DESC, "dataHora", "idLog")); }
}
