package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "guests")
@Data
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String email;

    private String phone;
    private String country;
    private String language = "fr";

    @CreationTimestamp
    private LocalDateTime createdAt;

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
