"use client";

import {
  SignInButton,
  SignOutButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export const RootHeaderNavigateButton = () => {
  const router = useRouter();

  const handleGoToApp = () => {
    console.log("Navigate button clicked"); // Debug log
    router.push("/dashboard");
  };

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="sm">
            Login
            <ChevronRight className="size-4" />
          </Button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleGoToApp}>
            Go to the app
            <ChevronRight className="size-4" />
          </Button>

          <SignOutButton>
            <Button variant="secondary" size="sm">
              Logout
            </Button>
          </SignOutButton>
        </div>
      </SignedIn>
    </>
  );
};
