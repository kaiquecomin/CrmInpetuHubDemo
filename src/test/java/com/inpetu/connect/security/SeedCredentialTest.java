package com.inpetu.connect.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SeedCredentialTest {
    @Test
    void senhaDemonstrativaCorrespondeAoHashDoSeed() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = "$2a$10$0bem4PeGiBuqh4.II4ch0O4OPi0tsYvn4pyWxXJam4Tgk9J4JZslG";
        assertTrue(encoder.matches("password", hash));
    }
}
