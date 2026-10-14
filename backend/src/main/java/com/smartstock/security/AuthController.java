package com.smartstock.security;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final JwtService jwtService;

    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        if (request.getUsername() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password are required"));
        }

        String role = null;
        if (request.getUsername().equals("admin") && request.getPassword().equals("admin123")) {
            role = "ADMIN";
        } else if (request.getUsername().equals("staff") && request.getPassword().equals("staff123")) {
            role = "STAFF";
        }

        if (role == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password"));
        }

        return ResponseEntity.ok(Map.of(
                "token", jwtService.generateToken(request.getUsername(), role),
                "username", request.getUsername(),
                "role", role
        ));
    }
}
