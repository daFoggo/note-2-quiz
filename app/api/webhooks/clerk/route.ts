import { Webhook } from "svix"
import { headers } from "next/headers"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { db, users } from "@/lib/db/db"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local")
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = (await headerPayload).get("svix-id")
  const svix_timestamp = (await headerPayload).get("svix-timestamp")
  const svix_signature = (await headerPayload).get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new Response("Error occured", {
      status: 400,
    })
  }

  const eventType = evt.type

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      await db
        .insert(users)
        .values({
          id,
          email: email_addresses[0].email_address,
          name: `${first_name || ""} ${last_name || ""}`.trim() || "Anonymous",
          avatar: image_url,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: email_addresses[0].email_address,
            name: `${first_name || ""} ${last_name || ""}`.trim() || "Anonymous",
            avatar: image_url,
            updatedAt: new Date(),
          },
        })
    } catch (error) {
      console.error("Error syncing user:", error)
      return new Response("Error syncing user", { status: 500 })
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data
    try {
      await db.delete(users).where(eq(users.id, id!))
    } catch (error) {
      console.error("Error deleting user:", error)
      return new Response("Error deleting user", { status: 500 })
    }
  }

  return new Response("", { status: 200 })
}
