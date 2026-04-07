package com.amenbank.security;

import com.amenbank.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Getter
public class UserDetailsImpl implements UserDetails {
    private final Long id;
    private final String email;
    private final String username;
    private final String password;
    private final String role;
    private final User.UserStatus status;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.username = user.getUsername();
        this.password = user.getPasswordHash();
        this.role = user.getRole().getName();
        this.status = user.getStatus();

        this.authorities = Stream.concat(
            Stream.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName())),
            user.getRole().getPermissions().stream()
                .map(p -> new SimpleGrantedAuthority(p.getName()))
        ).collect(Collectors.toList());
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return status != User.UserStatus.LOCKED; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return status == User.UserStatus.ACTIVE; }
}
