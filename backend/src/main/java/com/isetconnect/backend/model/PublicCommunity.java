package com.isetconnect.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "public_communities")
public class PublicCommunity extends Community {
    public PublicCommunity() {
        setIsPrivate(false);
    }
}
