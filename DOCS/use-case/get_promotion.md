# Get Promotion - User Story

## Story

**As a** registered user
**I want to** request a promotion/coupon when I have accumulated promotions
**So that** I can receive a discount coupon via email for every 3 valid image uploads

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Get Promotion Coupon
  Scenario: Successfully redeem accumulated promotion
    Given the user has a promosCount greater than or equal to 1
    When the user invokes the GetPromotion endpoint
    Then the system selects a promotion code from the promotion collection
    And the system decrements the user's promosCount by 1
    And the system sends the promotion coupon via email
    And the system logs the promotion redemption in the database
    And the system returns the promotion details

  Scenario: User has no accumulated promotions
    Given the user has a promosCount of 0
    When the user invokes the GetPromotion endpoint
    Then the system returns an error response
    And the error message indicates the user has no promotions available

  Scenario: No promotions available in collection
    Given the user has a promosCount greater than or equal to 1
    And there are no promotions available in the promotion collection
    When the user invokes the GetPromotion endpoint
    Then the system returns an error response
    And the error message indicates no promotions are currently available

  Scenario: Invalid user profile
    Given the user profile does not exist or is invalid
    When the user invokes the GetPromotion endpoint
    Then the system returns an error response
    And the error message indicates the user must register first
```

## Technical Flow

1. Client invokes `GetPromotion(idUser)`
2. Function validates:
   - `idUser` is required and must be a non-empty string
   - User profile exists in `user_profile` collection
   - `promosCount` >= 1
3. Function checks promotion availability in `promotion` collection
   - Queries for available promotions (status: "available")
   - Selects one promotion code
4. If promotion available:
   - Decrement user's `promosCount` by 1 in `user_profile` collection
   - Update promotion status to "used" or assign to user
   - Send coupon via email in coupon format (id + 6-digit code)
   - Log redemption in `promotion_logs` collection with timestamp
5. Return promotion details to client

## Request Format

```json
{
  "idUser": "string"
}
```

## Success Response Format

```json
{
  "stat": "ok",
  "data": {
    "promotion": {
      "id": "promotion_id",
      "code": "123456",
      "description": "Coupon description",
      "discount": "10% off"
    }
  }
}
```

## Error Response Format

```json
{
  "stat": "error",
  "data": {
    "message": "Error description here"
  }
}
```

## Error Messages

| Scenario                | Message                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| User has no promotions  | "No tienes promociones acumuladas. Sube 3 imágenes válidas para obtener una."                     |
| No promotions available | "No hay promociones disponibles en este momento. Intenta más tarde."                              |
| User not registered     | "Para reclamar una promoción, primero debes registrarte enviando una foto de un plato con pollo." |
| Invalid user id         | "ID de usuario inválido"                                                                          |

## Promotion Code Format

- **ID**: Unique identifier (ObjectId)
- **Code**: 6-digit numeric string (e.g., "123456")

## Database Schema

### user_profile collection

```json
{
  "_id": "ObjectId",
  "idWhatsApp": "string",
  "promosCount": "number"
}
```

### promotion collection

```json
{
  "_id": "ObjectId",
  "code": "string (6 digits)",
  "status": "available | used | expired",
  "assignedTo": "string (user id, optional)",
  "createdAt": "Date",
  "usedAt": "Date (optional)"
}
```

### promotion_logs collection

```json
{
  "_id": "ObjectId",
  "idUser": "string",
  "idPromotion": "string",
  "code": "string",
  "redeemedAt": "Date",
  "emailedTo": "string (user email)"
}
```

## Notes

- 1 promotion is accumulated for every 3 valid image uploads
- `promosCount` is decremented only when a promotion is successfully redeemed
- Promotion codes are 6-digit numeric strings
- Email sent in coupon format with clear expiration terms
- All redemption attempts are logged for audit purposes
