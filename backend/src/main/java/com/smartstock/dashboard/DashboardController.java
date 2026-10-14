package com.smartstock.dashboard;

import com.smartstock.product.Product;
import com.smartstock.product.ProductRepository;
import com.smartstock.sale.Sale;
import com.smartstock.sale.SaleRepository;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final ProductRepository products;
    private final SaleRepository sales;

    public DashboardController(ProductRepository products, SaleRepository sales) {
        this.products = products;
        this.sales = sales;
    }

    @GetMapping
    public Map<String, Object> summary() {
        List<Product> all = products.findAll();
        List<Sale> allSales = sales.findAll();
        LocalDate today = LocalDate.now();
        long lowStock = all.stream().filter(p -> p.getQuantity() != null && p.getQuantity() <= 5).count();
        long expiring = all.stream().filter(p -> p.getExpiryDate() != null
                && !p.getExpiryDate().isBefore(today)
                && !p.getExpiryDate().isAfter(today.plusDays(30))).count();
        long expired = all.stream().filter(p -> p.getExpiryDate() != null
                && p.getExpiryDate().isBefore(today)).count();
        BigDecimal revenue = allSales.stream().map(Sale::getTotalAmount)
                .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalProducts", all.size());
        result.put("totalUnits", all.stream().map(Product::getQuantity).filter(Objects::nonNull).mapToInt(Integer::intValue).sum());
        result.put("totalSales", allSales.size());
        result.put("revenue", revenue);
        result.put("lowStock", lowStock);
        result.put("expiringSoon", expiring);
        result.put("expired", expired);
        return result;
    }

    @GetMapping("/recommendations")
    public List<Map<String, Object>> recommendations() {
        List<Product> all = products.findAll();
        List<Sale> allSales = sales.findAll();
        List<Map<String, Object>> output = new ArrayList<>();

        for (Product p : all) {
            int sold = allSales.stream()
                    .filter(s -> s.getProduct() != null && s.getProduct().getId().equals(p.getId()))
                    .map(Sale::getQuantity).filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
            if (p.getQuantity() <= 5 || sold >= 3) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("productId", p.getId());
                item.put("productName", p.getName());
                item.put("currentStock", p.getQuantity());
                item.put("unitsSold", sold);
                item.put("suggestedRestock", Math.max(0, 10 - p.getQuantity()));
                item.put("reason", p.getQuantity() <= 5 ? "Low stock: consider replenishment" : "Sales activity: review stock level");
                output.add(item);
            }
        }
        return output;
    }
}
