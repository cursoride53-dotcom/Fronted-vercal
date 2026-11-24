
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(
    `Missing Firebase configuration: ${missingConfig.join(", ")}. Check your .env file.`
  );
}

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

/**
 * Sign in using a Firebase custom token returned by the backend.
 */
export async function signInWithBackendCustomToken(customToken) {
  if (!customToken || typeof customToken !== "string") {
    throw new Error(
      "The server did not return a valid Firebase custom token."
    );
  }

  const credential = await signInWithCustomToken(auth, customToken);
  const idToken = await credential.user.getIdToken();

  return {
    user: credential.user,
    idToken,
  };
}

/**
 * Get an ID token for protected backend API requests.
 */
export async function getFirebaseIdToken() {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return user.getIdToken();
}

/**
 * Sign out of Firebase.
 */
export async function logoutFirebase() {
  await signOut(auth);
}

export default firebaseApp;
