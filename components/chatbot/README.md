# Chatbot Folder

This folder now contains the citizen chatbot used on the landing page and citizen pages.

- `guided-citizen-assistant.tsx`: chatbot UI and runtime behavior
- `assistant-engine.ts`: public entry point for the chatbot engine
- `agent/intent-detector.ts`: intent classification plus grievance/category detection
- `agent/context-memory.ts`: conversation memory normalization and updates
- `agent/decision-engine.ts`: local routing and assistant decision logic
- `agent/response-builder.ts`: conversational response shaping and button/suggestion output
- `config.ts`: assistant actions, avatar, greeting, and intent responses
- `types.ts`: shared chatbot types
- `citizen-training.json`: citizen-only training data extracted from real project files
- `app/api/chatbot/route.ts`: secure server route for local-first matching and Gemini fallback

The chatbot is still mounted through `components/theme-provider.tsx`, so its visibility and current behavior remain unchanged.
