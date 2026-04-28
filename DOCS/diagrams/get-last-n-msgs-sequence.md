# Get Last N Messages Sequence Diagram

```mermaid
sequenceDiagram
    title: Get Last N Failed Analysis Logs Flow

    participant Client as Client Application
    participant UC as ReadLastNMessages<br/>use case
    participant Check as checkUserExists()<br/>service
    participant DB as getLastNMsgs()<br/>service
    participant UP as Firestore<br/>user_profile
    participant AL as Firestore<br/>attempts_logs

    %% Main flow
    Client->>UC: ReadLastNMessages(idwhatsapp, lastMsgs)

    %% Step 1: Validate idWhatsApp
    UC->>UC: Validate idwhatsapp parameter
    alt idWhatsApp is invalid (empty, not string, or whitespace only)
        UC-->>Client: { stat: "error", data: { message: "idWhatsApp parameter is required and cannot be empty" } }
    end

    %% Step 2: Validate and sanitize lastMsgs
    UC->>UC: Parse lastMsgs to integer
    alt lastMsgs is NaN or < 1
        UC->>UC: Set lastMsgs = 10 (default)
    else lastMsgs > 100
        UC->>UC: Set lastMsgs = 100 (capped)
    else lastMsgs is valid
        UC->>UC: Use sanitized lastMsgs value
    end

    %% Step 3: Log and check if user is registered
    Note over UC: Logs: "ReadLastNMessages: Fetching last {lastMsgs} logs for idWhatsApp: {idwhatsapp}"
    UC->>Check: checkUserExists(idwhatsapp)
    Check->>UP: Query user_profile collection
    UP-->>Check: Return document exists (boolean)
    Check-->>UC: Return isRegistered (boolean)
    alt User not registered
        Note over UC: Logs: "ReadLastNMessages: User {idwhatsapp} has no registered attempts"
        UC-->>Client: { stat: "error", data: { message: "Para participar en el concurso, primero debes registrarte enviando una foto de un plato con pollo." } }
    end

    %% Step 4: Query database for logs
    UC->>DB: getLastNMsgs(idwhatsapp, lastMsgs)
    DB->>AL: Query attempts_logs collection
    AL-->>DB: Return logs array
    DB-->>UC: Return failedLogs array

    %% Step 5: Return response
    UC-->>Client: { stat: "ok", data: { failedLogs }, count: n }

    Note over UC,DB: Error handling: try-catch block returns { stat: "error", data: { message: error.message } }
```

## Component Overview

| Component            | Role                                                              |
| -------------------- | ----------------------------------------------------------------- |
| Client Application   | Invokes ReadLastNMessages to retrieve failed analysis logs       |
| ReadLastNMessages()  | Use case orchestrator in src/application/read_last_n_messages.js  |
| checkUserExists()    | Database service in src/services/db/user_profile/check_user_exists.js |
| getLastNMsgs()       | Database service in src/services/db/get_last_n_msgs/              |
| Firestore user_profile | Stores user registration status                                 |
| Firestore attempts_logs | Stores failed analysis logs per user                           |

## Parameter Validation Rules

| Condition                  | Action                              |
| -------------------------- | ----------------------------------- |
| idWhatsApp missing/empty   | Return error immediately            |
| lastMsgs is NaN            | Default to 10                       |
| lastMsgs < 1               | Default to 10                       |
| lastMsgs > 100             | Cap at 100                          |
| 1 <= lastMsgs <= 100       | Use provided value                  |

## Response Formats

### Success Response
```json
{
  "stat": "ok",
  "data": {
    "failedLogs": [
      {
        "msg_to_dev": "Error description for developer",
        "msg_to_user": "Mensaje de error para usuario",
        "time": "2026-04-28T07:19:29.000Z"
      }
    ]
  },
  "count": 1
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

| Scenario | Path in Diagram |
| -------- | --------------- |
| Valid parameters, registered user | idWhatsApp valid → lastMsgs valid → checkUserExists → DB query → Success |
| Invalid idWhatsApp | idWhatsApp invalid → Immediate error return |
| User not registered | checkUserExists returns false → Immediate error return |
| lastMsgs not provided | lastMsgs defaults to 10 |
| lastMsgs > 100 | lastMsgs capped at 100 |
| No messages found | DB returns empty array → Success with count: 0 |
| Database error | DB throws → Error response returned |