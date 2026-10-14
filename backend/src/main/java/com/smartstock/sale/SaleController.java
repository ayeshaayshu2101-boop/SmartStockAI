package com.smartstock.sale;

import com.smartstock.product.Product;
import com.smartstock.product.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
public class SaleController {
    private final SaleRepository sales;
    private final ProductRepository products;

    public SaleController(SaleRepository sales, ProductRepository products) {
        this.sales = sales;
        this.products = products;
    }

    @GetMapping
    public List<Sale> getAll() {
        return sales.findTop100ByOrderBySaleDateDesc();
    }

    @PostMapping
    @Transactional
    public Sale create(@RequestBody SaleRequest request) {
        if (request.getProductId() == null || request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a product and quantity greater than zero");
        }

        Product product = products.findById(request.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (product.getQuantity() < request.getQuantity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not enough stock available");
        }

        product.setQuantity(product.getQuantity() - request.getQuantity());
        products.save(product);

        Sale sale = new Sale();
        sale.setProduct(product);
        sale.setQuantity(request.getQuantity());
        sale.setTotalAmount(product.getPrice().multiply(BigDecimal.valueOf(request.getQuantity())));
        sale.setSaleDate(LocalDateTime.now());
        return sales.save(sale);
    }
}
