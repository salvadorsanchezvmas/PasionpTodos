# Get Promotion Sequence Diagram

```mermaid
sequenceDiagram
    title: Get Promotion Coupon Flow

    participant Client as Client Application

    box Business Rules
    participant UC as GetPromotion<br/>use case
    end

    box Services
    participant Check as checkUserExists()
    participant CheckPromos as checkPromosCount()
    participant GetPromo as getAvailablePromotion()
    participant Redeem as redeemPromotion()
    participant Email as sendPromotionEmail()
    end

    box DB
    participant UP as Firestore<br/>user_profile
    participant Promo as Firestore<br/>promotion
    participant Logs as Firestore<br/>promotion_logs
    end

    %% Main flow
    Client->>UC: GetPromotion(idUser)

    %% Step 1: Validate idUser format
    UC->>UC: Validate idUser parameter
    alt idUser is invalid (empty, not string, or invalid ObjectId format)
        UC-->>Client: { stat: "error", data: { message: "ID de usuario inválido" } }
    end

    %% Step 2: Check if user exists
    Note over UC: Logs: "GetPromotion: Checking if user {idUser} exists"
    UC->>Check: checkUserExists(idUser)
    Check->>UP: Query user_profile collection
    UP-->>Check: Return document exists (boolean)
    Check-->>UC: Return isRegistered (boolean)
    alt User not registered
        Note over UC: Logs: "GetPromotion: User {idUser} not found"
        UC-->>Client: { stat: "error", data: { message: "Para reclamar una promoción, primero debes registrarte enviando una foto de un plato con pollo." } }
    end

    %% Step 3: Check promosCount
    Note over UC: Logs: "GetPromotion: Checking promosCount for user {idUser}"
    UC->>CheckPromos: checkPromosCount(idUser)
    CheckPromos->>UP: Query user_profile collection for promosCount
    UP-->>CheckPromos: Return promosCount value
    CheckPromos-->>UC: Return promosCount (number)
    alt promosCount < 1
        Note over UC: Logs: "GetPromotion: User {idUser} has no accumulated promotions"
        UC-->>Client: { stat: "error", data: { message: "No tienes promociones acumuladas. Sube 3 imágenes válidas para obtener una." } }
    end

    %% Step 4: Check promotion availability
    Note over UC: Logs: "GetPromotion: Checking available promotions"
    UC->>GetPromo: getAvailablePromotion()
    GetPromo->>Promo: Query promotion collection (status: "available")
    Promo-->>GetPromo: Return available promotion document
    GetPromo-->>UC: Return promotion object
    alt No promotions available
        Note over UC: Logs: "GetPromotion: No promotions available"
        UC-->>Client: { stat: "error", data: { message: "No hay promociones disponibles en este momento. Intenta más tarde." } }
    end

    %% Step 5: Redeem promotion (atomic operation)
    Note over UC: Logs: "GetPromotion: Redeeming promotion for user {idUser}"
    UC->>Redeem: redeemPromotion(idUser, promotion)

    par Atomic Operations
        Redeem->>UP: Decrement promosCount by 1
        UP-->>Redeem: Return update result
    and
        Redeem->>UP: Append to promotion_history array: {request_date: Timestamp, promotion_id: number}
        UP-->>Redeem: Return update result
    and
        Redeem->>Promo: Update promotion status to "used", set assignedTo
        Promo-->>Redeem: Return update result
    and
        Redeem->>Logs: Log redemption (idUser, idPromotion, code, timestamp)
        Logs-->>Redeem: Return log document ID
    end

    Redeem-->>UC: Return redemption confirmed

    %% Step 6: Send email
    Note over UC: Logs: "GetPromotion: Sending coupon email to user {idUser}"
    UC->>Email: sendPromotionEmail(idUser, promotion)
    Email-->>UC: Return email sent confirmation

    %% Step 7: Return success response
    UC-->>Client: { stat: "ok", data: { promotion: { id, code, description, discount } } }

    Note over UC,Redeem: Error handling: try-catch block returns { stat: "error", data: { message: error.message } }
```

## Component Overview

| Component              | Role                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| Client Application     | Invokes GetPromotion to request a coupon                          |
| GetPromotion()         | Use case orchestrator                                             |
| checkUserExists()      | Database service to verify user exists in user_profile            |
| checkPromosCount()     | Database service to get user's promosCount                         |
| getAvailablePromotion() | Database service to fetch an available promotion code            |
| redeemPromotion()       | Database service to atomically redeem promotion                   |
| sendPromotionEmail()    | Service to send coupon via email                                  |
| Firestore user_profile | Stores user data including promosCount                           |
| Firestore promotion    | Stores available/used promotion codes                             |
| Firestore promotion_logs | Stores audit log of all redemptions                              |

## Parameter Validation Rules

| Condition                | Action                              |
| ------------------------ | ----------------------------------- |
| idUser missing/empty     | Return error immediately            |
| idUser invalid ObjectId  | Return error immediately            |
| User not registered      | Return error immediately            |
| promosCount < 1          | Return error immediately            |
| No promotions available  | Return error immediately            |

## Response Formats

### Success Response
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

### Error Response
```json
{
  "stat": "error",
  "data": {
    "message": "Error description here"
  }
}
```

## Scenario Coverage

| Scenario                     | Path in Diagram |
| ---------------------------- | --------------- |
| Valid user with promos      | Validate → User exists → promosCount >= 1 → Get promo → Redeem → Email → Success |
| Invalid idUser format        | Validate → Immediate error return |
| User not registered          | Validate → User check → Immediate error return |
| User has no promos (0)       | Validate → User exists → promosCount check → Immediate error return |
| No promotions available     | Validate → User exists → promosCount >= 1 → Get promo → No promo available → Error |
| Database error               | DB throws → Error response returned |
| Email sending fails          | Redeem succeeds → Email fails → Error logged, redemption completed |

## Business Rules

1. **Accumulation**: 1 promotion per 3 valid image uploads
2. **Redemption**: Only one promotion can be redeemed at a time
3. **Atomicity**: Redemption operations (decrement count, update status, log) are atomic
4. **Logging**: All redemption attempts are logged for audit
5. **Email**: Coupon sent in format with ID + 6-digit code