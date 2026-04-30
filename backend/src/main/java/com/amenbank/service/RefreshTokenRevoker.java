package com.amenbank.service;

import com.amenbank.entity.RefreshToken;
import com.amenbank.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefreshTokenRevoker {

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAndCommit(RefreshToken token) {
        token.setRevoked(true);
        refreshTokenRepository.save(token);
    }
}
