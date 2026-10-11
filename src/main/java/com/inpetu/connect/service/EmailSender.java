package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;

public interface EmailSender {
    void sendConfirmation(CadastroPendente pendente, String rawToken);

    void sendConfirmationCode(CadastroPendente pendente, String code, int validityMinutes);

    void sendPasswordResetCode(String email, String name, String code, int validityMinutes);
}
