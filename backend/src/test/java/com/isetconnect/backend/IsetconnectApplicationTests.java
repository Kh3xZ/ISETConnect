package com.isetconnect.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/isetconnect_db",
    "spring.datasource.username=postgres",
    "spring.datasource.password=postgres"
})
class IsetconnectApplicationTests {

    @Test
    void contextLoads() {
    }

}

