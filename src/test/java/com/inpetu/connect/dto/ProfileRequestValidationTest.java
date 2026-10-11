package com.inpetu.connect.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProfileRequestValidationTest {
    private static Validator validator;
    private static AutoCloseable validatorFactory;

    @BeforeAll
    static void createValidator() {
        var factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        validatorFactory = factory::close;
    }

    @AfterAll
    static void closeValidatorFactory() throws Exception {
        validatorFactory.close();
    }

    @Test
    void acceptsBrazilianMobileAndEmptyOptionalPhone() {
        assertTrue(validator.validate(new PerfilUsuarioRequest("Joana", "(48) 99999-1234", "InPETU", "Pesquisadora")).isEmpty());
        assertTrue(validator.validate(new PerfilUsuarioRequest("Joana", "", "InPETU", "Pesquisadora")).isEmpty());
    }

    @Test
    void rejectsInvalidBrazilianMobile() {
        assertFalse(validator.validate(new PerfilUsuarioRequest("Joana", "48999991234", "InPETU", "Pesquisadora")).isEmpty());
        assertFalse(validator.validate(new PerfilUsuarioRequest("Joana", "(48) 89999-1234", "InPETU", "Pesquisadora")).isEmpty());
    }

    @Test
    void enforcesPasswordLengthAndConfirmationPresence() {
        assertFalse(validator.validate(new AlterarSenhaRequest("old", "short", "short")).isEmpty());
        assertFalse(validator.validate(new AlterarSenhaRequest("old", "long-enough", "")).isEmpty());
        assertTrue(validator.validate(new AlterarSenhaRequest("old", "long-enough", "long-enough")).isEmpty());
    }
}
