package com.inpetu.connect.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;

class ImportSqlTest {
    @Test
    void importSqlDoesNotInsertUsers() throws IOException {
        String sql = Files.readString(Path.of("src/main/resources/import.sql"));
        Pattern userInsert = Pattern.compile(
            "(?is)\\bINSERT\\b[^;]*\\busuario\\b"
        );

        assertFalse(userInsert.matcher(sql).find(), "import.sql must not insert users");
    }
}
