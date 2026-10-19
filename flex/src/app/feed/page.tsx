import { redirect } from "next/navigation";

// The feed is the home page now.
export default function FeedRedirect() {
  redirect("/");
}
