# Get Last N Messages - User Story

## Story

**As a** client application
**I want to** retrieve the last N messages for a specific WhatsApp user
**So that** I can display recent message history to the user

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Get Last N Messages
  Scenario: Successfully retrieve last N messages
    Given the client provides a valid idWhatsApp and lastMsgs parameter
    When the backend receives a GET request to "/pollo/status/:idWhatsApp"
    Then the backend validates the parameters
    And the backend queries Firebase for the last N messages
    And the backend returns a JSON response with the messages

  Scenario: Invalid idWhatsApp parameter
    Given the client provides an invalid or missing idWhatsApp
    When the backend validates the parameters
    Then the backend returns a 400 Bad Request error

  Scenario: Default lastMsgs when not provided
    Given the client provides a valid idWhatsApp but no lastMsgs parameter
    When the backend receives the request
    Then the backend defaults lastMsgs to 10
    And retrieves the last 10 messages

  Scenario: No messages found
    Given the client provides a valid idWhatsApp with no associated messages
    When the backend queries Firebase
    Then the backend returns an empty JSON array
```

## Technical Flow

1. Client sends `GET /pollo/status/:idWhatsApp?lastMsgs=<number>`
2. Backend validates:
   - `idWhatsApp` is required and non-empty
   - `lastMsgs` is optional (default: 10), must be a positive integer
3. Backend queries Firebase database for the user's messages
4. Backend returns messages sorted by timestamp (newest first), limited to N
5. Response format:
   ```json
   {
     "idWhatsApp": "123456789",
     "messages": [
       {
         "id": "msg_001",
         "content": "Hello",
         "timestamp": "2026-04-27T10:30:00Z"
       }
     ],
     "count": 1
   }
   ```

## Notes

- Maximum `lastMsgs` value should be capped at 100 to prevent abuse
- Response should be sorted by timestamp in descending order (newest first)