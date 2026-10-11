package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;

public interface EmailSender {
    void sendConfirmation(CadastroPendente pendente);
}
