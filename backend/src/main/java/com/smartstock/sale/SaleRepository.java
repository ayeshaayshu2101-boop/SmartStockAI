package com.smartstock.sale;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {
    List<Sale> findTop100ByOrderBySaleDateDesc();
    List<Sale> findByProductId(Long productId);
}
