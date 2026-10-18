package com.inpetu.connect.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PainelAdministrativoController {
    @GetMapping({"/paineladm", "/paineladm/"})
    public String index(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        return "forward:/index.html";
    }

    public record ReservaPainel(String evento, String espaco, String solicitante,
            String inicio, String fim, String status) {}
}
