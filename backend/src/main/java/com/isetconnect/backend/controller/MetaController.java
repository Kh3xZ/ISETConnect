package com.isetconnect.backend.controller;

import com.isetconnect.backend.dto.DepartmentInfo;
import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.util.ClassCatalog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;


@RestController
@RequestMapping("/api/meta")
public class MetaController {

    @GetMapping("/departments")
    public List<DepartmentInfo> departments() {
        return Arrays.stream(Department.values())
                .map(d -> new DepartmentInfo(d.name(), d.getLabel(), ClassCatalog.classesOf(d)))
                .toList();
    }
}
