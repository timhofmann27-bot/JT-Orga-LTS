import { getFirebaseAdmin } from "../lib/firebaseAdmin.ts";

const FCM_LEGACY_URL = "https://fcm.googleapis.com/fcm/send";

async function sendSingle(token: string, title: string, body: string, data?: Record<string, string>) {
  // Try Firebase Admin SDK first
  try {
    const app = getFirebaseAdmin();
    if (app?.messaging) {
      const msg: any = { token, notification: { title, body } };
      if (data) msg.data = data;
      return await app.messaging().send(msg);
    }
  } catch (e) { /* fall through */ }

  // Fall back to legacy FCM API
  const serverKey = process.env.FIREBASE_SERVER_KEY;
  if (!serverKey) return;

  const payload: any = { to: token, notification: { title, body } };
  if (data) payload.data = data;

  const res = await fetch(FCM_LEGACY_URL, {
    method: "POST",
    headers: { "Authorization": `key=${serverKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`FCM legacy error ${res.status}`);
}

// Higher-level: looks up token from DB by user type + ID
export async function sendPushNotification(
  userType: string,
  userId: number,
  opts: { title: string; body: string; data?: Record<string, string> }
) {
  try {
    const { db } = await import("../db/index.ts");
    const row = db.prepare(
      "SELECT token FROM fcm_tokens WHERE user_type = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(userType, userId) as { token: string } | undefined;

    if (!row?.token) return;
    await sendSingle(row.token, opts.title, opts.body, opts.data);
  } catch (e) {
    // Push is best-effort, never throw
  }
}

export async function notifyEventUpdate(eventId: number, changes: string[]) {
  try {
    const { db } = await import("../db/index.ts");
    const tokens = db.prepare("SELECT token FROM fcm_tokens WHERE user_type = 'person'")
      .all() as { token: string }[];
    
    for (const { token } of tokens) {
      await sendSingle(token, "Event aktualisiert", changes.join(", "));
    }
  } catch (e) {}
}

export async function notifyNewMessage(eventId: number, personId: number, message: string) {
  try {
    const { db } = await import("../db/index.ts");
    const tokens = db.prepare("SELECT token FROM fcm_tokens WHERE user_type = 'admin'")
      .all() as { token: string }[];
    
    for (const { token } of tokens) {
      await sendSingle(token, "Neue Nachricht", message);
    }
  } catch (e) {}
}

export async function sendBroadcastNotification(opts: { title: string; body: string }) {
  try {
    const { db } = await import("../db/index.ts");
    const tokens = db.prepare("SELECT token FROM fcm_tokens")
      .all() as { token: string }[];

    const tokenList = tokens.map(t => t.token).filter(Boolean);
    if (tokenList.length === 0) return;

    // Try multicast first
    try {
      const app = getFirebaseAdmin();
      if (app?.messaging && tokenList.length > 0) {
        await app.messaging().sendEachForMulticast({
          tokens: tokenList,
          notification: { title: opts.title, body: opts.body }
        });
        return;
      }
    } catch (e) {}

    // Fall back to individual sends
    for (const token of tokenList) {
      try { await sendSingle(token, opts.title, opts.body); } catch (e) {}
    }
  } catch (e) {}
}
