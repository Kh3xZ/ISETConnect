package com.isetconnect.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "private_communities")
@Getter
@Setter
public class PrivateCommunity extends Community {


    @Column(name = "join_key", nullable = false)
    private String joinKey;


    @Column(name = "nb_max", nullable = false)
    private Integer nbMax;

    public PrivateCommunity() {
        setIsPrivate(true);
    }
}
