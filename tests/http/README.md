### Pollo Webhook HTTP Test Collection
### Run with VS Code REST Client (ext: humao.rest-client) or similar tools

# Prerequisites:
# 1. Start the server: npm run dev
# 2. Set required environment variables in .env file:
#    - WEBHOOK_VERIFY_TOKEN (default: pollohook2026)
#    - GRAPH_API_TOKEN (for image processing)
#    - Firebase credentials (for /pollo/saveusr)

# Files are numbered for sequential execution:
# 01 - Health check
# 02 - Webhook verification (GET)
# 03 - Webhook POST (messages)
# 04 - Save user endpoint

# Each file can be run individually or as a collection.
