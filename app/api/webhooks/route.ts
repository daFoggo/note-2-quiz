import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

// Types cho Clerk webhook events
interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name?: string;
  last_name?: string;
  username?: string;
  image_url?: string;
  created_at: number;
  updated_at: number;
}

interface WebhookEvent {
  data: ClerkUser;
  object: string;
  type: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature
    const evt = (await verifyWebhook(req)) as WebhookEvent;

    const { type } = evt;
    const userData = evt.data;

    console.log(`Processing webhook: ${type} for user ${userData.id}`);

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

async function handleUserCreated(userData: ClerkUser) {
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

    console.log(`✅ User created: ${userData.id} (${primaryEmail})`);
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

async function handleUserUpdated(userData: ClerkUser) {
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

    console.log(`✅ User updated: ${userData.id} (${primaryEmail})`);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

async function handleUserDeleted(userData: ClerkUser) {
  try {
    // Note: Khi user bị xóa, do có foreign key constraints,
    // bạn có thể muốn soft delete thay vì hard delete
    // Hoặc có thể cascade delete nếu đã setup trong schema

    // Option 1: Hard delete (nếu có CASCADE setup)
    await db.delete(users).where(eq(users.id, userData.id));

    // Option 2: Soft delete (recommended)
    // await db
    //   .update(users)
    //   .set({
    //     deletedAt: new Date(),
    //     email: `deleted_${userData.id}@deleted.com`, // Avoid unique constraint issues
    //   })
    //   .where(eq(users.id, userData.id))

    console.log(`✅ User deleted: ${userData.id}`);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// Helper function để tạo tên người dùng
function getUserName(userData: ClerkUser): string {
  // Priority: first_name + last_name > username > email
  if (userData.first_name && userData.last_name) {
    return `${userData.first_name} ${userData.last_name}`.trim();
  }

  if (userData.first_name) {
    return userData.first_name;
  }

  if (userData.username) {
    return userData.username;
  }

  // Fallback to email prefix
  const primaryEmail = userData.email_addresses[0]?.email_address;
  if (primaryEmail) {
    return primaryEmail.split("@")[0];
  }

  return "Unknown User";
}

// Optional: Add middleware để handle CORS nếu cần
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
