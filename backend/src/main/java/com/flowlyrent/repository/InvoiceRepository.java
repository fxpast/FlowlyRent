package com.flowlyrent.repository;

import com.flowlyrent.model.Invoice;
import com.flowlyrent.model.enums.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByUserIdOrderByInvoiceYearDescInvoiceSeqDesc(Long userId);

    List<Invoice> findByUserIdAndStatusOrderByInvoiceYearDescInvoiceSeqDesc(Long userId, InvoiceStatus status);

    Optional<Invoice> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT COALESCE(MAX(i.invoiceSeq), 0) FROM Invoice i WHERE i.user.id = :userId AND i.invoiceYear = :year")
    int findMaxSeqByUserAndYear(@Param("userId") Long userId, @Param("year") int year);
}
