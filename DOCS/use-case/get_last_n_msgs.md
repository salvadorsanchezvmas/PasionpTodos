# Get Last N Messages - User Story

## Story

**As a** client application
**I want to** retrieve the last N failed analysis logs for a specific WhatsApp user
**So that** I can display recent message history to the user

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Get Last N Failed Analysis Logs
  Scenario: Successfully retrieve last N messages
    Given the client provides a valid idWhatsApp and lastMsgs parameter
    When the ReadLastNMessages function is invoked
    Then the function validates the parameters
    And the function queries the database for the last N failed logs
    And the function returns a JSON response with the failed logs

  Scenario: Invalid idWhatsApp parameter
    Given the client provides an invalid or missing idWhatsApp
    When the ReadLastNMessages function validates the parameters
    Then the function returns an error response with status "error"

  Scenario: Default lastMsgs when not provided or invalid
    Given the client provides a valid idWhatsApp but no lastMsgs parameter
    When the ReadLastNMessages function is invoked
    Then the function defaults lastMsgs to 10
    And retrieves the last 10 messages

  Scenario: lastMsgs capped at maximum value
    Given the client provides a lastMsgs value greater than 100
    When the ReadLastNMessages function is invoked
    Then the function caps lastMsgs at 100
    And retrieves the last 100 messages

  Scenario: No messages found
    Given the client provides a valid idWhatsApp with no associated messages
    When the function queries the database
    Then the function returns an empty failedLogs array with count 0
```

## Technical Flow

1. Client invokes `ReadLastNMessages(idwhatsapp, lastMsgs)`
2. Function validates:
   - `idWhatsApp` is required and must be a non-empty string
   - `lastMsgs` is optional (default: 10), must be a positive integer, capped at 100
3. Function delegates to `getLastNMsgs(idwhatsapp, lastMsgs)` service
4. Function returns messages limited to N
5. Response format:
   ```json
   {
     "stat": "ok",
     "data": {
       "failedLogs": [
         {
           "msg_to_dev": "The image depicts a carton of mango juice, not chicken, and therefore fails to meet the requirement of containing a chicken-based food item.",
           "msg_to_user": "La imagen debe mostrar alimentos o pollo; no se aceptarán imágenes que no estén relacionadas con comida.",
           "time": "2026-04-28T07:19:29.000Z"
         }
       ]
     },
     "count": 1
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

## Notes

- Maximum `lastMsgs` value is capped at 100 to prevent abuse
- `lastMsgs` values less than 1 default to 10
- Non-numeric `lastMsgs` values default to 10
- Function logs errors to console before returning error response