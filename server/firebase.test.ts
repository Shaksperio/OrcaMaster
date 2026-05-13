import { describe, it, expect } from "vitest";

describe("Firebase Configuration", () => {
  it("should have FIREBASE_PRIVATE_KEY as a PEM key", () => {
    const key = process.env.FIREBASE_PRIVATE_KEY;
    expect(key).toBeDefined();
    expect(key).toContain("-----BEGIN PRIVATE KEY-----");
    expect(key).toContain("-----END PRIVATE KEY-----");
  });

  it("should have FIREBASE_PROJECT_ID configured", () => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    expect(projectId).toBeDefined();
    expect(projectId).toBe("orcamaster-2f1e1");
  });

  it("should have FIREBASE_CLIENT_EMAIL configured", () => {
    const email = process.env.FIREBASE_CLIENT_EMAIL;
    expect(email).toBeDefined();
    expect(email).toContain("@orcamaster-2f1e1.iam.gserviceaccount.com");
  });

  it("should have FIREBASE_DATABASE_URL configured", () => {
    const url = process.env.FIREBASE_DATABASE_URL;
    expect(url).toBeDefined();
    expect(url).toContain("firebaseio.com");
  });

  it("should initialize Firebase Admin SDK successfully", async () => {
    const { initFirebase } = await import("./firebase");
    const app = initFirebase();
    expect(app).not.toBeNull();
    expect(app?.name).toBe("[DEFAULT]");
  });

  it("should get Firebase Database instance", async () => {
    const { getFirebaseDb, isFirebaseEnabled } = await import("./firebase");
    expect(isFirebaseEnabled()).toBe(true);
    const db = getFirebaseDb();
    expect(db).not.toBeNull();
  });

  it("should write and read from Firebase Realtime Database", async () => {
    const { getFirebaseDb } = await import("./firebase");
    const db = getFirebaseDb();
    expect(db).not.toBeNull();
    if (!db) return;

    const testRef = db.ref("_healthcheck");
    const testData = { timestamp: new Date().toISOString(), test: true };

    // Write
    await testRef.set(testData);

    // Read back
    const snapshot = await testRef.get();
    expect(snapshot.exists()).toBe(true);
    const data = snapshot.val();
    expect(data.test).toBe(true);
    expect(data.timestamp).toBe(testData.timestamp);

    // Cleanup
    await testRef.remove();
    const afterRemove = await testRef.get();
    expect(afterRemove.exists()).toBe(false);
  }, 10000);
});

describe("Firebase Sync Layer", () => {
  it("should sync entity to Firebase and read it back", async () => {
    const { syncToFirebase } = await import("./firebase-sync");
    const { getFirebaseDb } = await import("./firebase");
    const db = getFirebaseDb();
    expect(db).not.toBeNull();
    if (!db) return;

    // Sync a test company
    await syncToFirebase("company", 99999, {
      name: "Test Company",
      document: "00.000.000/0001-00",
      email: "test@test.com",
    });

    // Read back from Firebase
    const snapshot = await db.ref("companies/99999").get();
    expect(snapshot.exists()).toBe(true);
    const data = snapshot.val();
    expect(data.name).toBe("Test Company");
    expect(data._syncedAt).toBeDefined();

    // Cleanup
    await db.ref("companies/99999").remove();
  }, 10000);

  it("should delete entity from Firebase when data is null", async () => {
    const { syncToFirebase } = await import("./firebase-sync");
    const { getFirebaseDb } = await import("./firebase");
    const db = getFirebaseDb();
    if (!db) return;

    // Create then delete
    await syncToFirebase("company", 99998, { name: "To Delete" });
    const before = await db.ref("companies/99998").get();
    expect(before.exists()).toBe(true);

    await syncToFirebase("company", 99998, null);
    const after = await db.ref("companies/99998").get();
    expect(after.exists()).toBe(false);
  }, 10000);
});
