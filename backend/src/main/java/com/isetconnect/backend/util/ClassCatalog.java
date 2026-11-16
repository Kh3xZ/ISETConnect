package com.isetconnect.backend.util;

import com.isetconnect.backend.model.Department;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;





public final class ClassCatalog {

    private static final Map<Department, List<String>> CLASSES;
    private static final Pattern LEVEL = Pattern.compile("^(?:EA-)?(L[123]|MP[12])");

    static {
        Map<Department, List<String>> m = new EnumMap<>(Department.class);
        m.put(Department.GENIE_CIVIL, clean(
            "L1-GC-EAD", "L3-BAT1-EAD", "L3-BAT2-EAD", "L1-GC1", "L1-GC2", "L1-GC3",
            "L1-GC4", "L1-GC5", "L1-GC6", "L1-GC7", "L2-BAT1", "L2-BAT2",
            "L2-BAT3", "L2-PCH1", "L2-PCH2", "L2-PCH3", "L2-TP1", "L2-TP2",
            "L2-TP3", "L3-BAT1", "L3-BAT2", "L3-BAT3", "L3-PCH1", "L3-TP1",
            "L3-TP2", "L3-TP3", "OACA_CIVIL"));
        m.put(Department.GENIE_ELECTRIQUE, clean(
            "ERASMUS", "L1-GE1", "L1-GE2", "L1-GE3", "L1-GE4", "L1-GE5",
            "L1-GE6", "L2-EI1", "L2-EI2", "L2-GEAII1", "L2-GEAII2", "L2-MSE1",
            "L2-MSE2", "L2-SSE1", "L2-SSE2", "L3-AII1", "L3-AII2", "L3-EI1",
            "L3-EI2", "L3-MSE1", "L3-MSE2", "L3-SSE1", "L3-SSE2", "OACA_GE_G1",
            "OACA_TELECOM"));
        m.put(Department.GENIE_MECANIQUE, clean(
            "L1-GM-EAD", "L1-GM1", "L1-GM2", "L1-GM3", "L1-GM4", "L1-GM5",
            "L1-GM6", "L1-GM7", "L2-EN1", "L2-EN2", "L2-GMCFM1", "L2-GMCFM2",
            "L2-GMCM", "L2-MI1", "L2-MI2", "L2-MT1", "L2-MT2", "L2-PL1",
            "L2-PL2", "L3-EN1", "L3-EN2", "L3-GMCFM1", "L3-GMCFM2", "L3-GMCM",
            "L3-MI1", "L3-MI2", "L3-MT1", "L3-MT2", "L3-PL1", "L3-PL2",
            "MP1-MT", "MP2-MT"));
        m.put(Department.GESTION, clean(
            "EA-L2CF", "EA-L3CF", "IORT1", "IORT2", "L1-CD3", "L1-CF3",
            "L1-MA4", "L1-MGR", "L1-SG1", "L1-SG2", "L1-SG3", "L1-SG4",
            "L1-SG5", "L1-SG6", "L1-SG7", "L1-SG8", "L1-SG9", "L2-DM",
            "L2-LT1", "L2-MAF1", "L2-MAF2", "L2-MCI1", "L2-MCI2", "L2-MGR",
            "L2-MIN", "L2-TCF1", "L2-TCF2", "L2-TCF3", "L2-TCI", "L2-TV1",
            "L2-TV2", "L3-DM", "L3-FI", "L3-LT1", "L3-LT2", "L3-MAF",
            "L3-MAF-EAD", "L3-MGR", "L3-MIN", "L3-MRGD", "L3-TCF-EAD", "L3-TCF1",
            "L3-TCF2", "L3-TCF3", "L3-TCI", "L3-TV1", "MP1-CD", "MP2-CD",
            "MP2-LT"));
        m.put(Department.TECHNOLOGIES_INFORMATIQUE, clean(
            "EA-L2DSI", "L1-TI-EAD", "L1-TI1", "L1-TI2", "L1-TI3", "L1-TI4",
            "L1-TI5", "L1-TI6", "L1-TI7", "L1-TI8", "L2-DSI-EAD-6", "L2-DSI1",
            "L2-DSI2", "L2-DSI3", "L2-DSI4", "L2-RSI1", "L2-RSI2", "L2-SEM1",
            "L2-SEM2", "L3-DSI-EAD-3", "L3-DSI1", "L3-DSI2", "L3-DSI3", "L3-RSI1",
            "L3-RSI2", "L3-SEM1", "L3-SEM2", "MP1-BI", "MP1-DAM", "MP1-IDIRIA",
            "MP2-BI", "MP2-DAM", "MP2-IDIRIA", "OACA_INfO", "TIL1PR2SX"));
        CLASSES = Collections.unmodifiableMap(m);
    }

    private ClassCatalog() {}

    private static List<String> clean(String... values) {
        Set<String> set = new LinkedHashSet<>();
        for (String v : values) {
            set.add(v.trim());
        }
        return List.copyOf(set);
    }

    public static List<String> classesOf(Department department) {
        return CLASSES.getOrDefault(department, List.of());
    }

    public static boolean isValid(Department department, String classe) {
        return department != null && classe != null && classesOf(department).contains(classe.trim());
    }


    public static String levelOf(String classe) {
        if (classe == null) {
            return null;
        }
        Matcher mt = LEVEL.matcher(classe.trim());
        if (!mt.find()) {
            return null;
        }
        return mt.group(1);
    }
}
