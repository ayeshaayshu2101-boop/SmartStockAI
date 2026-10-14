package com.smartstock.product;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Product> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Product create(@RequestBody Product product) {
        validate(product);
        product.setId(null);
        return repository.save(product);
    }

    @PutMapping("/{id}")
    public Product update(@PathVariable Long id, @RequestBody Product product) {
        Product existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        validate(product);
        existing.setName(product.getName());
        existing.setCategory(product.getCategory());
        existing.setQuantity(product.getQuantity());
        existing.setPrice(product.getPrice());
        existing.setSupplier(product.getSupplier());
        existing.setExpiryDate(product.getExpiryDate());
        return repository.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        Product product = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!repository.findById(id).isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        repository.delete(product);
    }

    private void validate(Product p) {
        if (p.getName() == null || p.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
        }
        if (p.getQuantity() == null || p.getQuantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be zero or more");
        }
        if (p.getPrice() == null || p.getPrice().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be zero or more");
        }
    }
}
