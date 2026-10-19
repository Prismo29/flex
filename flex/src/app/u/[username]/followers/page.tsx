import type { Metadata } from "next";
import FollowListPage from "../FollowListPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Followers · FLEX" };

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  return <FollowListPage rawUsername={(await params).username} which="followers" />;
}
