package com.inpetu.connect.db;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.DisposableBean;

import javax.sql.DataSource;

/** Guarda os dois pools de conexão e fecha ambos no desligamento. */
public class DbRegistry implements DisposableBean {
    private final HikariDataSource main;
    private final HikariDataSource test; // pode ser null

    public DbRegistry(HikariDataSource main, HikariDataSource test) { this.main = main; this.test = test; }

    public DataSource main() { return main; }
    public DataSource test() { return test; }
    public boolean testEnabled() { return test != null; }
    public String mainUrl() { return main.getJdbcUrl(); }
    public String testUrl() { return test == null ? null : test.getJdbcUrl(); }

    @Override public void destroy() {
        main.close();
        if (test != null) test.close();
    }
}
