package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
	"github.com/rwandapay/backend/pkg/jwt"
	"golang.org/x/crypto/bcrypt"
)

type RegisterInput struct {
	Email    string
	Password string
	Name     string
	Phone    *string
}

type LoginInput struct {
	Email    string
	Password string
}

type AuthResult struct {
	User   *domain.User
	Wallet *domain.Wallet
	Token  string
}

type AuthService struct {
	userRepo   repository.UserRepository
	walletRepo repository.WalletRepository
	jwtSvc     *jwt.Service
}

func NewAuthService(
	userRepo repository.UserRepository,
	walletRepo repository.WalletRepository,
	jwtSvc *jwt.Service,
) *AuthService {
	return &AuthService{userRepo: userRepo, walletRepo: walletRepo, jwtSvc: jwtSvc}
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*AuthResult, error) {
	// Check email uniqueness
	_, err := s.userRepo.GetByEmail(ctx, strings.ToLower(in.Email))
	if err == nil {
		return nil, domain.ErrConflict
	}
	if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           uuid.NewString(),
		Email:        strings.ToLower(in.Email),
		PasswordHash: string(hash),
		Name:         in.Name,
		Phone:        in.Phone,
		Initials:     makeInitials(in.Name),
		IsVerified:   false,
		IsActive:     true,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Create wallet with zero balance
	wallet := &domain.Wallet{
		ID:       uuid.NewString(),
		UserID:   user.ID,
		Balance:  0,
		Currency: "RWF",
	}
	if err := s.walletRepo.Create(ctx, wallet); err != nil {
		return nil, err
	}

	token, err := s.jwtSvc.Sign(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &AuthResult{User: user, Wallet: wallet, Token: token}, nil
}

func (s *AuthService) Login(ctx context.Context, in LoginInput) (*AuthResult, error) {
	user, err := s.userRepo.GetByEmail(ctx, strings.ToLower(in.Email))
	if errors.Is(err, domain.ErrNotFound) {
		return nil, domain.ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(in.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	wallet, err := s.walletRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	token, err := s.jwtSvc.Sign(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &AuthResult{User: user, Wallet: wallet, Token: token}, nil
}

func (s *AuthService) GetMe(ctx context.Context, userID string) (*AuthResult, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	wallet, err := s.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &AuthResult{User: user, Wallet: wallet}, nil
}

func (s *AuthService) UpdateProfile(ctx context.Context, userID, name string, phone *string) (*domain.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if name != "" {
		user.Name = name
		user.Initials = makeInitials(name)
	}
	if phone != nil {
		user.Phone = phone
	}
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

func makeInitials(name string) string {
	parts := strings.Fields(name)
	result := ""
	for i, p := range parts {
		if i >= 2 {
			break
		}
		if len(p) > 0 {
			result += strings.ToUpper(string(p[0]))
		}
	}
	return result
}
