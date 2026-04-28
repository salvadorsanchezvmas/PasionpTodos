# Get Last N Messages Sequence Diagram

```mermaid
sequenceDiagram
    title: Get Last N Failed Analysis Logs Flow

    participant Client as Client Application
    participant UC as ReadLastNMessages<br/>use case
    participant DB as Database Service<br/>getLastNMsgs()
    participant FS as Firestore<br/>attempts_logs

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

    %% Step 3: Query database
    UC->>DB: getLastNMsgs(idwhatsapp, lastMsgs)
    DB->>FS: Query attempts_logs collection
    DB->>DB: Sort by timestamp descending
    DB->>DB: Limit to lastMsgs results
    FS-->>DB: Return failed logs array
    DB-->>UC: Return failedLogs array

    %% Step 4: Return response
    alt Query successful
        UC-->>Client: { stat: "ok", data: { failedLogs }, count: n }
    else Query throws error
        UC-->>Client: { stat: "error", data: { message: error.message } }
    end

    Note over UC: Logs: "ReadLastNMessages: Fetching last {lastMsgs} logs for idWhatsApp: {idwhatsapp}"
```

## Component Overview

| Component            | Role                                                              |
| -------------------- | ----------------------------------------------------------------- |
| Client Application   | Invokes ReadLastNMessages to retrieve failed analysis logs       |
| ReadLastNMessages()  | Use case orchestrator in src/application/read_last_n_messages.js  |
| getLastNMsgs()       | Database service in src/services/db/get_last_n_msgs/              |
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
| Valid parameters | idWhatsApp valid → lastMsgs valid → DB query → Success |
| Invalid idWhatsApp | idWhatsApp invalid → Immediate error return |
| lastMsgs not provided | lastMsgs defaults to 10 |
| lastMsgs > 100 | lastMsgs capped at 100 |
| No messages found | DB returns empty array → Success with count: 0 |
| Database error | DB throws → Error response returned |