package com.isetconnect.backend.dto;

import java.util.List;

public record DepartmentInfo(String code, String label, List<String> classes) {
}
