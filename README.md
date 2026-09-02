# Gemini Reflection Journal

A secure, user-authenticated reflection and multi-turn journaling web companion powered by **Gemini 3.6 Flash** and **Cloud Firestore** with strict per-user data isolation.

---

## 🌟 Overview & Features
- **User Authentication**: Frictionless Google Sign-In with Firebase Authentication (no raw passwords stored).
- **Strict Data Isolation**: Owner-bound security rules in Cloud Firestore (`/users/{userId}/entries/{entryId}`) ensuring complete privacy across users.
- **AI Processing Engine**: Multi-turn reflection feedback, structured summaries, and creative brainstorming powered by Gemini API.
- **Resilient Fallback Ladder**: Robust error recovery protocol traversing `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-flash-latest`, and `gemini-2.5-pro`.
- **Zero Hardcoded Secrets**: All keys and credentials securely retrieved via Google Cloud Secret Manager / environment variables.

---

## 🔒 Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🔑 Secret Manager Bindings

```bash
# 1. Create and populate the Gemini API key secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 Google Cloud Run Deployment

```bash
# 1. Build and deploy container to Cloud Run
gcloud run deploy gemini-reflection-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000

# 2. Verification Binding for Campaign Challenge
gcloud run services update gemini-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Test Guide

1. **Authentication Flow**:
   - Navigate to the landing page.
   - Click "Sign in with Google".
   - Confirm successful Firebase Auth popup authorization and redirect to private dashboard.
2. **Multi-Turn Reflection**:
   - Type a prompt or select a starter prompt in the reflection box.
   - Click "Send" or press `Cmd/Ctrl + Enter`.
   - Verify that Gemini responds with structured markdown insights and reflection questions.
3. **Firestore Data Persistence**:
   - Check the left sidebar to confirm the entry is listed in past history.
   - Click "New Reflection" and write a second entry.
   - Switch back to the previous entry to confirm state and history integrity.
4. **Session Termination**:
   - Click the Sign Out icon in the sidebar footer to securely clear the active session and return to the landing page.
