import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { IClerkUser } from "@/lib/types/user";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

interface IWebhookEvent {
  data: IClerkUser;
  object: string;
  type: string;
}

export async function POST(req: NextRequest) {
  try {
    const evt = (await verifyWebhook(req)) as IWebhookEvent;

    const { type } = evt;
    const userData = evt.data;

    // listen to webhooks events to sync db
    switch (type) {
      case "user.created":
        await handleUserCreated(userData);
        break;

      case "user.updated":
        await handleUserUpdated(userData);
        break;

      case "user.deleted":
        await handleUserDeleted(userData);
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Error processing webhook", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function handleUserCreated(userData: IClerkUser) {
  try {
    const primaryEmail =
      userData.email_addresses.find((email) => email.id === userData.id)
        ?.email_address || userData.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      throw new Error("No email address found for user");
    }

    const userName = getUserName(userData);

    // Insert new user into database
    await db.insert(users).values({
      id: userData.id,
      email: primaryEmail,
      name: userName,
      avatar: userData.image_url || null,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

async function handleUserUpdated(userData: IClerkUser) {
  try {
    const primaryEmail =
      userData.email_addresses.find((email) => email.id === userData.id)
        ?.email_address || userData.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      throw new Error("No email address found for user");
    }

    const userName = getUserName(userData);

    // Update existing user in database
    await db
      .update(users)
      .set({
        email: primaryEmail,
        name: userName,
        avatar: userData.image_url || null,
        updatedAt: new Date(userData.updated_at),
      })
      .where(eq(users.id, userData.id));

    console.log(`User updated: ${userData.id} (${primaryEmail})`);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

async function handleUserDeleted(userData: IClerkUser) {
  try {
    // hard delete user
    // await db.delete(users).where(eq(users.id, userData.id));

    //  Soft delete (recommended)
    await db
      .update(users)
      .set({
        email: `deleted_${userData.id}@deleted.com`,
      })
      .where(eq(users.id, userData.id));

    console.log(`User deleted: ${userData.id}`);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

function getUserName(userData: IClerkUser): string {
  if (userData.first_name && userData.last_name) {
    return `${userData.first_name} ${userData.last_name}`.trim();
  }

  if (userData.first_name) {
    return userData.first_name;
  }

  if (userData.username) {
    return userData.username;
  }

  const primaryEmail = userData.email_addresses[0]?.email_address;
  if (primaryEmail) {
    return primaryEmail.split("@")[0];
  }

  return "Unknown User";
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
