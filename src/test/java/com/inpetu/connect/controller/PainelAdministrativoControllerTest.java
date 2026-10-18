package com.inpetu.connect.controller;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PainelAdministrativoControllerTest {
    @Test
    void forwardsThePanelRouteToTheReactEntryPointWithoutCaching() {
        var response = new MockHttpServletResponse();

        String view = new PainelAdministrativoController().index(response);

        assertEquals("forward:/index.html", view);
        assertEquals("no-store", response.getHeader("Cache-Control"));
    }
}
