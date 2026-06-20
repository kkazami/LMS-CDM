import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth-session";

export async function POST() {
  try {
    await deleteSession();

    return NextResponse.json(
      { message: "Logout successful." },
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGOUT_ERROR", error);
    return NextResponse.json(
      { message: "Something went wrong during logout." },
      { status: 500 }
    );
  }
}
